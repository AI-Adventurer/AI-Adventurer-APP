from flask import Blueprint, request

from app.services import event_service
from app.utils import failure, success

bp = Blueprint("events", __name__, url_prefix="/api/events")


@bp.post("/input")
def ingest_event_input():
    payload = request.get_json(silent=True) or {}

    required = ["timestamp", "action_scores"]
    missing = [key for key in required if key not in payload]
    if missing:
        return failure("Missing required fields", status_code=422, details={"missing": missing})

    event = event_service.ingest_edge_input(payload)
    event_service.process_game_tick()
    return success(event.to_dict(), status_code=201)


@bp.get("/current")
def current_event():
    event = event_service.current_event()
    if event is None:
        return success(None)
    return success(event.to_dict())


@bp.get("/history")
def history():
    items = [item.to_dict() for item in event_service.history()]
    return success(items)
