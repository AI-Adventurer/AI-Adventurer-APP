import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BackHomeButton from '@/components/common/BackHomeButton';
import { useGenerateStory } from '@/hooks/mutations/useGenerateStory';
import { useInjectDemoEvent } from '@/hooks/mutations/useInjectDemoEvent';
import { useConfig } from '@/hooks/queries/useConfig';
import { useGameState } from '@/hooks/queries/useGameState';
import { useHealth } from '@/hooks/queries/useHealth';
import { API_BASE_URL } from '@/lib/apiClient';

const defaultActions = ['stand', 'crouch', 'jump'];
const maxHp = 3;

export default function Game() {
  const { showDebug } = useOutletContext<{ showDebug: boolean }>();
  const healthQuery = useHealth();
  const configQuery = useConfig();
  const gameStateQuery = useGameState();
  const injectDemoEventMutation = useInjectDemoEvent();
  const generateStoryMutation = useGenerateStory();

  const [selectedAction, setSelectedAction] = useState(defaultActions[0]);

  const gameState = gameStateQuery.data?.data;
  const currentHp = Math.max(
    0,
    Math.min(maxHp, gameState?.player_state.hp ?? 0)
  );
  const timeLeftSeconds = useMemo(
    () => Math.max(0, Math.ceil((gameState?.time_remaining_ms ?? 0) / 1000)),
    [gameState?.time_remaining_ms]
  );

  const debugPayload = useMemo(
    () => ({
      apiBaseUrl: API_BASE_URL,
      isBackendReady: healthQuery.data?.data?.status === 'ok',
      config: configQuery.data?.data,
      gameState,
      error:
        healthQuery.error?.message ??
        configQuery.error?.message ??
        gameStateQuery.error?.message,
    }),
    [
      configQuery.data?.data,
      configQuery.error?.message,
      gameState,
      gameStateQuery.error?.message,
      healthQuery.data?.data?.status,
      healthQuery.error?.message,
    ]
  );

  return (
    <section className="space-y-5 pb-8">
      <BackHomeButton />

      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/30 px-6 py-8 shadow-sm">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          AI-Adventurer
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          即時姿態互動冒險，完成目標動作推進劇情。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>玩家狀態</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">血量</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1.5">
                {Array.from({ length: maxHp }).map((_, index) => (
                  <div
                    key={`hp-bar-${index}`}
                    className={`h-3 flex-1 rounded-full transition-colors ${
                      index < currentHp ? 'bg-emerald-500' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {currentHp}/{maxHp}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">分數</p>
            <p className="text-2xl font-semibold tabular-nums">
              {gameState?.player_state.score ?? '-'}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">遊戲階段</p>
            <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
              {gameState?.chapter_id ?? '-'}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>鏡頭畫面</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_hsl(var(--primary)/0.12),_transparent_65%)]" />
              TODO: Camera Stream Preview
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>劇情</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="min-h-28 rounded-lg border border-border/60 bg-muted/30 p-4 leading-relaxed">
              {gameState?.story_segment ?? '尚未產生劇情內容'}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {showDebug ? (
                <>
                  <select
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedAction}
                    onChange={(event) => setSelectedAction(event.target.value)}
                  >
                    {defaultActions.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>

                  <Button
                    onClick={() =>
                      injectDemoEventMutation.mutate({
                        target_action: selectedAction,
                      })
                    }
                  >
                    Inject Demo Event
                  </Button>
                </>
              ) : null}

              <Button
                variant="outline"
                onClick={() =>
                  generateStoryMutation.mutate({
                    event_result: 'success',
                    template_key: 'chapter1_success',
                  })
                }
              >
                Generate Story
              </Button>

              <Button
                variant="ghost"
                onClick={() => void gameStateQuery.refetch()}
              >
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>剩餘時間</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {timeLeftSeconds}s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>目標動作</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1.5 text-lg font-semibold text-primary">
              {gameState?.target_action ?? '-'}
            </span>
          </CardContent>
        </Card>
      </div>

      {showDebug ? (
        <Card>
          <CardHeader>
            <CardTitle>Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto text-xs">
              {JSON.stringify(debugPayload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
