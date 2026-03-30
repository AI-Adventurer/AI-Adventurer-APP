import type { RefObject } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import StreamStatusBadge from './StreamStatusBadge';

type VideoStreamCardProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  skeletonCanvasRef: RefObject<HTMLCanvasElement | null>;
  previewStatus: string;
  previewError: string | null;
  poseStatus: string;
  poseError: string | null;
  poseDataStale: boolean;
  isRefreshingStream: boolean;
  onRefresh: () => void;
};

export default function VideoStreamCard({
  videoRef,
  skeletonCanvasRef,
  previewStatus,
  previewError,
  poseStatus,
  poseError,
  poseDataStale,
  isRefreshingStream,
  onRefresh,
}: VideoStreamCardProps) {
  const videoConnected = !previewError && previewStatus.includes('已接收');
  const poseConnected =
    !poseError &&
    !poseDataStale &&
    (poseStatus.includes('已接收') || poseStatus.includes('已鎖定'));

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>鏡頭畫面</CardTitle>
        <StreamStatusBadge
          videoConnected={videoConnected}
          poseConnected={poseConnected}
          isRefreshingStream={isRefreshingStream}
          onRefresh={onRefresh}
        />
      </CardHeader>
      <CardContent>
        <div className="relative flex h-[min(74vh,700px)] min-h-[420px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/60 bg-[linear-gradient(145deg,hsl(var(--muted)/0.5),hsl(var(--card)))] text-sm text-muted-foreground">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,hsl(var(--primary)/0.2),transparent_38%),radial-gradient(circle_at_78%_80%,hsl(var(--primary)/0.12),transparent_42%)]" />
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="relative z-10 h-full w-full object-contain"
          />
          <canvas
            ref={skeletonCanvasRef}
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
