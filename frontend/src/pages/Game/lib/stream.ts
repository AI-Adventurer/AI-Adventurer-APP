import { API_BASE_URL } from '@/lib/apiClient';

export const FRAME_NAMESPACE = '/edge/frames';
export const VIDEO_NAMESPACE = '/edge/video';
export const GAME_NAMESPACE = '/ws/game';
export const FRONTEND_SOURCE = 'frontend-preview';

const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [27, 29],
  [29, 31],
  [24, 26],
  [26, 28],
  [28, 30],
  [30, 32],
];

export type PosePoint = [number, number, number];

export type NarrativeViewModel = {
  key: string;
  title: string;
  text: string;
  targetAction: string | null;
};

export function isPosePointArray(value: unknown): value is PosePoint[] {
  return (
    Array.isArray(value) &&
    value.length === 33 &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 3 &&
        point.every((coord) => typeof coord === 'number')
    )
  );
}

function isValidPosePoint(point?: PosePoint) {
  if (!point || point.length !== 3) {
    return false;
  }

  const [x, y, z] = point;
  return !(x === 0 && y === 0 && z === 0);
}

function syncCanvasSize(canvas: HTMLCanvasElement) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (width <= 0 || height <= 0) {
    return null;
  }

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return { width, height };
}

function getVideoDrawRect(
  video: HTMLVideoElement | null,
  width: number,
  height: number
) {
  if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return { x: 0, y: 0, w: width, h: height };
  }

  const videoAspect = video.videoWidth / video.videoHeight;
  const canvasAspect = width / height;

  if (videoAspect > canvasAspect) {
    const w = width;
    const h = width / videoAspect;
    return { x: 0, y: (height - h) / 2, w, h };
  }

  const h = height;
  const w = height * videoAspect;
  return { x: (width - w) / 2, y: 0, w, h };
}

export function drawPoseOverlay(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement | null,
  pose: PosePoint[] | null
) {
  const size = syncCanvasSize(canvas);
  if (!size) {
    return;
  }

  const { width, height } = size;
  ctx.clearRect(0, 0, width, height);

  if (!pose || pose.length !== 33) {
    return;
  }

  const videoRect = getVideoDrawRect(video, width, height);

  ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [a, b] of POSE_CONNECTIONS) {
    const pa = pose[a];
    const pb = pose[b];
    if (!isValidPosePoint(pa) || !isValidPosePoint(pb)) {
      continue;
    }

    ctx.moveTo(
      videoRect.x + pa[0] * videoRect.w,
      videoRect.y + pa[1] * videoRect.h
    );
    ctx.lineTo(
      videoRect.x + pb[0] * videoRect.w,
      videoRect.y + pb[1] * videoRect.h
    );
  }
  ctx.stroke();

  ctx.fillStyle = 'rgba(34, 197, 94, 0.95)';
  for (const point of pose) {
    if (!isValidPosePoint(point)) {
      continue;
    }

    ctx.beginPath();
    ctx.arc(
      videoRect.x + point[0] * videoRect.w,
      videoRect.y + point[1] * videoRect.h,
      3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

function normalizeBaseUrl(value: string | undefined | null) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function stripApiSuffix(value: string) {
  return value.replace(/\/api\/?$/, '');
}

export function getEdgeBaseUrl() {
  const fromSocketEnv = normalizeBaseUrl(
    import.meta.env.VITE_SOCKET_BASE_URL as string | undefined
  );
  if (fromSocketEnv) {
    return stripApiSuffix(fromSocketEnv);
  }

  const fromApiBase = normalizeBaseUrl(API_BASE_URL);
  if (fromApiBase) {
    return stripApiSuffix(fromApiBase);
  }

  return window.location.origin;
}
