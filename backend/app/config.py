from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AppConfig:
    app_env: str
    host: str
    port: int
    log_level: str
    api_base_url: str
    edge_gateway_url: str
    llm_model: str
    cors_origins: list[str]

    def to_flask_mapping(self) -> dict[str, object]:
        return {
            "ENV": self.app_env,
            "JSON_AS_ASCII": False,
            "JSON_SORT_KEYS": False,
        }


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def get_config() -> AppConfig:
    app_env = os.getenv("APP_ENV", "development")
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    api_base_url = os.getenv("API_BASE_URL", f"http://localhost:{port}")
    edge_gateway_url = os.getenv("EDGE_GATEWAY_URL", "ws://localhost:9000/events")
    llm_model = os.getenv("LLM_MODEL", "gpt-4.1-mini")
    cors_origins = _split_csv(
        os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        )
    ) or ["http://localhost:5173", "http://127.0.0.1:5173"]

    return AppConfig(
        app_env=app_env,
        host=host,
        port=port,
        log_level=log_level,
        api_base_url=api_base_url,
        edge_gateway_url=edge_gateway_url,
        llm_model=llm_model,
        cors_origins=cors_origins,
    )
