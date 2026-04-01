import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import BackHomeButton from '@/components/common/BackHomeButton';
import { Button } from '@/components/ui/button';
import { useStartGame } from '@/hooks/mutations/useStartGame';
import { useCurrentEvent } from '@/hooks/queries/useCurrentEvent';
import { useCurrentStory } from '@/hooks/queries/useCurrentStory';
import { useGameState } from '@/hooks/queries/useGameState';
import GameStatusCard from './components/GameStatusCard';
import { NarrativeCard } from './components/NarrativeCard';
import VideoStreamCard from './components/VideoStreamCard';
import { useGameViewModel } from './hooks/useGameViewModel';
import {
  drawPoseOverlay,
  FRAME_NAMESPACE,
  FRONTEND_SOURCE,
  GAME_NAMESPACE,
  getEdgeBaseUrl,
  isPosePointArray,
  type PosePoint,
  VIDEO_NAMESPACE,
} from './lib/stream';

type ActionPrediction = {
  action: string;
  confidence: number;
};

export default function Game() {
  const navigate = useNavigate();
  const startGameMutation = useStartGame();
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
  const actionSignatureRef = useRef('');
  const lastImmediateSuccessSyncAtRef = useRef(0);
  const targetActionRef = useRef<string | null>(null);
  const judgeResultRef = useRef<string | null>(null);
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
  const [showEndingTransition, setShowEndingTransition] = useState(false);
  const [topActionPredictions, setTopActionPredictions] = useState<
    ActionPrediction[]
  >([]);

  const gameState = gameStateQuery.data?.data;
  const currentEvent = currentEventQuery.data?.data;
  const currentStory = currentStoryQuery.data?.data;

  useEffect(() => {
    targetActionRef.current = gameState?.target_action ?? null;
    judgeResultRef.current = gameState?.judge_result ?? null;
  }, [gameState?.target_action, gameState?.judge_result]);

  const normalizeConfidence = (value: unknown) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null;
    }

    if (value <= 1) {
      return Math.max(0, value);
    }

    if (value <= 100) {
      return value / 100;
    }

    return 1;
  };

  const toTopActionPredictions = (
    actionScores: unknown,
    stableAction: unknown,
    confidenceValue: unknown
  ) => {
    const normalizedFromScores =
      actionScores && typeof actionScores === 'object'
        ? Object.entries(actionScores as Record<string, unknown>)
            .map(([action, score]) => {
              const normalized = normalizeConfidence(score);
              return normalized === null
                ? null
                : {
                    action,
                    confidence: normalized,
                  };
            })
            .filter((item): item is ActionPrediction => Boolean(item))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3)
        : [];

    if (normalizedFromScores.length > 0) {
      return normalizedFromScores;
    }

    const fallbackAction =
      typeof stableAction === 'string' ? stableAction.trim() : '';
    const fallbackConfidence = normalizeConfidence(confidenceValue);
    if (!fallbackAction || fallbackConfidence === null) {
      return [];
    }

    return [
      {
        action: fallbackAction,
        confidence: fallbackConfidence,
      },
    ];
  };

  const applyActionPredictions = (
    actionScores: unknown,
    stableAction: unknown,
    confidenceValue: unknown
  ) => {
    const nextTop = toTopActionPredictions(
      actionScores,
      stableAction,
      confidenceValue
    );

    const signature = nextTop
      .map((item) => `${item.action}:${item.confidence.toFixed(3)}`)
      .join('|');

    if (signature === actionSignatureRef.current) {
      return;
    }

    actionSignatureRef.current = signature;
    setTopActionPredictions(nextTop);
  };

  const tryImmediateSuccessSync = (observedAction: unknown) => {
    if (judgeResultRef.current && judgeResultRef.current !== 'pending') {
      return;
    }

    const target = targetActionRef.current?.trim().toLowerCase();
    const observed =
      typeof observedAction === 'string'
        ? observedAction.trim().toLowerCase()
        : '';

    if (!target || !observed || observed !== target) {
      return;
    }

    const now = Date.now();
    if (now - lastImmediateSuccessSyncAtRef.current < 250) {
      return;
    }

    lastImmediateSuccessSyncAtRef.current = now;
    void gameStateQuery.refetch();
    void currentEventQuery.refetch();
  };

  const hasStorySegment = Boolean(currentStory?.story_segment?.trim());
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
      currentStoryQuery.isPending ||
      (currentStoryQuery.isFetching && !hasStorySegment)
    ),
    onBoundarySync: syncAtPhaseBoundary,
  });

  const isGameOver = Boolean(gameState?.is_game_over);
  const endingTitle = gameState?.ending_title?.trim() || '結局';
  const endingStory =
    gameState?.ending_story?.trim() ||
    gameState?.story_segment?.trim() ||
    '冒險告一段落。';

  const handleRestartGame = () => {
    startGameMutation.mutate(undefined, {
      onSuccess: () => {
        setShowEndingTransition(false);
        void gameStateQuery.refetch();
        void currentEventQuery.refetch();
        void currentStoryQuery.refetch();
      },
    });
  };

  const handleBackToHome = () => {
    void navigate('/');
  };

  useEffect(() => {
    if (!isGameOver) {
      setShowEndingTransition(false);
      return;
    }

    setShowEndingTransition(true);
  }, [isGameOver, endingTitle]);

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
                stable_action?: string;
                confidence?: number;
                action_scores?: Record<string, number>;
              };
            };
          };
          const frame = payload?.data?.frame;
          applyActionPredictions(
            frame?.action_scores,
            frame?.stable_action,
            frame?.confidence
          );
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
                stable_action?: string;
                confidence?: number;
                action_scores?: Record<string, number>;
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
          applyActionPredictions(
            activeFrame?.action_scores,
            activeFrame?.stable_action,
            activeFrame?.confidence
          );
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
        applyActionPredictions(
          firstFrame?.action_scores,
          firstFrame?.stable_action,
          firstFrame?.confidence
        );
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
      (payload: {
        source?: string;
        latest_pose?: unknown;
        stable_action?: string;
        confidence?: number;
        action_scores?: Record<string, number>;
      }) => {
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
        applyActionPredictions(
          payload?.action_scores,
          payload?.stable_action,
          payload?.confidence
        );
        tryImmediateSuccessSync(payload?.stable_action);
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
    const gameSocket = io(`${edgeBaseUrl}${GAME_NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    gameSocket.on(
      'event_result',
      (payload: { result?: string; event_id?: string | null }) => {
        if (payload?.result !== 'success') {
          return;
        }

        void gameStateQuery.refetch();
        void currentEventQuery.refetch();
      }
    );

    return () => {
      gameSocket.disconnect();
    };
  }, [gameStateQuery, currentEventQuery]);

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

  if (isGameOver) {
    return (
      <section className="game-ending-screen relative min-h-[78vh] overflow-hidden rounded-2xl border border-border/60 p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_22%,hsl(var(--primary)/0.2),transparent_42%),radial-gradient(circle_at_84%_84%,hsl(var(--primary)/0.14),transparent_46%)]" />
        <div
          className={`relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center ${
            showEndingTransition
              ? 'game-ending-transition-in game-ending-panel-in'
              : ''
          }`}
        >
          <h1 className="text-3xl font-extrabold tracking-wide sm:text-4xl">
            {endingTitle}
          </h1>
          <p className="w-full whitespace-pre-line rounded-xl border border-border/70 bg-background/70 p-5 text-left text-[15px] leading-8 shadow-sm">
            {endingStory}
          </p>
          <div className="mt-2 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1"
              size="lg"
              onClick={handleRestartGame}
              disabled={startGameMutation.isPending}
            >
              {startGameMutation.isPending ? '重新開始中...' : '重新開始'}
            </Button>
            <Button
              className="flex-1"
              size="lg"
              variant="outline"
              onClick={handleBackToHome}
            >
              返回標題
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 pb-8">
      <BackHomeButton />
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <VideoStreamCard
          videoRef={videoRef}
          skeletonCanvasRef={skeletonCanvasRef}
          topActionPredictions={topActionPredictions}
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
