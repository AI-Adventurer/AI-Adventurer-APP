import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { useStartGame } from '@/hooks/mutations/useStartGame';

export default function Home() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const startGameMutation = useStartGame();

  const isDarkMode = theme === 'dark';

  const handleStartGame = () => {
    startGameMutation.mutate(undefined, {
      onSuccess: () => {
        void navigate('/game');
      },
    });
  };

  return (
    <section className="flex min-h-[75vh] flex-col items-center justify-center gap-16 py-10">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          小廖大冒險
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          透過姿態互動進行冒險，開始你的挑戰。
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <Button
          className="w-full hover:cursor-pointer"
          size="lg"
          disabled={startGameMutation.isPending}
          onClick={handleStartGame}
        >
          {startGameMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              載入中...
            </>
          ) : (
            '開始遊戲'
          )}
        </Button>

        <Button className="w-full" size="lg" variant="secondary" asChild>
          <Link to="/llm-test">LLM 測試</Link>
        </Button>

        <Button className="w-full" size="lg" variant="secondary" asChild>
          <Link to="/how-to-play">玩法說明</Link>
        </Button>

        <Button
          className="w-full"
          size="lg"
          variant="outline"
          onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
        >
          {isDarkMode ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
          {isDarkMode ? '切換淺色模式' : '切換深色模式'}
        </Button>
      </div>
    </section>
  );
}
