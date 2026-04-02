"""Flask application package entrypoints."""

from flask import Flask
from flask_cors import CORS

from app.config import get_config
from app.routes import edge_bp, events_bp, game_bp, llm_bp, story_bp, system_bp
from app.websocket import init_websocket


def create_app():
    """Create and configure the Flask application and Socket.IO server."""
    app = Flask(__name__)
    config = get_config()

    CORS(app, resources={r"/api/*": {"origins": config.cors_origins}})
    CORS(app, resources={r"/edge/*": {"origins": config.cors_origins}})

    app.register_blueprint(system_bp)
    app.register_blueprint(game_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(llm_bp)
    app.register_blueprint(story_bp)
    app.register_blueprint(edge_bp)

    socketio = init_websocket(app)
    return app, socketio


__all__ = ["create_app"]
