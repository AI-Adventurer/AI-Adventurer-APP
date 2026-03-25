from uuid import uuid4
from time import time

from app.domain import evaluate_required_action, infer_player_action, pick_event, resolve_chapter
from app.models import EdgeInputEvent, EventRecord
from app.services.state_store import store


RESULT_DISPLAY_SECONDS = 5.0
STORY_DISPLAY_SECONDS = 10.0


class EventService:
    """Central game state machine: story -> event -> result -> next story."""

    def ingest_edge_input(self, payload: dict) -> EdgeInputEvent:
        event = EdgeInputEvent(
            timestamp=float(payload["timestamp"]),
            action_scores=dict(payload["action_scores"]),
            stable_action=payload.get("stable_action"),
        )
        store.append_edge_input(event)

        current = store.get_current_event()
        if current and current.status == "active":
            player_action = infer_player_action(event.stable_action, event.action_scores)
            result = evaluate_required_action(current.target_action, player_action)
            self._resolve_current_event(result)

        return event

    def create_demo_event(self, target_action: str, time_limit_ms: int = 10000) -> EventRecord:
        state = store.get_game_state()
        chapter = resolve_chapter(state.chapter_id)
        event_text = f"前方出現障礙，你必須做出動作：{target_action}。"
        success_text = "你成功躲過危機，繼續向前推進。"
        fail_text = "你反應不及而受傷，冒險局勢更加緊張。"

        # 支援 target_action="auto"，依目前章節抽取 notebook 對應事件。
        if target_action == "auto":
            event_def = pick_event(chapter)
            event_text = str(event_def["text"])
            target_action = str(event_def["required_action"])
            success_text = str(event_def["success_text"])
            fail_text = str(event_def["fail_text"])
            time_limit_ms = int(float(event_def["time_limit"]) * 1000)

        event = EventRecord(
            event_id=str(uuid4()),
            chapter=chapter,
            text=event_text,
            target_action=target_action,
            success_text=success_text,
            fail_text=fail_text,
            time_limit_ms=time_limit_ms,
            status="active",
        )
        store.set_current_event(event)
        store.clear_event_spawn()

        # Event phase starts: expose action/timer to frontend.
        state.event_id = event.event_id
        state.target_action = target_action
        state.time_remaining_ms = time_limit_ms
        state.judge_result = "pending"
        state.story_segment = event.text

        return event

    def get_remaining_time_ms(self) -> int:
        """Return remaining time for active event phase."""
        current = store.get_current_event()
        if not current or current.status != "active":
            return 0

        elapsed_ms = int((time() - current.created_at) * 1000)
        remaining = max(0, current.time_limit_ms - elapsed_ms)
        return remaining

    def process_game_tick(self) -> None:
        """Backend-driven phase transitions and countdown updates."""
        state = store.get_game_state()
        current = store.get_current_event()
        now = time()

        self._update_story_phase_countdown(state, current)

        if (current is None or current.status == "completed") and store.should_spawn_event():
            self.create_demo_event(target_action="auto")
            current = store.get_current_event()

        if current and current.status == "active":
            remaining_ms = self.get_remaining_time_ms()
            state.time_remaining_ms = remaining_ms
            if remaining_ms <= 0:
                self._resolve_current_event("fail")
                current = store.get_current_event()

        if current and current.status == "resolved":
            if current.resolved_at is not None:
                remain = RESULT_DISPLAY_SECONDS - (now - current.resolved_at)
                state.time_remaining_ms = max(0, int(remain * 1000))
            if current.resolved_at is not None and (now - current.resolved_at) >= RESULT_DISPLAY_SECONDS:
                self._advance_after_resolution(current)

    def _update_story_phase_countdown(self, state, current: EventRecord | None) -> None:
        """Keep countdown visible while waiting for the next event spawn."""
        if (current is None or current.status == "completed") and not store.should_spawn_event():
            state.time_remaining_ms = store.get_event_spawn_remaining_ms()

    def _resolve_current_event(self, result: str) -> None:
        state = store.get_game_state()
        current = store.get_current_event()
        if not current or current.status != "active":
            return

        state.judge_result = result
        self._apply_result_effect(state, result)

        # 成敗結果使用固定文案顯示，不經 LLM。
        state.story_segment = current.success_text if result == "success" else current.fail_text

        current.status = "resolved"
        current.resolved_at = time()
        state.time_remaining_ms = 0

    def _apply_result_effect(self, state, result: str) -> None:
        if result == "success":
            state.player_state.score += 10
            return

        state.player_state.hp = max(0, state.player_state.hp - 1)
        state.player_state.score -= 10

    def _advance_after_resolution(self, current: EventRecord) -> None:
        from app.services.story_service import story_service

        state = store.get_game_state()
        chapter = min(3, resolve_chapter(state.chapter_id) + 1)
        state.chapter_id = f"chapter-{chapter}"
        result = state.judge_result if state.judge_result in {"success", "fail"} else "fail"

        keywords = (
            f"上一事件結果: {result}。"
            f"上一事件目標動作: {current.target_action}。"
            "請進入下一段劇情並保持緊張節奏。"
        )
        story_service.generate(
            {
                "chapter": chapter,
                "event_result": result,
                "template_key": f"chapter-{chapter}_{result}",
                "keywords": keywords,
            }
        )

        current.status = "completed"
        state.event_id = None
        state.target_action = None
        state.time_remaining_ms = 0
        state.judge_result = "pending"
        # 下一段劇情顯示 10 秒後才進入下一個事件。
        store.schedule_event_spawn(delay_s=STORY_DISPLAY_SECONDS)

    def current_event(self) -> EventRecord | None:
        return store.get_current_event()

    def history(self) -> list[EventRecord]:
        return store.get_event_history()


event_service = EventService()
