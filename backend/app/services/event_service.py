from time import time

from app.domain import GameEngine
from app.models import EventRecord
from app.services.state_store import store


RESULT_DISPLAY_SECONDS = 5.0
STORY_DISPLAY_SECONDS = 10.0
_engine = GameEngine()
_pending_event_spawn_after = 0.0


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


def process_game_tick() -> None:
    state = store.get_game_state()
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
            from app.services import story_service

            state.chapter_id = _engine.next_chapter_id(state.chapter_id)
            story_service.generate(
                {},
                sync_to_game_view=True,
            )

            current.status = "completed"
            state.event_id = None
            state.target_action = None
            state.time_remaining_ms = 0
            state.judge_result = "pending"
            _schedule_event_spawn(STORY_DISPLAY_SECONDS)


def current_event() -> EventRecord | None:
    return store.get_current_event()


def history() -> list[EventRecord]:
    return store.get_event_history()
