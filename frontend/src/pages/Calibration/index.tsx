import BackHomeButton from '@/components/common/BackHomeButton';

export default function Calibration() {
  return (
    <section className="mx-auto flex min-h-[65vh] w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <BackHomeButton />

      <h2 className="text-3xl font-semibold tracking-tight">姿態校正</h2>
      <p className="text-muted-foreground">TODO: 姿態校正流程與引導畫面。</p>
    </section>
  );
}
