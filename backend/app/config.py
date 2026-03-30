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
    ollama_base_url: str
    ollama_timeout_s: int
    llm_model: str
    llm_system_prompt: str
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
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_timeout_s = int(os.getenv("OLLAMA_TIMEOUT_S", "120"))
    llm_model = os.getenv("LLM_MODEL", "qwen3.5:0.8B")
    llm_system_prompt = os.getenv(
        "LLM_SYSTEM_PROMPT",
        "你是冒險遊戲敘事助手，輸出內容請盡量通俗易懂，適合直接呈現給玩家閱讀。"
        "請只輸出可直接顯示給玩家的繁體中文敘事內容，避免解釋、條列與額外前後文。"
        "輸出字數請控制在100字以內。",
    ).strip()
    cors_origins = _split_csv(os.getenv("CORS_ORIGINS", "*")) or ["*"]

    return AppConfig(
        app_env=app_env,
        host=host,
        port=port,
        log_level=log_level,
        api_base_url=api_base_url,
        edge_gateway_url=edge_gateway_url,
        ollama_base_url=ollama_base_url,
        ollama_timeout_s=ollama_timeout_s,
        llm_model=llm_model,
        llm_system_prompt=llm_system_prompt,
        cors_origins=cors_origins,
    )
