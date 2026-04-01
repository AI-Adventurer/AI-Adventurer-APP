from time import time

from app.domain import GameEngine
from app.models import EventRecord
from app.services.state_store import store


RESULT_DISPLAY_SECONDS = 5.0
STORY_DISPLAY_SECONDS = 10.0
GOOD_ENDING_STORY_COUNT = 20
_engine = GameEngine()
_pending_event_spawn_after = 0.0

GOOD_ENDING_TITLE = "好結局"
GOOD_ENDING_STORY = (
    "小廖猛然睜開眼，發現自己還坐在教室裡，老師正站在他旁邊，全班都看著他。"
    "老師皺著眉問：「那你回答我，為什麼半導體會比導體和絕緣體更適合拿來做晶片？」"
    "小廖愣了一秒，腦中卻立刻浮現夢裡的能帶、摻雜與訊號畫面。"
    "他緩緩站起來回答：「因為半導體的導電能力可以透過摻雜和外加條件控制，既能形成開關，也能處理與儲存資料，所以才是晶片設計的核心材料。」"
    "老師沉默了一下，點點頭說：「很好，至少你不是白睡。」"
    "全班笑了起來，而小廖也終於發現，剛才那場夢，真的讓他學會了東西。"
)

BAD_ENDING_TITLE = "壞結局"
BAD_ENDING_STORY = (
    "小廖驚醒時，發現老師正用力敲著他的桌面，語氣嚴厲地說：「上課睡覺就算了，連剛剛講到半導體最基本的概念都答不出來，你到底有沒有在聽？」"
    "小廖腦中一片空白，只記得夢裡那些閃爍的光和不斷失敗的關卡，卻怎麼也拼不出完整答案。"
    "老師搖搖頭，要他下課後留下來。"
    "四周同學的視線讓他臉一陣發熱，他只能低頭懊惱地想：要是剛才在夢裡再多撐一下，也許現在就答得出來了。"
)


def _finalize_game_ending() -> None:
    state = store.get_game_state()
    is_good_ending = state.player_state.hp > 0

    state.is_game_over = True
    state.ending_type = "good" if is_good_ending else "bad"
    state.ending_title = GOOD_ENDING_TITLE if is_good_ending else BAD_ENDING_TITLE
    state.ending_story = GOOD_ENDING_STORY if is_good_ending else BAD_ENDING_STORY
    state.story_segment = state.ending_story
    state.event_id = None
    state.target_action = None
    state.time_remaining_ms = 0
    state.judge_result = "pending"


def reset() -> None:
    global _pending_event_spawn_after
    store.reset()
    _pending_event_spawn_after = 0.0


def start_game():
    from app.services import story_service

    reset()
    story = story_service.generate(
        {"reset_chapter": True},
        sync_to_game_view=True,
    )
    _schedule_event_spawn(STORY_DISPLAY_SECONDS)
    store.get_game_state().time_remaining_ms = int(STORY_DISPLAY_SECONDS * 1000)
    return story


def _schedule_event_spawn(delay_s: float = 0.0) -> None:
    global _pending_event_spawn_after
    _pending_event_spawn_after = time() + max(0.0, delay_s)


def _should_spawn_event(now: float) -> bool:
    return _pending_event_spawn_after > 0 and now >= _pending_event_spawn_after


def _get_spawn_remaining_ms(now: float) -> int:
    if _pending_event_spawn_after <= 0:
        return 0
    return max(0, int((_pending_event_spawn_after - now) * 1000))


def _clear_spawn_schedule() -> None:
    global _pending_event_spawn_after
    _pending_event_spawn_after = 0.0


def create_event() -> EventRecord:
    state = store.get_game_state()
    if state.is_game_over:
        raise RuntimeError("Game already ended")

    event_def = _engine.pick_event(state.chapter_id)
    event = _engine.create_event_record(state.chapter_id, event_def)
    store.set_current_event(event)

    state.event_id = event.event_id
    state.target_action = event.target_action
    state.time_remaining_ms = event.time_limit_ms
    state.judge_result = "pending"
    state.story_segment = event.text

    _clear_spawn_schedule()
    return event


def get_remaining_time_ms() -> int:
    return _engine.get_remaining_time_ms(store.get_current_event())


def apply_observed_action(
    observed_action: str | None,
    confidence: float | None = None,
) -> bool:
    """Apply edge-detected action to the active game event.

    Returns True when the action resolves current event as success.
    """
    state = store.get_game_state()
    current = store.get_current_event()
    now = time()

    if state.is_game_over:
        return False

    if current is None or current.status != "active":
        return False

    remaining_ms = _engine.get_remaining_time_ms(current)
    state.time_remaining_ms = remaining_ms
    if remaining_ms <= 0:
        _engine.resolve_event(state, current, result="fail", now=now)
        return False

    result = _engine.judge_event_result(
        current,
        observed_action=observed_action,
        confidence=confidence,
    )
    if result != "success":
        return False

    _engine.resolve_event(state, current, result="success", now=now)
    return True


def process_game_tick() -> None:
    state = store.get_game_state()
    if state.is_game_over:
        state.time_remaining_ms = 0
        return

    current = store.get_current_event()
    now = time()

    # Service 決定何時 spawn event 與倒數顯示。
    if current is None or current.status == "completed":
        state.time_remaining_ms = _get_spawn_remaining_ms(now)
        if _should_spawn_event(now):
            create_event()
            current = store.get_current_event()

    # Domain 判斷事件是否超時失敗。
    if current and current.status == "active":
        remaining_ms = _engine.get_remaining_time_ms(current)
        state.time_remaining_ms = remaining_ms
        if remaining_ms <= 0:
            _engine.resolve_event(state, current, result="fail", now=now)
            current = store.get_current_event()

    # Service 決定何時產生下一段 story 與同步回 game view。
    if current and current.status == "resolved":
        if current.resolved_at is not None:
            remain = RESULT_DISPLAY_SECONDS - (now - current.resolved_at)
            state.time_remaining_ms = max(0, int(remain * 1000))

        if (
            current.resolved_at is not None
            and (now - current.resolved_at) >= RESULT_DISPLAY_SECONDS
        ):
            current.status = "completed"

            if state.player_state.hp <= 0 or state.story_count >= GOOD_ENDING_STORY_COUNT:
                _finalize_game_ending()
                _clear_spawn_schedule()
                return

            from app.services import story_service

            state.chapter_id = _engine.next_chapter_id(state.chapter_id)
            story_service.generate(
                {},
                sync_to_game_view=True,
            )

            state.event_id = None
            state.target_action = None
            state.time_remaining_ms = 0
            state.judge_result = "pending"
            _schedule_event_spawn(STORY_DISPLAY_SECONDS)


def current_event() -> EventRecord | None:
    return store.get_current_event()


def history() -> list[EventRecord]:
    return store.get_event_history()
