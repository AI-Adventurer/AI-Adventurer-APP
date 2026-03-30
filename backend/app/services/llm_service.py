from app.config import get_config
from app.integrations import OllamaClient


_client = OllamaClient()


def chat(payload: dict) -> tuple[dict[str, str] | None, dict[str, object] | None]:
    message = str(payload.get("message", "")).strip()
    raw_messages = payload.get("messages")
    message_history: list[dict[str, str]] = []
    if isinstance(raw_messages, list):
        for item in raw_messages:
            if not isinstance(item, dict):
                continue
            role = str(item.get("role", "")).strip().lower()
            content = str(item.get("content", "")).strip()
            if role not in {"system", "user", "assistant"}:
                continue
            if not content:
                continue
            message_history.append({"role": role, "content": content})

    if not message and not message_history:
        return None, {
            "code": "missing_input",
            "status_code": 422,
            "message": "Field 'message' or 'messages' is required.",
            "details": {"missing": ["message", "messages"]},
        }

    model = payload.get("model")
    selected_model = str(model).strip() if model else get_config().llm_model
    if not selected_model:
        return None, {
            "code": "invalid_model",
            "status_code": 422,
            "message": "Field 'model' cannot be empty.",
            "details": {"field": "model"},
        }

    system_prompt = payload.get("system_prompt")
    if system_prompt is not None:
        selected_system_prompt = str(system_prompt).strip() or None
    else:
        selected_system_prompt = get_config().llm_system_prompt or None

    reply, _upstream_error = _client.chat(
        prompt=message,
        model=selected_model,
        system_prompt=selected_system_prompt,
        messages=message_history or None,
    )
    if not reply:
        return None, {
            "code": "llm_unavailable",
            "status_code": 503,
            "message": "LLM service unavailable.",
        }

    return (
        {
            "reply": reply,
            "model": selected_model,
        },
        None,
    )
