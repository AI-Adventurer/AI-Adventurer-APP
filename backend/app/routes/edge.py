from flask import Blueprint, request

from app.services.edge_service import edge_service
from app.utils import success
from app.utils.logger import get_logger

logger = get_logger(__name__)

bp = Blueprint("edge", __name__, url_prefix="/edge")


@bp.post("/frames")
def receive_frame():
    """
    HTTP POST 端點接收 Jetson Nano 傳送的幀數據 (備用方案)
    
    此端點作為 WebSocket 的備用方案，用於測試或在 WebSocket 不可用時使用。
    """
    try:
        payload = request.get_json(silent=True) or {}
        
        if not payload:
            return success(
                {
                    "success": False,
                    "message": "Empty request body",
                },
                status_code=400,
            )

        # 驗證並處理幀
        result = edge_service.ingest_frame(payload)
        
        status_code = 201 if result.get("success") else 400
        return success(result, status_code=status_code)

    except Exception as e:
        logger.error(f"Error in receive_frame: {e}")
        return success(
            {
                "success": False,
                "message": "Internal server error",
                "error": str(e),
            },
            status_code=500,
        )


@bp.get("/frames/latest")
def get_latest_frames():
    """取得所有連線設備的最新幀"""
    try:
        frames = edge_service.get_all_latest_frames()
        return success(
            {
                "total_frames": len(frames),
                "frames": {
                    source: frame.to_dict()
                    for source, frame in frames.items()
                },
            }
        )
    except Exception as e:
        logger.error(f"Error in get_latest_frames: {e}")
        return success({"success": False, "error": str(e)}, status_code=500)


@bp.get("/frames/latest/<source>")
def get_device_latest_frame(source: str):
    """取得特定設備的最新幀"""
    try:
        frame = edge_service.get_latest_frame(source)
        
        if not frame:
            return success({"success": False, "message": "Device not found"}, status_code=404)
        
        return success({"frame": frame.to_dict()})
    except Exception as e:
        logger.error(f"Error in get_device_latest_frame: {e}")
        return success({"success": False, "error": str(e)}, status_code=500)


@bp.get("/devices")
def get_all_devices():
    """取得所有連線設備的信息"""
    try:
        devices = edge_service.get_all_devices()
        return success(
            {
                "total_devices": len(devices),
                "devices": {
                    source: device.to_dict()
                    for source, device in devices.items()
                },
            }
        )
    except Exception as e:
        logger.error(f"Error in get_all_devices: {e}")
        return success({"success": False, "error": str(e)}, status_code=500)


@bp.get("/devices/<source>")
def get_device_info(source: str):
    """取得特定設備信息"""
    try:
        device = edge_service.get_device(source)
        
        if not device:
            return success({"success": False, "message": "Device not found"}, status_code=404)
        
        return success({"device": device.to_dict()})
    except Exception as e:
        logger.error(f"Error in get_device_info: {e}")
        return success({"success": False, "error": str(e)}, status_code=500)


@bp.get("/stats")
def get_edge_stats():
    """取得邊緣設備的統計信息"""
    try:
        stats = edge_service.get_device_stats()
        return success(stats)
    except Exception as e:
        logger.error(f"Error in get_edge_stats: {e}")
        return success({"success": False, "error": str(e)}, status_code=500)
