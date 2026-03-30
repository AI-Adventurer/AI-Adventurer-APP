from __future__ import annotations

import json
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import get_config
from app.utils import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class OllamaMessage:
    role: str
    content: str


class OllamaClient:
    def chat(
        self,
        prompt: str,
        model: str | None = None,
        system_prompt: str | None = None,
        messages: list[dict[str, str]] | None = None,
    ) -> tuple[str | None, dict[str, object] | None]:
        config = get_config()
        endpoint = f"{config.ollama_base_url.rstrip('/')}/api/chat"

        request_messages: list[dict[str, str]] = []
        if messages:
            for item in messages:
                role = str(item.get("role", "")).strip().lower()
                content = str(item.get("content", "")).strip()
                if role not in {"system", "user", "assistant"}:
                    continue
                if not content:
                    continue
                request_messages.append({"role": role, "content": content})

        # 系統級 prompt 優先級最高：若沒有 system 訊息則補在最前面。
        if system_prompt:
            has_system_message = any(msg.get("role") == "system" for msg in request_messages)
            if not has_system_message:
                request_messages.insert(0, {"role": "system", "content": system_prompt})

        if not request_messages:
            request_messages.append({"role": "user", "content": prompt})
        elif not any(msg.get("role") == "user" for msg in request_messages):
            request_messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model or config.llm_model,
            "messages": request_messages,
            "stream": False,
            "think": False,
        }

        request = Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=config.ollama_timeout_s) as response:
                body = response.read().decode("utf-8")
        except HTTPError as exc:
            logger.warning("Ollama HTTP error: status=%s", exc.code)
            return None, {
                "code": "upstream_http_error",
                "http_status": exc.code,
            }
        except URLError as exc:
            logger.warning("Ollama URL error: %s", exc.reason)
            return None, {
                "code": "upstream_connection_error",
                "reason": str(exc.reason),
            }
        except TimeoutError:
            logger.warning("Ollama request timeout")
            return None, {"code": "upstream_timeout"}

        try:
            decoded = json.loads(body)
        except json.JSONDecodeError:
            logger.warning("Ollama returned invalid JSON")
            return None, {"code": "upstream_invalid_response"}

        message = decoded.get("message", {})
        content = message.get("content")
        if not isinstance(content, str):
            return None, {"code": "upstream_invalid_response"}

        cleaned = content.strip()
        if not cleaned:
            # 即使 think:false，qwen3.5 有時仍會返回空 content
            # 此時使用簡短的預設回應而不是 thinking 內容（thinking 是推理過程，不適合作故事）
            logger.warning("Ollama returned empty content with think:false; using fallback template")
            return None, {"code": "upstream_empty_response"}

        return cleaned, None
