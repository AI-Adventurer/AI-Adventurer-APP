from flask import Flask
from flask_cors import CORS

from app.config import get_config
from app.middleware.error_handlers import register_error_handlers
from app.routes import register_blueprints
from app.utils.logger import configure_logging


def create_app() -> Flask:
    """Application factory for backend service."""
    config = get_config()
    configure_logging(config.log_level)

    app = Flask(__name__)
    app.config.from_mapping(config.to_flask_mapping())

    CORS(
        app,
        resources={r"/api/.*": {"origins": config.cors_origins}},
        supports_credentials=True,
    )

    register_blueprints(app)
    register_error_handlers(app)

    return app
