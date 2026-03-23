import BackHomeButton from '@/components/common/BackHomeButton';

export default function HowToPlay() {
  return (
    <section className="mx-auto flex min-h-[65vh] w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <BackHomeButton />

      <h2 className="text-3xl font-semibold tracking-tight">玩法說明</h2>
      <p className="text-muted-foreground">TODO: 玩法說明內容與操作教學。</p>
    </section>
  );
}
