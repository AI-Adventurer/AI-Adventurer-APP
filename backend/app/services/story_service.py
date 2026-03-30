from app.config import get_config
from app.domain import StoryTeller
from app.integrations import OllamaClient
from app.models import StoryResult
from app.services.state_store import store


_client = OllamaClient()
_story_teller = StoryTeller()


def generate(
    payload: dict | None = None,
    *,
    sync_to_game_view: bool = True,
) -> StoryResult:
    payload = payload or {}
    state = store.get_game_state()
    state.chapter_id = _story_teller.sync_chapter(state.chapter_id, payload)
    context = _story_teller.build_story_context(state.chapter_id, payload)

    # 劇情只走 prompt/loop/chapter prompt，不接受事件成敗與外部關鍵字。
    prompt = context.get("prompt")
    generated_story = None
    if prompt:
        model = payload.get("model")
        system_prompt = payload.get("system_prompt")
        if system_prompt is not None:
            selected_system_prompt = str(system_prompt).strip() or None
        else:
            selected_system_prompt = get_config().llm_system_prompt or None

        generated_story, _upstream_error = _client.chat(
            prompt=str(prompt),
            model=str(model) if model else None,
            system_prompt=selected_system_prompt,
        )

    story = _story_teller.to_story_result(
        chapter=int(context["chapter"]),
        payload=payload,
        generated_story=generated_story,
    )
    store.set_story(story)
    if sync_to_game_view:
        state.story_segment = story.story_segment
    return story


def current() -> StoryResult:
    return store.get_story()
