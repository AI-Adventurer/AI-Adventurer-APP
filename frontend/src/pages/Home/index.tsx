import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useStartGame } from '@/hooks/mutations/useStartGame';

export default function Home() {
  const navigate = useNavigate();
  const startGameMutation = useStartGame();

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
          AI-Adventurer
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          透過姿態互動進行冒險，開始你的挑戰。
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <Button
          className="w-full hover:cursor-pointer"
          size="lg"
          onClick={handleStartGame}
        >
          開始遊戲
        </Button>

        <Button className="w-full" size="lg" variant="secondary" asChild>
          <Link to="/calibration">姿態校正</Link>
        </Button>

        <Button className="w-full" size="lg" variant="secondary" asChild>
          <Link to="/how-to-play">玩法說明</Link>
        </Button>
      </div>

      {startGameMutation.error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {startGameMutation.error.message}
        </p>
      ) : null}
    </section>
  );
}
