from flask import Blueprint
from time import time

from app.services import event_service, store
from app.utils import success

bp = Blueprint("game", __name__, url_prefix="/api/game")

@bp.post("/start")
def start_game():
    story = event_service.start_game()
    state = store.get_game_state()
    
    server_time = time()
    event_end_time = server_time + max(0, state.time_remaining_ms) / 1000
    
    payload = state.to_dict()
    payload["event_end_time"] = event_end_time
    payload["server_time"] = server_time
    
    return success(
        {
            "message": "Game started successfully.",
            "game_state": payload,
            "story": story.to_dict(),
        }
    )


@bp.post("/reset")
def reset_game():
    event_service.reset()
    return success({"message": "Game state reset."})


@bp.get("/state")
def game_state():
    event_service.process_game_tick()
    state = store.get_game_state()
    server_time = time()
    event_end_time = server_time + max(0, state.time_remaining_ms) / 1000
    payload = state.to_dict()
    payload["event_end_time"] = event_end_time
    payload["server_time"] = server_time
    return success(payload)
