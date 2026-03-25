from app.domain import build_keywords_prompt, build_loop_prompt, resolve_chapter
from app.integrations import ollama_client
from app.models import StoryResult
from app.services.state_store import store


STRICT_CHAPTER_GUARD = (
    "嚴格規則: 你只能描述指定章節的場景與事件，不得引入其他章節地景、角色或情境。"
    "只輸出劇情文字，不要解釋規則。"
)


class StoryService:
    _fallback_templates = {
        "success": "You moved at the perfect moment and break through the obstacle.",
        "fail": "The challenge slips away, but your journey continues.",
        "pending": "A new challenge emerges in front of you.",
    }

    def generate(self, payload: dict) -> StoryResult:
        result_key = str(payload.get("event_result", "pending"))
        template_key = str(payload.get("template_key", f"default_{result_key}"))

        # 支援三種故事來源：手動 prompt、loop_id、關鍵詞/章節自動構建。
        prompt = self._build_prompt(payload)
        generated_story = None
        if prompt:
            model = payload.get("model")
            generated_story = ollama_client.chat(prompt=prompt, model=str(model) if model else None)

        story = StoryResult(
            story_segment=generated_story
            or self._fallback_templates.get(result_key, self._fallback_templates["pending"]),
            tone="adventure",
            template_key=template_key,
        )
        store.set_story(story)
        return story

    def current(self) -> StoryResult:
        return store.get_story()

    def _build_prompt(self, payload: dict) -> str | None:
        if payload.get("prompt"):
            return str(payload["prompt"]).strip()

        if payload.get("loop_id") is not None:
            loop_id = int(payload["loop_id"])
            return build_loop_prompt(loop_id)

        # 預設策略：嚴格依據目前章節產生劇情，不允許跨章節敘事。
        chapter = self._resolve_story_chapter(payload)
        keywords = str(payload.get("keywords") or self._build_default_keywords(payload, chapter))
        return self._build_strict_chapter_prompt(chapter=chapter, keywords=keywords)

    def _build_default_keywords(self, payload: dict, chapter: int) -> str:
        result = str(payload.get("event_result", "pending"))
        target_action = store.get_game_state().target_action or "未知"
        return (
            f"事件結果: {result}。"
            f"章節識別: chapter-{chapter}。"
            f"當前目標動作: {target_action}。"
            "請延續該章節世界觀，產出 1-2 句精簡敘事。"
        )

    def _resolve_story_chapter(self, payload: dict) -> int:
        chapter_in_payload = payload.get("chapter")
        if chapter_in_payload is not None:
            try:
                return int(chapter_in_payload)
            except (TypeError, ValueError):
                pass

        key = str(payload.get("template_key", ""))
        if "chapter-1" in key or key.startswith("chapter1"):
            return 1
        if "chapter-2" in key or key.startswith("chapter2"):
            return 2
        if "chapter-3" in key or key.startswith("chapter3"):
            return 3

        return resolve_chapter(store.get_game_state().chapter_id)

    def _build_strict_chapter_prompt(self, chapter: int, keywords: str) -> str:
        strict_guard = f"{STRICT_CHAPTER_GUARD} 目前章節: chapter-{chapter}。"
        merged_keywords = f"{keywords.strip()}\n{strict_guard}"
        return build_keywords_prompt(chapter=chapter, keywords=merged_keywords)


story_service = StoryService()
