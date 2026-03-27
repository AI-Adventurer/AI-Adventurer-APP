"""WebSocket 配置和事件處理"""
from app.services.edge_service import edge_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

try:
    from flask_socketio import SocketIO, emit, disconnect
except ImportError:
    raise ImportError(
        "flask-socketio is required for WebSocket support. "
        "Please install it with: pip install flask-socketio"
    )


def init_websocket(app):
    """初始化 WebSocket 服務"""
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode="eventlet",
        ping_timeout=60,
        ping_interval=25,
    )

    # WebSocket 事件處理器
    
    @socketio.on("connect", namespace="/edge/frames")
    def handle_connect():
        """設備連線"""
        logger.info("Client connected to /edge/frames")
        emit("response", {"data": "Connected"})

    @socketio.on("disconnect", namespace="/edge/frames")
    def handle_disconnect():
        """設備斷開連線"""
        logger.info("Client disconnected from /edge/frames")

    @socketio.on("frame", namespace="/edge/frames")
    def handle_frame(data):
        """接收 Jetson 幀數據"""
        try:
            result = edge_service.ingest_frame(data)
            if not result.get("success"):
                emit("response", result)
                logger.warning("Rejected edge frame payload: %s", result)
                return

            pose_data = data.get("pose") if isinstance(data, dict) else None
            pose_points = (
                pose_data.get("points")
                if isinstance(pose_data, dict)
                else None
            )
            if not isinstance(pose_points, list) or len(pose_points) != 33:
                skeleton_data = data.get("skeleton_sequence", {}) if isinstance(data, dict) else {}
                skeleton_frames = (
                    skeleton_data.get("frames")
                    if isinstance(skeleton_data, dict)
                    else None
                )
                pose_points = (
                    skeleton_frames[-1]
                    if isinstance(skeleton_frames, list) and skeleton_frames
                    else []
                )

            emit(
                "frame_broadcast",
                {
                    "source": str(data.get("source", "")).strip(),
                    "frame_id": int(data.get("frame_id", 0)),
                    "timestamp": float(data.get("timestamp", 0.0)),
                    "stable_action": str(data.get("stable_action", "")),
                    "confidence": float(data.get("confidence", 0.0)),
                    "latest_pose": pose_points,
                },
                namespace="/edge/frames",
                broadcast=True,
                include_self=False,
            )
            
        except Exception as e:
            logger.error(f"Error handling frame: {e}")

    @socketio.on("connect", namespace="/edge/video")
    def handle_video_connect():
        """WebRTC 信令連線"""
        logger.info("Client connected to /edge/video (WebRTC signaling)")
        emit("response", {"data": "WebRTC signaling channel ready"})

    @socketio.on("disconnect", namespace="/edge/video")
    def handle_video_disconnect():
        """WebRTC 信令斷開連線"""
        logger.info("Client disconnected from /edge/video (WebRTC signaling)")

    @socketio.on("offer", namespace="/edge/video")
    def handle_offer(data):
        """處理 WebRTC Offer"""
        try:
            logger.debug(f"Received WebRTC offer from {data.get('source')}")
            # 轉發給同 namespace 其他客戶端，作為 signaling broker
            emit("offer", data, broadcast=True, include_self=False)
            emit("response", {"success": True, "message": "Offer received"})
        except Exception as e:
            logger.error(f"Error handling offer: {e}")
            emit("response", {"success": False, "error": str(e)})

    @socketio.on("answer", namespace="/edge/video")
    def handle_answer(data):
        """處理 WebRTC Answer"""
        try:
            logger.debug(f"Received WebRTC answer from {data.get('source')}")
            emit("answer", data, broadcast=True, include_self=False)
            emit("response", {"success": True, "message": "Answer received"})
        except Exception as e:
            logger.error(f"Error handling answer: {e}")
            emit("response", {"success": False, "error": str(e)})

    @socketio.on("candidate", namespace="/edge/video")
    def handle_candidate(data):
        """處理 ICE Candidate"""
        try:
            logger.debug(f"Received ICE candidate: {data.get('sdpMid')}")
            emit("candidate", data, broadcast=True, include_self=False)
            emit("response", {"success": True, "message": "Candidate received"})
        except Exception as e:
            logger.error(f"Error handling candidate: {e}")
            emit("response", {"success": False, "error": str(e)})

    return socketio
