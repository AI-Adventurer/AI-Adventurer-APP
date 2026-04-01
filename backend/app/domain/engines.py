from __future__ import annotations

from random import choice
from time import time
from typing import Any
from uuid import uuid4

from app.models import EventRecord, GameState

EVENTS: list[dict[str, Any]] = [
    # Chapter 1: 晶圓與製程教室夢境
    {
        "id": "event_energy_barrier",
        "chapter": 1,
        "text": "前方的能階障壁突然升高，你必須一口氣跨過電子躍遷門檻！",
        "required_action": "jump",
        "time_limit": 10.0,
        "success_text": "你成功越過能階障壁！你想起電子若獲得足夠能量，就能躍遷到更高能階，這正是半導體中能帶概念的基礎。",
        "fail_text": "你沒能跨過能階障壁，被反彈了回來！你這才明白，電子若能量不足，就無法完成躍遷，材料導電特性也會受到限制。",
        "effects": {"on_success": {"hp": 0, "score": 10}, "on_fail": {"hp": -1, "score": -10}},
    },
    {
        "id": "event_wafer_conveyor",
        "chapter": 1,
        "text": "一片發亮的晶圓正沿著傳送軌道快速滑走，你得立刻追上製程節拍！",
        "required_action": "run_forward",
        "time_limit": 10.0,
        "success_text": "你成功追上晶圓！你理解到晶圓製造是連續流程，從氧化、曝光到蝕刻，每一步都要緊密銜接，良率才會穩定。",
        "fail_text": "你慢了一步，晶圓滑出了工作區！你意識到製程若節拍失準，不只效率下降，還可能造成整批晶片報廢。",
        "effects": {"on_success": {"hp": 0, "score": 10}, "on_fail": {"hp": -1, "score": -10}},
    },
    {
        "id": "event_laser_scan",
        "chapter": 1,
        "text": "曝光機的雷射掃描線朝你橫向掠來，必須立刻壓低身體！",
        "required_action": "crouch",
        "time_limit": 10.0,
        "success_text": "你順利躲過雷射掃描！你想到微影製程會把電路圖案轉移到晶圓上，解析度越高，就越能做出更精細的元件。",
        "fail_text": "你被掃描線擦中，視野一陣發白！你這才記住，微影對準若不精確，電路圖形就可能偏移，影響晶片功能。",
        "effects": {"on_success": {"hp": 0, "score": 10}, "on_fail": {"hp": -1, "score": -10}},
    },
    {
        "id": "event_doping_gate",
        "chapter": 1,
        "text": "摻雜閘門卡住了離子束路徑，你必須出手把控制板推回定位！",
        "required_action": "push",
        "time_limit": 10.0,
        "success_text": "你成功推正控制板！你明白摻雜就是在矽中加入少量雜質，藉此改變載子濃度，形成 N 型或 P 型半導體。",
        "fail_text": "你來不及推回控制板，離子束散亂四射！你記住了，摻雜條件若失控，元件電性就可能偏差，影響整體電路表現。",
        "effects": {"on_success": {"hp": 0, "score": 10}, "on_fail": {"hp": -1, "score": -10}},
    },

    # Chapter 2: 記憶體與訊號世界夢境
    {
        "id": "event_bit_jump",
        "chapter": 2,
        "text": "前方的位元平台忽然斷開，只剩一條窄窄的資料通道，你得立刻跳過去！",
        "required_action": "jump",
        "time_limit": 10.0,
        "success_text": "你成功跳到下一個位元平台！你想到數位電路常以 0 與 1 表示資訊，穩定地分辨兩種狀態，正是電腦運算的核心。",
        "fail_text": "你踩空跌入資料縫隙！你這才體會到，若訊號狀態不夠明確，位元判讀就可能出錯，系統也會變得不可靠。",
        "effects": {"on_success": {"hp": 0, "score": 10}, "on_fail": {"hp": -1, "score": -10}},
    },
    {
        "id": "event_signal_stream",
        "chapter": 2,
        "text": "一串高速資料脈衝從匯流道前方流逝，你得向前衝才能跟上訊號時序！",
        "required_action": "run_forward",
        "time_limit": 10.0,
        "success_text": "你順利跟上資料脈衝！你理解到數位系統講究時序同步，資料若能在正確時刻抵達，就能被穩定讀取與寫入。",
        "fail_text": "你被甩在脈衝後方，訊號瞬間消失！你明白了，若時序錯開，就算資料本身正確，也可能在電路中被讀錯。",
        "effects": {"on_success": {"hp": 0, "score": 10}, "on_fail": {"hp": -1, "score": -10}},
    },
    {
        "id": "event_noise_wave",
        "chapter": 2,
        "text": "雜訊波從記憶體陣列上方擴散而來，你必須立刻蹲下，避開干擾區！",
        "required_action": "crouch",
        "time_limit": 10.0,
        "success_text": "你成功避開雜訊波！你想起電路中的雜訊會干擾訊號判讀，因此穩定的設計與良好的抗干擾能力非常重要。",
        "fail_text": "你被雜訊波掃中，腦中一片混亂！你這才知道，當雜訊過強時，原本清楚的 0 和 1 也可能難以分辨。",
        "effects": {"on_success": {"hp": 0, "score": 10}, "on_fail": {"hp": -1, "score": -10}},
    },
    {
        "id": "event_memory_write",
        "chapter": 2,
        "text": "記憶單元的寫入閘門即將關閉，你得立刻推動資料封包進入儲存格！",
        "required_action": "push",
        "time_limit": 10.0,
        "success_text": "你成功把資料送進記憶單元！你想到記憶體的功能就是儲存資料，而穩定的寫入與讀出能力，正是資訊系統能運作的關鍵。",
        "fail_text": "你慢了一拍，資料封包被擋在門外！你記住了，若資料無法正確寫入記憶體，就算後續電路再快，也無法取得正確內容。",
        "effects": {"on_success": {"hp": 0, "score": 10}, "on_fail": {"hp": -1, "score": -10}},
    },
]


def resolve_chapter(chapter_id: str | None) -> int:
    if not chapter_id:
        return 1

    if chapter_id.startswith("chapter-"):
        tail = chapter_id.split("chapter-", maxsplit=1)[-1]
        if tail.isdigit():
            return int(tail)

    if chapter_id.isdigit():
        return int(chapter_id)

    return 1


class GameEngine:
    """Domain rules for event judging, scoring, hp, and chapter switching."""

    EVENT_READ_GRACE_MS = 5000

    def pick_event(self, chapter_id: str | None) -> dict[str, Any]:
        chapter = resolve_chapter(chapter_id)
        candidates = [item for item in EVENTS if int(item["chapter"]) == chapter]
        if not candidates:
            candidates = [item for item in EVENTS if int(item["chapter"]) == 1]
        return dict(choice(candidates))

    def create_event_record(self, chapter_id: str | None, event_def: dict[str, Any]) -> EventRecord:
        chapter = resolve_chapter(chapter_id)
        return EventRecord(
            event_id=str(uuid4()),
            chapter=chapter,
            text=str(event_def["text"]),
            target_action=str(event_def["required_action"]),
            success_text=str(event_def["success_text"]),
            fail_text=str(event_def["fail_text"]),
            time_limit_ms=int(float(event_def["time_limit"]) * 1000),
            status="active",
        )

    def get_remaining_time_ms(self, event: EventRecord | None) -> int:
        if event is None or event.status != "active":
            return 0
        elapsed_ms = int((time() - event.created_at) * 1000)
        effective_elapsed_ms = max(0, elapsed_ms - self.EVENT_READ_GRACE_MS)
        return max(0, event.time_limit_ms - effective_elapsed_ms)

    def judge_event_result(
        self,
        event: EventRecord,
        observed_action: str | None,
        confidence: float | None = None,
        min_confidence: float = 0.55,
    ) -> str:
        elapsed_ms = int((time() - event.created_at) * 1000)
        if elapsed_ms < self.EVENT_READ_GRACE_MS:
            return "pending"

        if not observed_action:
            return "pending"
        normalized_observed = observed_action.strip().lower()
        normalized_target = event.target_action.strip().lower()

        # 只要偵測到正確動作就直接判定成功。
        if normalized_observed == normalized_target:
            return "success"

        if confidence is not None and confidence < min_confidence:
            return "pending"
        return "pending"

    def apply_result_effect(self, state: GameState, result: str) -> None:
        if result == "success":
            state.player_state.score += 10
            return

        state.player_state.hp = max(0, state.player_state.hp - 1)
        state.player_state.score = max(0, state.player_state.score - 10)

    def resolve_event(self, state: GameState, event: EventRecord, result: str, now: float | None = None) -> None:
        resolved_at = now if now is not None else time()
        state.judge_result = result
        self.apply_result_effect(state, result)
        state.story_segment = event.success_text if result == "success" else event.fail_text
        state.time_remaining_ms = 0
        event.status = "resolved"
        event.resolved_at = resolved_at

    def next_chapter_id(self, chapter_id: str | None) -> str:
        return f"chapter-{min(2, resolve_chapter(chapter_id) + 1)}"