from __future__ import annotations

from app.config import get_config


class SystemService:
    def read_public_config(self) -> dict[str, str]:
        config = get_config()
        return {
            "app_env": config.app_env,
            "api_base_url": config.api_base_url,
            "edge_gateway_url": config.edge_gateway_url,
            "llm_model": config.llm_model,
        }


system_service = SystemService()
