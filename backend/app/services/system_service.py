from app.config import get_config


def read_public_config() -> dict[str, str]:
    config = get_config()
    return {
        "app_env": config.app_env,
        "api_base_url": config.api_base_url,
        "edge_gateway_url": config.edge_gateway_url,
        "ollama_base_url": config.ollama_base_url,
        "llm_model": config.llm_model,
    }
