import type { RefObject } from 'react';

import { toActionLabelZh } from '@/config/actionLabels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import StreamStatusBadge from './StreamStatusBadge';

type ActionPrediction = {
  action: string;
  confidence: number;
};

type VideoStreamCardProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  skeletonCanvasRef: RefObject<HTMLCanvasElement | null>;
  topActionPredictions: ActionPrediction[];
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
  topActionPredictions,
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
      <CardContent className="space-y-3">
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

        <div className="rounded-lg border border-border/60 bg-background/70 p-3">
          <p className="mb-2 text-xs font-semibold text-foreground/90">
            動作辨識 Top 3
          </p>
          <div className="space-y-2">
            {topActionPredictions.length > 0 ? (
              topActionPredictions.map((item) => {
                const confidencePercent = Math.round(
                  Math.max(0, Math.min(1, item.confidence)) * 100
                );

                return (
                  <div key={item.action} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-medium text-foreground/90">
                      {toActionLabelZh(item.action)}
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/80">
                      <div
                        className="h-full rounded-full bg-primary/85 transition-[width] duration-150"
                        style={{ width: `${confidencePercent}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-xs font-semibold tabular-nums text-foreground/85">
                      {confidencePercent}%
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">
                等待動作辨識資料...
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
