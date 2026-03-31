type TargetActionIllustrationProps = {
  action: string | null | undefined;
  label: string;
  className?: string;
};

type SupportedAction = 'crouch' | 'idle' | 'jump' | 'push' | 'run_forward';

const FIGURE_STROKE_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 12,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  vectorEffect: 'non-scaling-stroke',
} as const;

const MOTION_STROKE_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  vectorEffect: 'non-scaling-stroke',
} as const;

function normalizeAction(action: string | null | undefined): SupportedAction {
  switch (action?.trim().toLowerCase()) {
    case 'crouch':
    case 'jump':
    case 'push':
    case 'run_forward':
      return action.trim().toLowerCase() as SupportedAction;
    default:
      return 'idle';
  }
}

function MotionLines({
  className,
  lines,
}: {
  className: string;
  lines: Array<{ x1: number; x2: number; y1: number; y2: number }>;
}) {
  return (
    <g className={className} aria-hidden="true">
      {lines.map((line, index) => (
        <line
          key={`${line.x1}-${line.y1}-${index}`}
          {...line}
          {...MOTION_STROKE_PROPS}
        />
      ))}
    </g>
  );
}

function JumpPose() {
  return (
    <>
      <MotionLines
        className="target-action-lines target-action-lines-rise"
        lines={[
          { x1: 70, y1: 120, x2: 70, y2: 134 },
          { x1: 80, y1: 124, x2: 80, y2: 138 },
          { x1: 90, y1: 120, x2: 90, y2: 134 },
        ]}
      />
      <g className="target-action-figure target-action-figure-jump">
        <circle cx="80" cy="24" r="12" fill="currentColor" />
        <path d="M80 42 L80 80" {...FIGURE_STROKE_PROPS} />
        <path d="M80 50 Q60 38 54 16" {...FIGURE_STROKE_PROPS} />
        <path d="M80 50 Q100 38 106 16" {...FIGURE_STROKE_PROPS} />
        <path d="M80 80 Q66 90 60 108" {...FIGURE_STROKE_PROPS} />
        <path d="M80 80 Q94 90 100 108" {...FIGURE_STROKE_PROPS} />
      </g>
    </>
  );
}

function RunForwardPose() {
  return (
    <>
      <MotionLines
        className="target-action-lines target-action-lines-run"
        lines={[
          { x1: 18, y1: 34, x2: 46, y2: 34 },
          { x1: 24, y1: 42, x2: 54, y2: 42 },
          { x1: 18, y1: 50, x2: 46, y2: 50 },
        ]}
      />

      <g className="target-action-figure target-action-figure-run">
        <circle cx="100" cy="22" r="14" fill="currentColor" />
        <path d="M87 45 Q80 58 78 84" {...FIGURE_STROKE_PROPS} />
        <path d="M84 47 Q50 49 59 71" {...FIGURE_STROKE_PROPS} />
        <path d="M87 49 Q96 66 120 60" {...FIGURE_STROKE_PROPS} />
        <path d="M75 90 Q68 96 56 121" {...FIGURE_STROKE_PROPS} />
        <path d="M79 87 Q109 104 100 122" {...FIGURE_STROKE_PROPS} />
      </g>
    </>
  );
}

function CrouchPose() {
  return (
    <>
      <MotionLines
        className="target-action-lines target-action-lines-crouch"
        lines={[
          { x1: 116, y1: 48, x2: 116, y2: 62 },
          { x1: 124, y1: 44, x2: 124, y2: 58 },
          { x1: 132, y1: 48, x2: 132, y2: 62 },
        ]}
      />

      <g className="target-action-figure target-action-figure-crouch">
        <circle cx="104" cy="24" r="15" fill="currentColor" />
        <path d="M82 44 Q60 54 67 92" {...FIGURE_STROKE_PROPS} />
        <path d="M82 50 100 90" {...FIGURE_STROKE_PROPS} />
        <path d="M68 94 73 110 Q40 120 40 120" {...FIGURE_STROKE_PROPS} />
        <path
          d="M74 90 Q96 90 104 96 Q104 110 106 124"
          {...FIGURE_STROKE_PROPS}
        />
      </g>
    </>
  );
}

function PushPose() {
  return (
    <>
      <MotionLines
        className="target-action-lines target-action-lines-push"
        lines={[
          { x1: 22, y1: 60, x2: 48, y2: 56 },
          { x1: 28, y1: 72, x2: 56, y2: 68 },
          { x1: 24, y1: 84, x2: 46, y2: 80 },
        ]}
      />
      <g className="target-action-figure target-action-figure-push">
        <circle cx="106" cy="26" r="12" fill="currentColor" />
        <path d="M92 40 L74 72" {...FIGURE_STROKE_PROPS} />
        <path d="M92 46 L118 46 L128 46" {...FIGURE_STROKE_PROPS} />
        <path d="M92 50 L108 64 128 62" {...FIGURE_STROKE_PROPS} />
        <path d="M74 72 Q50 90 48 116" {...FIGURE_STROKE_PROPS} />
        <path d="M74 72  96 116" {...FIGURE_STROKE_PROPS} />
      </g>
    </>
  );
}

function IdlePose() {
  return (
    <>
      <g className="target-action-figure target-action-figure-idle">
        <circle cx="80" cy="24" r="12" fill="currentColor" />
        <path d="M80 40 L80 82" {...FIGURE_STROKE_PROPS} />
        <path d="M80 50 L60 64" {...FIGURE_STROKE_PROPS} />
        <path d="M80 50 L100 64" {...FIGURE_STROKE_PROPS} />
        <path d="M80 82 L66 110" {...FIGURE_STROKE_PROPS} />
        <path d="M80 82 L94 110" {...FIGURE_STROKE_PROPS} />
      </g>
    </>
  );
}

export default function TargetActionIllustration({
  action,
  label,
  className = '',
}: TargetActionIllustrationProps) {
  const normalizedAction = normalizeAction(action);

  const pose = (() => {
    switch (normalizedAction) {
      case 'jump':
        return <JumpPose />;
      case 'run_forward':
        return <RunForwardPose />;
      case 'crouch':
        return <CrouchPose />;
      case 'push':
        return <PushPose />;
      default:
        return <IdlePose />;
    }
  })();

  return (
    <div
      className={`target-action-stage relative w-full max-w-[220px] overflow-hidden rounded-[1.35rem] border border-black/10 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-2 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_30px_-24px_rgba(15,23,42,0.55)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(59,130,246,0.12),transparent_48%)]" />
      <svg
        viewBox="0 0 160 140"
        role="img"
        aria-label={`${label}動作示意`}
        className="target-action-svg relative z-10 mx-auto h-40 w-full"
      >
        {pose}
      </svg>
      <div className="pointer-events-none absolute inset-x-4 bottom-4 h-px bg-gradient-to-r from-transparent via-slate-400/45 to-transparent" />
    </div>
  );
}
