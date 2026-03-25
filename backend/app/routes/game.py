from flask import Blueprint, request
from time import time

from app.services import event_service, story_service, store
from app.utils import success

bp = Blueprint("game", __name__, url_prefix="/api/game")

OPENING_CHAPTER = 1
OPENING_TEMPLATE_KEY = "chapter-1_pending"
OPENING_KEYWORDS = (
    "開頭是: 你現在獨自探索叢林。"
    "環境描述: 潮濕、又餓又渴。"
    "任務目標: 找到傳說中藏有寶藏的洞穴。"
    "結尾必須是: 就在這一刻..."
)


@bp.post("/start")
def start_game():
    store.reset()
    state = store.get_game_state()
    state.chapter_id = "chapter-1"

    # 先進入劇情 1，由後端排程轉入第一個事件。
    story = story_service.generate({
        "chapter": OPENING_CHAPTER,
        "keywords": OPENING_KEYWORDS,
        "event_result": "pending",
        "template_key": OPENING_TEMPLATE_KEY,
    })

    # 先顯示劇情 1（10 秒），再由後端 tick 轉入事件固定文字。
    store.schedule_event_spawn(delay_s=10.0)
    
    return success(
        {
            "message": "Game started successfully.",
            "game_state": state.to_dict(),
            "event": None,
            "story": story.to_dict(),
        }
    )


@bp.post("/reset")
def reset_game():
    store.reset()
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


@bp.post("/demo-event")
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
