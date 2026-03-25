from threading import Lock
from time import time

from app.models import EdgeInputEvent, EventRecord, GameState, StoryResult


class InMemoryStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._edge_events: list[EdgeInputEvent] = []
        self._event_history: list[EventRecord] = []
        self._current_event: EventRecord | None = None
        self._pending_event_spawn = False
        self._pending_event_spawn_after = 0.0
        self._current_story = StoryResult(
            story_segment="Adventure has not started yet.",
            tone="adventure",
            template_key="default_idle",
        )
        self._game_state = GameState()

    def append_edge_input(self, event: EdgeInputEvent) -> None:
        with self._lock:
            self._edge_events.append(event)
            self._edge_events = self._edge_events[-100:]

    def latest_edge_input(self) -> EdgeInputEvent | None:
        with self._lock:
            if not self._edge_events:
                return None
            return self._edge_events[-1]

    def set_current_event(self, event: EventRecord) -> None:
        with self._lock:
            self._current_event = event
            self._event_history.append(event)
            self._event_history = self._event_history[-200:]

    def get_current_event(self) -> EventRecord | None:
        with self._lock:
            return self._current_event

    def schedule_event_spawn(self, delay_s: float = 0.0) -> None:
        with self._lock:
            self._pending_event_spawn = True
            self._pending_event_spawn_after = time() + max(0.0, delay_s)

    def should_spawn_event(self) -> bool:
        with self._lock:
            return self._pending_event_spawn and time() >= self._pending_event_spawn_after

    def get_event_spawn_remaining_ms(self) -> int:
        with self._lock:
            if not self._pending_event_spawn:
                return 0
            return max(0, int((self._pending_event_spawn_after - time()) * 1000))

    def clear_event_spawn(self) -> None:
        with self._lock:
            self._pending_event_spawn = False
            self._pending_event_spawn_after = 0.0

    def get_event_history(self) -> list[EventRecord]:
        with self._lock:
            return list(self._event_history)

    def set_story(self, story: StoryResult) -> None:
        with self._lock:
            self._current_story = story
            self._game_state.story_segment = story.story_segment

    def get_story(self) -> StoryResult:
        with self._lock:
            return self._current_story

    def get_game_state(self) -> GameState:
        with self._lock:
            return self._game_state

    def reset(self) -> None:
        with self._lock:
            self._edge_events.clear()
            self._event_history.clear()
            self._current_event = None
            self._pending_event_spawn = False
            self._pending_event_spawn_after = 0.0
            self._current_story = StoryResult(
                story_segment="Adventure has not started yet.",
                tone="adventure",
                template_key="default_idle",
            )
            self._game_state = GameState()


store = InMemoryStore()
