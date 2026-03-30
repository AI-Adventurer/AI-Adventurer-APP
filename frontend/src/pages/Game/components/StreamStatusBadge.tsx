import { RefreshCw } from 'lucide-react';

type StreamStatusBadgeProps = {
  videoConnected: boolean;
  poseConnected: boolean;
  isRefreshingStream: boolean;
  onRefresh: () => void;
};

export default function StreamStatusBadge({
  videoConnected,
  poseConnected,
  isRefreshingStream,
  onRefresh,
}: StreamStatusBadgeProps) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-[11px] font-medium text-foreground/90 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <span>視訊鏡頭</span>
        <span
          className={`status-indicator ${
            videoConnected ? 'status-dot-connected' : 'status-dot-loading'
          }`}
        />
      </div>
      <div className="h-3.5 w-px bg-border/70" />
      <div className="flex items-center gap-1.5">
        <span>骨架資料</span>
        <span
          className={`status-indicator ${
            poseConnected ? 'status-dot-connected' : 'status-dot-loading'
          }`}
        />
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/70 bg-background/75 text-foreground/80 transition hover:bg-muted/60"
        aria-label="重新整理串流狀態"
        title="重新整理串流"
      >
        <RefreshCw
          className={`h-3.5 w-3.5 ${isRefreshingStream ? 'animate-spin' : ''}`}
        />
      </button>
    </div>
  );
}
