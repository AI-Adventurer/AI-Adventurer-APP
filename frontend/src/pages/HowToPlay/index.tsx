import BackHomeButton from '@/components/common/BackHomeButton';

export default function HowToPlay() {
  return (
    <section className="mx-auto flex min-h-[65vh] w-full max-w-3xl flex-col gap-5 px-4 pb-10 pt-4">
      <BackHomeButton />

      <h2 className="text-center text-3xl font-semibold tracking-tight">
        玩法說明
      </h2>

      <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-5">
        <h3 className="text-lg font-semibold">遊戲目標</h3>
        <p className="leading-7 text-muted-foreground">
          你將扮演在夢境中冒險的小廖，透過身體動作完成事件挑戰。
          在血量歸零前撐過全部 20 段劇情，即可達成好結局。
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-5">
        <h3 className="text-lg font-semibold">流程</h3>
        <ol className="list-decimal space-y-2 pl-5 leading-7 text-muted-foreground">
          <li>先閱讀劇情卡，了解當前情境與目標。</li>
          <li>進入事件卡後，會先有 5 秒「閱讀中」保護期。</li>
          <li>保護期內不會判定動作，事件倒數也不會扣。</li>
          <li>保護期結束後才開始正式倒數與動作判定。</li>
          <li>做出正確動作會立即判定成功並更新畫面。</li>
        </ol>
      </div>

      <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-5">
        <h3 className="text-lg font-semibold">可辨識動作</h3>
        <ul className="grid gap-2 text-muted-foreground sm:grid-cols-2">
          <li>跳躍（jump）</li>
          <li>下蹲（crouch）</li>
          <li>向前跑（run_forward）</li>
          <li>推開（push）</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          鏡頭下方會顯示動作辨識 Top 3 與信心度百分比，可用來即時調整姿勢。
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-5">
        <h3 className="text-lg font-semibold">計分與血量</h3>
        <ul className="list-disc space-y-2 pl-5 leading-7 text-muted-foreground">
          <li>成功：分數 +10</li>
          <li>失敗：血量 -1、分數 -10（分數最低為 0）</li>
          <li>初始血量為 5</li>
        </ul>
      </div>

      <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-5">
        <h3 className="text-lg font-semibold">結局條件</h3>
        <ul className="list-disc space-y-2 pl-5 leading-7 text-muted-foreground">
          <li>好結局：血量大於 0，並完成 20 段劇情。</li>
          <li>壞結局：血量扣到 0。</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          遊戲結束後會進入結局過場畫面，可選擇「重新開始」或「返回標題」。
        </p>
      </div>
    </section>
  );
}
