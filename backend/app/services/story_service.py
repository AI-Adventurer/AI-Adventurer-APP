from __future__ import annotations

from app.models import StoryResult
from app.services.state_store import store


class StoryService:
    _fallback_templates = {
        "success": "You moved at the perfect moment and break through the obstacle.",
        "fail": "The challenge slips away, but your journey continues.",
        "pending": "A new challenge emerges in front of you.",
    }

    def generate(self, payload: dict) -> StoryResult:
        result_key = str(payload.get("event_result", "pending"))
        template_key = str(payload.get("template_key", f"default_{result_key}"))

        story = StoryResult(
            story_segment=self._fallback_templates.get(
                result_key,
                self._fallback_templates["pending"],
            ),
            tone="adventure",
            template_key=template_key,
        )
        store.set_story(story)
        return story

    def current(self) -> StoryResult:
        return store.get_story()


story_service = StoryService()
