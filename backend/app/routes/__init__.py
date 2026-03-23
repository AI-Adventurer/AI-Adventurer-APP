from flask import Flask

from app.routes.events import events_bp
from app.routes.game import game_bp
from app.routes.story import story_bp
from app.routes.system import system_bp


def register_blueprints(app: Flask) -> None:
	app.register_blueprint(system_bp)
	app.register_blueprint(game_bp)
	app.register_blueprint(events_bp)
	app.register_blueprint(story_bp)
