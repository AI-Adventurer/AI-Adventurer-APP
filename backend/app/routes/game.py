from __future__ import annotations

from flask import Blueprint, request

from app.services.event_service import event_service
from app.services.state_store import store
from app.utils.responses import success

game_bp = Blueprint("game", __name__, url_prefix="/api/game")


@game_bp.post("/start")
def start_game():
    state = store.get_game_state()
    state.story_segment = "The adventure begins."
    return success(
        {
            "message": "Game lifecycle endpoint is ready. Core game logic is not enabled yet.",
            "game_state": state.to_dict(),
        }
    )


@game_bp.post("/reset")
def reset_game():
    store.reset()
    return success({"message": "Game state reset."})


@game_bp.get("/state")
def game_state():
    return success(store.get_game_state().to_dict())


@game_bp.post("/demo-event")
def demo_event():
    payload = request.get_json(silent=True) or {}
    target_action = str(payload.get("target_action", "stand"))
    time_limit_ms = int(payload.get("time_limit_ms", 10000))

    event = event_service.create_demo_event(target_action=target_action, time_limit_ms=time_limit_ms)
    return success(
        {
            "message": "Demo event injected.",
            "event": event.to_dict(),
            "game_state": store.get_game_state().to_dict(),
        },
        status_code=201,
    )
