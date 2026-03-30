from __future__ import annotations

from typing import Any, Mapping

from app.models import StoryResult

from .engines import resolve_chapter


CHAPTER_PROMPTS: dict[int, str] = {
    1: (
        "這個對話就負責幫我產出動作冒險遊戲劇情文字敘述，目前情境: 叢林中，"
        "只需要輸出遊戲劇情敘述就好，不需要其他回覆。"
        "我會提供遊戲背景與關鍵詞，請完整化成精簡敘述，並保留我提供的關鍵資訊。"
    ),
    2: (
        "這個對話就負責幫我產出動作冒險遊戲劇情文字敘述，目前情境: 叢林中河流的橋上，"
        "只需要輸出遊戲劇情敘述就好，不需要其他回覆。"
        "我會提供遊戲背景與關鍵詞，請完整化成精簡敘述，並保留我提供的關鍵資訊。"
    ),
    3: (
        "這個對話就負責幫我產出動作冒險遊戲劇情文字敘述，目前情境: 洞穴追逐，"
        "只需要輸出遊戲劇情敘述就好，不需要其他回覆。"
        "我會提供遊戲背景與關鍵詞，請完整化成精簡敘述，並保留我提供的關鍵資訊。"
    ),
}

CHAPTER_KEYWORDS: dict[int, str] = {
    1: "開頭是: 你現在獨自探索叢林。環境描述: 潮濕、又餓又渴。任務目標: 找到傳說中藏有寶藏的洞穴。結尾必須是: 就在這一刻...",
    2: "開頭是: 你踏上叢林河流的大木橋。環境描述: 水聲湍急、橋面濕滑。任務目標: 穩住步伐通過橋段。結尾必須是: 就在這一刻...",
    3: "開頭是: 你衝入昏暗洞穴。環境描述: 回音急促、壓迫感強烈。任務目標: 在追逐中抵達終點。結尾必須是: 突然...",
}

LOOP_KEYWORDS: dict[int, str] = {
    1: "開頭是: 你現在獨自探索叢林。環境描述: 潮濕、又餓又渴。任務目標: 找到傳說中藏有寶藏的洞穴。結尾必須是: 就在這一刻...",
    2: "開頭是: 你繼續向前步行。心情描述: 驚訝、緊張。結尾必須是: 就在這一刻...",
    3: "開頭是: 你意識到這是個充滿陷阱的叢林。環境描述: 尖銳的鳥叫聲、各種不祥的聲響。結尾必須是: 此時...",
    4: "開頭是: 你繼續向前步行。身體描述: 驚訝、緊張。結尾必須是: 就在這一刻...",
    5: "開頭是: 你聽到前方有河流的聲音。身體描述: 興奮、加快腳步前行。結尾必須是: 並且看到有個大木橋可以過河，突然...",
    6: "開頭是: 你終於抵達大木橋上。身體描述: 氣喘吁吁。結尾必須是: 不敢懈怠，持續前行。突然...",
    7: "開頭是: 腳下是湍急的流水聲。心理描述: 處境還是相當危險。結尾必須是: 提心吊膽地前行。就在這一刻...",
    8: "開頭是: 你依然不停歇地往前。身體描述: 肌肉痠痛。結尾必須是: 就在這一刻...",
    9: "開頭是: 思念著傳說中藏有寶藏的洞穴。身體描述: 往前走。環境描述: 水聲猛烈。結尾必須是: 突然...",
    10: "開頭是: 你停下腳步。身體描述: 喘口氣。結尾必須是: 就在這一刻...",
    11: "開頭是: 你發現橋的盡頭就在不遠處。身體描述: 腳步加速。結尾必須是: 但發現身後突然有巨石朝你的方向滾來!",
    12: "你終於下橋，往前走了幾步發現前方有個突兀的物體，似乎就是傳說中的洞穴，於是你打開手電筒，進入洞穴。",
    13: "走了幾步後突然發現後面有人拿著寶劍在追你!",
    14: "開頭是: 你拔腿狂奔。心理描述: 恐懼。結尾必須是: 就在這一刻...",
    15: "開頭是: 你感受到身後的腳步聲愈來愈近。心理描述: 腎上腺素飆升。結尾必須是: 突然...",
    16: "開頭是: 你強迫自己不要回頭看。心理描述: 焦慮。結尾必須是: 就在這一刻...",
    17: "開頭是: 你試著調整呼吸保持速度。身體描述: 肺部灼熱。結尾必須是: 突然...",
    18: "開頭是: 你聽到金屬摩擦聲。心理描述: 極度緊繃。結尾必須是: 就在這時...",
    19: "開頭是: 你的速度加快。心理描述: 壓力倍增。結尾必須是: 突然...",
    20: "開頭是: 覺得隨時會被抓住。心理描述: 心跳狂亂。結尾必須是: 就在這一刻...",
    21: "開頭是: 你緊盯著前方昏暗的洞穴道路。心理描述: 高度集中。結尾必須是: 突然...",
    22: "開頭是: 你咬緊牙關。身體描述: 勉強維持速度。結尾必須是: 就在這一刻...",
    23: "開頭是: 你聽到身後那人的喘息聲。心理描述: 恐懼到極點。結尾必須是: 突然...",
    24: "你抵達了洞穴的終點，只能停下腳步並轉身準備與未知的敵人戰鬥，但他在距離你一公尺的地方停下腳步。",
    25: "在沉默一分鐘之後，他告訴你是第一位成功到達傳說中的洞穴的終點的人，而且你意識到傳說中的寶藏就是他手上的那把寶劍。",
    26: "你提供兩個選擇: 不取走寶劍，離開並保證你回程的安全；或取走寶劍，但你的生命也將停留在此地。",
    27: "請選擇: 活著離開(跑步)；獲得寶劍，以生命為代價達成你一輩子的夢想(不動)。",
}


def chapter_for_loop(loop_id: int) -> int:
    if 1 <= loop_id <= 5:
        return 1
    if 6 <= loop_id <= 12:
        return 2
    return 3


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
            1: "你屏住呼吸，繼續在叢林深處探索。",
            2: "你穩住步伐，在危險的橋面上繼續前行。",
            3: "你咬牙衝刺，在洞穴追逐中尋找生機。",
        }

    def sync_chapter(self, chapter_id: str | None, payload: Mapping[str, Any]) -> str:
        current = resolve_chapter(chapter_id)
        if payload.get("reset_chapter"):
            return "chapter-1"
        if payload.get("advance_chapter"):
            return f"chapter-{min(3, current + 1)}"
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
