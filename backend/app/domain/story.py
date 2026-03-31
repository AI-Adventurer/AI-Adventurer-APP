from __future__ import annotations

from typing import Any, Mapping

from app.models import StoryResult

from .engines import resolve_chapter


CHAPTER_PROMPTS: dict[int, str] = {
    1: (
        "這個對話就負責幫我產出動作冒險遊戲劇情文字敘述，目前情境: "
        "學生小廖上課睡著後，夢見自己縮小進入半導體世界，正在晶圓工廠與電子能帶之間冒險。"
        "只需要輸出遊戲劇情敘述就好，不需要其他回覆。"
        "我會提供遊戲背景與關鍵詞，請完整化成精簡敘述，並保留我提供的關鍵資訊。"
        "敘事要通俗易懂，像冒險故事，但能自然帶出半導體概念。"
    ),
    2: (
        "這個對話就負責幫我產出動作冒險遊戲劇情文字敘述，目前情境: "
        "小廖在夢中通過前段製程後，進入記憶體與訊號流動的核心區域。"
        "只需要輸出遊戲劇情敘述就好，不需要其他回覆。"
        "我會提供遊戲背景與關鍵詞，請完整化成精簡敘述，並保留我提供的關鍵資訊。"
        "敘事要通俗易懂，像冒險故事，但能自然帶出半導體概念。"
    ),
}

CHAPTER_KEYWORDS: dict[int, str] = {
    1: (
        "開頭是: 小廖在半導體課上偷偷打瞌睡。"
        "轉折是: 他夢見自己縮小成一顆進入晶圓世界的微小探測者。"
        "環境描述: 四周像銀白色工廠與發光能帶，腳下是晶圓紋路。"
        "任務目標: 理解電子、矽、摻雜與製程的基礎概念，找到前往核心區的路。"
        "結尾必須是: 就在這一刻..."
    ),
    2: (
        "開頭是: 小廖穿過製程區，來到像迷宮一樣的記憶體核心。"
        "環境描述: 四周有閃爍位元、資料脈衝與高速訊號流。"
        "任務目標: 跟上資料傳遞，理解記憶體、位元與訊號穩定的重要性，找到夢境出口。"
        "結尾必須是: 就在這一刻..."
    ),
}

LOOP_KEYWORDS: dict[int, str] = {
    1: (
        "開頭是: 小廖在課堂上昏昏欲睡，下一秒竟站在巨大的晶圓表面。"
        "環境描述: 銀白色紋路延伸到遠方，空氣中有微弱藍光。"
        "結尾必須是: 就在這一刻..."
    ),
    2: (
        "開頭是: 他低頭一看，腳下的格線像電路，一道道紋路正微微發亮。"
        "心理描述: 緊張又好奇。"
        "結尾必須是: 就在這一刻..."
    ),
    3: (
        "開頭是: 前方浮現一道發光說明，提醒這裡的一切都與矽和電子有關。"
        "任務描述: 小廖必須繼續往前，理解這場夢想教他的知識。"
        "結尾必須是: 就在這一刻..."
    ),
    4: (
        "開頭是: 四周牆面映出電子流動的軌跡，像在示範看不見的微觀世界。"
        "身體描述: 小廖屏住呼吸。"
        "結尾必須是: 就在這一刻..."
    ),
    5: (
        "開頭是: 他看見前方有一扇標著能帶與導電的光門。"
        "心理描述: 覺得自己好像正在考試，但又像在闖關。"
        "結尾必須是: 就在這一刻..."
    ),
    6: (
        "開頭是: 小廖繼續前進，沿途看見一道道像曝光、蝕刻與摻雜的製程光影。"
        "環境描述: 有規律的機械聲此起彼落。"
        "結尾必須是: 就在這一刻..."
    ),
    7: (
        "開頭是: 一塊透明面板浮現，像在提示晶片不是憑空出現，而是經過許多精密步驟。"
        "心理描述: 他開始覺得這場夢不只是亂想。"
        "結尾必須是: 就在這一刻..."
    ),
    8: (
        "開頭是: 前方道路越來越亮，像是通往更深層的核心區。"
        "身體描述: 小廖加快腳步。"
        "結尾必須是: 就在這一刻..."
    ),
    9: (
        "開頭是: 他遠遠看見一座發光閘門，上面寫著下一區將測試資料與記憶。"
        "心理描述: 又驚又期待。"
        "結尾必須是: 就在這一刻..."
    ),
    10: (
        "開頭是: 小廖終於抵達章節盡頭，眼前的核心門緩緩打開。"
        "轉場描述: 門後傳來像脈衝一樣規律的聲音。"
        "結尾必須是: 他深吸一口氣，走了進去。"
    ),
    11: (
        "開頭是: 穿過大門後，小廖發現自己站在由無數位元平台組成的空間。"
        "環境描述: 黑色背景中漂浮著藍白色的 0 和 1。"
        "結尾必須是: 就在這一刻..."
    ),
    12: (
        "開頭是: 平台之間有資料光流不斷穿梭，像整個系統都在高速思考。"
        "心理描述: 小廖不敢分心。"
        "結尾必須是: 就在這一刻..."
    ),
    13: (
        "開頭是: 一道機械聲提醒他，資訊若要被保存，就必須先被正確寫入。"
        "任務描述: 小廖得跟上資料節奏，找到出口。"
        "結尾必須是: 就在這一刻..."
    ),
    14: (
        "開頭是: 四周突然出現像記憶體陣列般整齊排列的儲存格。"
        "環境描述: 每個格子都在明暗之間切換。"
        "結尾必須是: 就在這一刻..."
    ),
    15: (
        "開頭是: 他聽見遠方傳來急促脈衝聲，像時鐘訊號在催促所有資料同步前進。"
        "心理描述: 壓力逐漸上升。"
        "結尾必須是: 就在這一刻..."
    ),
    16: (
        "開頭是: 有些通道開始出現閃爍與抖動，像是雜訊正在干擾訊號。"
        "心理描述: 小廖提醒自己必須保持專注。"
        "結尾必須是: 就在這一刻..."
    ),
    17: (
        "開頭是: 前方出現最後一段資料走廊，牆面寫著穩定、速度與正確。"
        "身體描述: 小廖越走越快。"
        "結尾必須是: 就在這一刻..."
    ),
    18: (
        "開頭是: 他終於看見出口，但出口前仍有不斷變化的位元與資料流阻擋。"
        "心理描述: 只想趕快通過最後考驗。"
        "結尾必須是: 就在這一刻..."
    ),
    19: (
        "開頭是: 出口上方浮現一句話，寫著懂原理的人，才能真正離開這裡。"
        "心理描述: 小廖忽然意識到，這場夢像是在幫他複習。"
        "結尾必須是: 就在這一刻..."
    ),
    20: (
        "開頭是: 小廖站在夢境出口前，四周的光芒開始迅速收束。"
        "轉場描述: 他感覺耳邊傳來老師的聲音，夢境即將結束。"
        "結尾必須是: 突然，一切都亮了起來。"
    ),
}


def chapter_for_loop(loop_id: int) -> int:
    if 1 <= loop_id <= 10:
        return 1
    return 2


def build_loop_prompt(loop_id: int) -> str:
    chapter = chapter_for_loop(loop_id)
    prompt = CHAPTER_PROMPTS.get(chapter, CHAPTER_PROMPTS[1])
    keywords = LOOP_KEYWORDS.get(loop_id, "")
    return f"{prompt}\n{keywords}".strip()


def build_keywords_prompt(chapter: int, keywords: str) -> str:
    prompt = CHAPTER_PROMPTS.get(chapter, CHAPTER_PROMPTS[1])
    return f"{prompt}\n{keywords.strip()}".strip()


def build_chapter_prompt(chapter: int) -> str:
    keywords = CHAPTER_KEYWORDS.get(chapter, CHAPTER_KEYWORDS[1])
    return build_keywords_prompt(chapter=chapter, keywords=keywords)


class StoryTeller:
    """Domain rules for chapter switching and story context generation."""

    def __init__(self, fallback_by_chapter: dict[int, str] | None = None):
        self._fallback_by_chapter = fallback_by_chapter or {
            1: "小廖在半導體夢境中踏上晶圓表面，朝著發光的製程區繼續前進。",
            2: "小廖穩住心神，在記憶體與資料脈衝交錯的核心區繼續前行。",
        }

    def sync_chapter(self, chapter_id: str | None, payload: Mapping[str, Any]) -> str:
        current = resolve_chapter(chapter_id)
        if payload.get("reset_chapter"):
            return "chapter-1"
        if payload.get("advance_chapter"):
            return f"chapter-{min(2, current + 1)}"
        return chapter_id or "chapter-1"

    def build_story_context(self, chapter_id: str | None, payload: Mapping[str, Any]) -> dict[str, Any]:
        chapter = resolve_chapter(chapter_id)
        prompt: str | None
        if payload.get("prompt"):
            prompt = str(payload["prompt"]).strip()
        elif payload.get("loop_id") is not None:
            prompt = build_loop_prompt(int(payload["loop_id"]))
        else:
            prompt = build_chapter_prompt(chapter)

        return {
            "chapter": chapter,
            "prompt": prompt,
            "template_key": str(payload.get("template_key", f"chapter-{chapter}_story")),
            "tone": "adventure",
        }

    def to_story_result(
        self,
        *,
        chapter: int,
        payload: Mapping[str, Any],
        generated_story: str | None,
    ) -> StoryResult:
        template_key = str(payload.get("template_key", f"chapter-{chapter}_story"))
        final_story = generated_story or self._fallback_by_chapter.get(
            chapter,
            self._fallback_by_chapter[1],
        )
        return StoryResult(
            story_segment=final_story,
            tone="adventure",
            template_key=template_key,
        )