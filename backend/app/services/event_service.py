from __future__ import annotations

from uuid import uuid4

from app.models import EdgeInputEvent, EventRecord
from app.services.state_store import store


class EventService:
    def ingest_edge_input(self, payload: dict) -> EdgeInputEvent:
        event = EdgeInputEvent(
            timestamp=float(payload["timestamp"]),
            action_scores=dict(payload["action_scores"]),
            stable_action=payload.get("stable_action"),
        )
        store.append_edge_input(event)
        return event

    def create_demo_event(self, target_action: str, time_limit_ms: int = 10000) -> EventRecord:
        event = EventRecord(
            event_id=str(uuid4()),
            target_action=target_action,
            time_limit_ms=time_limit_ms,
            status="active",
        )
        store.set_current_event(event)

        state = store.get_game_state()
        state.event_id = event.event_id
        state.target_action = target_action
        state.time_remaining_ms = time_limit_ms
        state.judge_result = "pending"

        return event

    def current_event(self) -> EventRecord | None:
        return store.get_current_event()

    def history(self) -> list[EventRecord]:
        return store.get_event_history()


event_service = EventService()
