import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';

import BackHomeButton from '@/components/common/BackHomeButton';
import { useCurrentEvent } from '@/hooks/queries/useCurrentEvent';
import { useCurrentStory } from '@/hooks/queries/useCurrentStory';
import { useGameState } from '@/hooks/queries/useGameState';
import GameStatusCard from './components/GameStatusCard';
import NarrativeCard from './components/NarrativeCard';
import VideoStreamCard from './components/VideoStreamCard';
import { useGameViewModel } from './hooks/useGameViewModel';
import {
  drawPoseOverlay,
  FRAME_NAMESPACE,
  FRONTEND_SOURCE,
  getEdgeBaseUrl,
  isPosePointArray,
  type PosePoint,
  VIDEO_NAMESPACE,
} from './lib/stream';

export default function Game() {
  const gameStateQuery = useGameState();
  const currentEventQuery = useCurrentEvent();
  const currentStoryQuery = useCurrentStory();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const frameSocketRef = useRef<Socket | null>(null);
  const poseSourceRef = useRef<string | null>(null);
  const activeVideoSourceRef = useRef<string | null>(null);
  const bootstrapPoseRef = useRef<(source?: string | null) => void>(() => {});
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionAppliedRef = useRef(false);
  const skeletonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const latestPoseRef = useRef<PosePoint[] | null>(null);
  const lastPoseUpdateTimeRef = useRef<number>(0);
  const overlayFrameRef = useRef<number | null>(null);
  const scheduleOverlayDrawRef = useRef<() => void>(() => {});
  const previewErrorToastRef = useRef<string | null>(null);
  const poseErrorToastRef = useRef<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState(
    '等待 Jetson 影像來源連線...'
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [poseStatus, setPoseStatus] = useState('等待骨架資料連線...');
  const [poseError, setPoseError] = useState<string | null>(null);
  const [poseDataStale, setPoseDataStale] = useState(true);
  const [isRefreshingStream, setIsRefreshingStream] = useState(false);

  const gameState = gameStateQuery.data?.data;
  const currentEvent = currentEventQuery.data?.data;
  const currentStory = currentStoryQuery.data?.data;
  const syncAtPhaseBoundary = useCallback(() => {
    const run = async () => {
      const nextGameStateResult = await gameStateQuery.refetch();
      const nextGameState =
        nextGameStateResult.data?.data ?? gameStateQuery.data?.data;

      const judgeResult = nextGameState?.judge_result;
      const isEventResolved =
        judgeResult === 'success' || judgeResult === 'fail';
      const hasEventId = Boolean(nextGameState?.event_id);

      if (isEventResolved || hasEventId) {
        await currentEventQuery.refetch();
        return;
      }

      await currentStoryQuery.refetch();
    };

    void run();
  }, [gameStateQuery, currentEventQuery, currentStoryQuery]);

  const { gameStatusProps, narrativeProps } = useGameViewModel({
    gameState,
    currentEvent,
    currentStory,
    isStoryLoading: Boolean(
      currentStoryQuery.isFetching || currentStoryQuery.isPending
    ),
    onBoundarySync: syncAtPhaseBoundary,
  });

  const handleRefreshStreamStatus = () => {
    const edgeSource = activeVideoSourceRef.current ?? poseSourceRef.current;
    setIsRefreshingStream(true);

    socketRef.current?.emit('request_offer', {
      source: FRONTEND_SOURCE,
      target: edgeSource,
    });

    if (frameSocketRef.current && !frameSocketRef.current.connected) {
      frameSocketRef.current.connect();
    }
    bootstrapPoseRef.current(edgeSource);
    setPreviewStatus('已手動刷新，等待 Jetson 回應 Offer...');

    window.setTimeout(() => {
      setIsRefreshingStream(false);
    }, 650);
  };

  useEffect(() => {
    if (!previewError) {
      previewErrorToastRef.current = null;
      return;
    }

    if (previewErrorToastRef.current === previewError) {
      return;
    }

    previewErrorToastRef.current = previewError;
    toast.error('視訊鏡頭串流錯誤', {
      id: 'game-video-error',
      description: previewError,
    });
  }, [previewError]);

  useEffect(() => {
    if (!poseError) {
      poseErrorToastRef.current = null;
      return;
    }

    if (poseErrorToastRef.current === poseError) {
      return;
    }

    poseErrorToastRef.current = poseError;
    toast.error('骨架資料串流錯誤', {
      id: 'game-pose-error',
      description: poseError,
    });
  }, [poseError]);

  useEffect(() => {
    let aborted = false;
    const edgeBaseUrl = getEdgeBaseUrl();

    const applyPose = (
      sourceCandidate: string | null | undefined,
      pose: unknown
    ) => {
      const source = sourceCandidate?.trim();
      if (!source || !isPosePointArray(pose) || aborted) {
        return false;
      }
      poseSourceRef.current = source;
      latestPoseRef.current = pose;
      lastPoseUpdateTimeRef.current = Date.now();
      setPoseDataStale(false);
      setPoseStatus(`已接收骨架資料 (${source})`);
      setPoseError(null);
      scheduleOverlayDrawRef.current();
      return true;
    };

    const bootstrapLatestPose = async (preferredSource?: string | null) => {
      try {
        const source = preferredSource?.trim();
        const endpoint = source
          ? `${edgeBaseUrl}/edge/frames/latest/${encodeURIComponent(source)}`
          : `${edgeBaseUrl}/edge/frames/latest`;
        const response = await fetch(endpoint);
        if (!response.ok) {
          if (!aborted) {
            setPoseStatus('骨架資料尚未就緒，等待 Jetson 傳送...');
          }
          return;
        }
        if (source) {
          const payload = (await response.json()) as {
            data?: {
              frame?: {
                latest_pose?: number[][];
                source?: string;
              };
            };
          };
          const frame = payload?.data?.frame;
          const synced = applyPose(frame?.source ?? source, frame?.latest_pose);
          if (!synced && !aborted) {
            setPoseStatus(`已鎖定來源 ${source}，等待骨架資料...`);
          }
          return;
        }

        const payload = (await response.json()) as {
          data?: {
            frames?: Record<
              string,
              {
                latest_pose?: number[][];
                source?: string;
              }
            >;
          };
        };

        const frames = payload?.data?.frames;
        if (!frames) {
          if (!aborted) {
            setPoseStatus('骨架資料尚未就緒，等待 Jetson 傳送...');
          }
          return;
        }

        const activeSource = activeVideoSourceRef.current?.trim();
        if (activeSource) {
          const activeFrame = frames[activeSource];
          if (
            applyPose(
              activeFrame?.source ?? activeSource,
              activeFrame?.latest_pose
            )
          ) {
            return;
          }
        }

        const [firstSource, firstFrame] = Object.entries(frames)[0] ?? [];
        if (
          !applyPose(
            firstFrame?.source ?? firstSource,
            firstFrame?.latest_pose
          ) &&
          !aborted
        ) {
          setPoseStatus('已連線，等待有效骨架資料...');
        }
      } catch {
        if (!aborted) {
          setPoseError('骨架資料初始化失敗，將等待即時 frame_broadcast。');
          setPoseStatus('骨架資料重試中...');
        }
      }
    };
    bootstrapPoseRef.current = (source?: string | null) => {
      void bootstrapLatestPose(source);
    };

    const frameSocket = io(`${edgeBaseUrl}${FRAME_NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    frameSocketRef.current = frameSocket;

    frameSocket.on('connect', () => {
      if (aborted) {
        return;
      }
      setPoseStatus('骨架即時通道已連線');
      setPoseError(null);
      void bootstrapLatestPose(
        activeVideoSourceRef.current ?? poseSourceRef.current
      );
    });

    frameSocket.on('disconnect', () => {
      if (!aborted) {
        setPoseDataStale(true);
        setPoseStatus('骨架即時通道中斷，嘗試重新連線中...');
      }
    });

    frameSocket.on('connect_error', () => {
      if (!aborted) {
        setPoseDataStale(true);
        setPoseError(
          '骨架即時通道連線失敗，請檢查 /socket.io 與 /edge 代理設定。'
        );
        setPoseStatus('骨架即時通道連線失敗');
      }
    });

    frameSocket.on(
      'frame_broadcast',
      (payload: { source?: string; latest_pose?: unknown }) => {
        const source = payload?.source?.trim();
        if (!source) {
          return;
        }
        const activeSource = activeVideoSourceRef.current?.trim();
        if (activeSource && activeSource !== source) {
          return;
        }
        if (
          poseSourceRef.current &&
          poseSourceRef.current !== source &&
          !activeSource
        ) {
          return;
        }
        applyPose(source, payload?.latest_pose);
      }
    );

    void bootstrapLatestPose();

    // 檢查骨架資料是否過期（2 秒無新資料）
    const POSE_STALE_THRESHOLD_MS = 2000;
    const staleCheckInterval = window.setInterval(() => {
      if (aborted) {
        return;
      }
      const lastUpdateMs = lastPoseUpdateTimeRef.current;
      const nowMs = Date.now();
      if (lastUpdateMs > 0 && nowMs - lastUpdateMs > POSE_STALE_THRESHOLD_MS) {
        setPoseDataStale(true);
      }
    }, 500);

    return () => {
      aborted = true;
      window.clearInterval(staleCheckInterval);
      bootstrapPoseRef.current = () => {};
      frameSocket.disconnect();
      frameSocketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = skeletonCanvasRef.current;
    const video = videoRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const drawOverlayFrame = () => {
      overlayFrameRef.current = null;
      drawPoseOverlay(
        ctx,
        canvas,
        videoRef.current ?? video,
        latestPoseRef.current
      );
    };

    const scheduleOverlayRefresh = () => {
      if (overlayFrameRef.current !== null) {
        return;
      }
      overlayFrameRef.current = window.requestAnimationFrame(drawOverlayFrame);
    };

    scheduleOverlayDrawRef.current = scheduleOverlayRefresh;

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            scheduleOverlayRefresh();
          });

    resizeObserver?.observe(canvas);
    if (canvas.parentElement) {
      resizeObserver?.observe(canvas.parentElement);
    }
    if (video) {
      video.addEventListener('loadedmetadata', scheduleOverlayRefresh);
      video.addEventListener('resize', scheduleOverlayRefresh);
    }
    window.addEventListener('resize', scheduleOverlayRefresh);
    scheduleOverlayRefresh();

    return () => {
      if (overlayFrameRef.current !== null) {
        window.cancelAnimationFrame(overlayFrameRef.current);
        overlayFrameRef.current = null;
      }
      scheduleOverlayDrawRef.current = () => {};
      resizeObserver?.disconnect();
      if (video) {
        video.removeEventListener('loadedmetadata', scheduleOverlayRefresh);
        video.removeEventListener('resize', scheduleOverlayRefresh);
      }
      window.removeEventListener('resize', scheduleOverlayRefresh);
    };
  }, []);

  useEffect(() => {
    const edgeBaseUrl = getEdgeBaseUrl();
    const socket = io(`${edgeBaseUrl}${VIDEO_NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    const clearRemoteStream = (stopTracks: boolean) => {
      const stream = remoteStreamRef.current;
      if (!stream) {
        if (videoRef.current?.srcObject) {
          videoRef.current.srcObject = null;
        }
        return;
      }
      if (videoRef.current?.srcObject === stream) {
        videoRef.current.srcObject = null;
      }
      if (stopTracks) {
        stream.getTracks().forEach((track) => track.stop());
      }
      remoteStreamRef.current = null;
    };

    const resetPeerConnection = (options?: { clearStream?: boolean }) => {
      pendingRemoteCandidatesRef.current = [];
      remoteDescriptionAppliedRef.current = false;
      const pc = peerRef.current;
      peerRef.current = null;
      if (pc) {
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.onicecandidate = null;
        pc.close();
      }
      if (options?.clearStream) {
        clearRemoteStream(true);
      }
    };

    const flushPendingCandidates = async (pc: RTCPeerConnection) => {
      if (!remoteDescriptionAppliedRef.current) {
        return;
      }
      const pending = pendingRemoteCandidatesRef.current;
      if (!pending.length) {
        return;
      }
      pendingRemoteCandidatesRef.current = [];
      for (const candidate of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const ensurePeerConnection = () => {
      if (peerRef.current) {
        return peerRef.current;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream || !videoRef.current) {
          return;
        }
        remoteStreamRef.current = stream;
        videoRef.current.srcObject = stream;
        setPreviewStatus('已接收 Jetson 影像串流');
        setPreviewError(null);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setPreviewStatus('已接收 Jetson 影像串流');
          setPreviewError(null);
          return;
        }
        if (pc.connectionState === 'failed') {
          setPreviewError(
            'WebRTC 連線失敗，請確認 Jetson 端 offer/candidate 是否持續送出。'
          );
          setPreviewStatus('WebRTC 連線失敗，等待 Jetson 重新協商...');
          resetPeerConnection({ clearStream: true });
        } else if (pc.connectionState === 'disconnected') {
          setPreviewStatus('影像串流暫時中斷，等待 Jetson 重新連線...');
        } else if (pc.connectionState === 'closed') {
          setPreviewStatus('影像串流已關閉，等待 Jetson 重新協商...');
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          setPreviewStatus('ICE 連線失敗，等待 Jetson 重新協商...');
          setPreviewError('ICE 連線失敗，請確認 Jetson 與前端網路可互通。');
          resetPeerConnection({ clearStream: true });
        }
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }
        socket.emit('candidate', {
          type: 'candidate',
          source: FRONTEND_SOURCE,
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
        });
      };

      peerRef.current = pc;
      return pc;
    };

    socket.on('connect', () => {
      setPreviewStatus('Signaling 已連線，等待 Jetson 發送 Offer...');
      setPreviewError(null);
      socket.emit('request_offer', {
        source: FRONTEND_SOURCE,
      });
    });

    socket.on('disconnect', () => {
      setPreviewStatus('Signaling 已中斷，嘗試重新連線中...');
    });

    socket.on(
      'response',
      (payload: { data?: string; message?: string; error?: string }) => {
        if (payload?.error) {
          setPreviewError(payload.error);
        }
      }
    );

    socket.on(
      'offer',
      async (payload: { source?: string; sdp?: string; type?: string }) => {
        const source = payload?.source?.trim();
        if (!payload?.sdp || source === FRONTEND_SOURCE) {
          return;
        }

        try {
          if (source) {
            activeVideoSourceRef.current = source;
            if (poseSourceRef.current !== source) {
              poseSourceRef.current = source;
              setPoseStatus(`已鎖定骨架來源 (${source})`);
              bootstrapPoseRef.current(source);
            }
          }
          resetPeerConnection({ clearStream: true });
          const pc = ensurePeerConnection();
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'offer', sdp: payload.sdp })
          );
          remoteDescriptionAppliedRef.current = true;
          await flushPendingCandidates(pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('answer', {
            type: 'answer',
            source: FRONTEND_SOURCE,
            target: payload.source,
            sdp: answer.sdp,
          });
          setPreviewStatus('已送出 Answer，等待 Jetson 媒體軌道...');
        } catch {
          setPreviewError('處理 Offer 失敗，請確認 Jetson SDP 格式正確。');
        }
      }
    );

    socket.on(
      'candidate',
      async (payload: {
        source?: string;
        candidate?: string;
        sdpMLineIndex?: number;
        sdpMid?: string;
      }) => {
        if (!payload?.candidate || payload.source === FRONTEND_SOURCE) {
          return;
        }

        try {
          const candidateInit = {
            candidate: payload.candidate,
            sdpMLineIndex: payload.sdpMLineIndex,
            sdpMid: payload.sdpMid,
          };
          if (!remoteDescriptionAppliedRef.current || !peerRef.current) {
            pendingRemoteCandidatesRef.current.push(candidateInit);
            return;
          }
          const pc = ensurePeerConnection();
          await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch {
          setPreviewError('ICE Candidate 套用失敗，請檢查 candidate 內容。');
        }
      }
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
      resetPeerConnection({ clearStream: true });
    };
  }, []);

  return (
    <section className="space-y-5 pb-8">
      <BackHomeButton />
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <VideoStreamCard
          videoRef={videoRef}
          skeletonCanvasRef={skeletonCanvasRef}
          previewStatus={previewStatus}
          previewError={previewError}
          poseStatus={poseStatus}
          poseError={poseError}
          poseDataStale={poseDataStale}
          isRefreshingStream={isRefreshingStream}
          onRefresh={handleRefreshStreamStatus}
        />

        <div className="grid gap-4 lg:grid-rows-[auto_1fr]">
          <GameStatusCard {...gameStatusProps} />

          <NarrativeCard {...narrativeProps} />
        </div>
      </div>
    </section>
  );
}
