"""Edge 設備管理服務 (Jetson Nano)"""
from time import time
from typing import Any, Callable

from app.models import JetsonDevice, JetsonFrame, PosePoints, SkeletonSequence
from app.utils.logger import get_logger

logger = get_logger(__name__)


class EdgeService:
    """處理 Jetson Nano 邊緣設備的數據"""

    def __init__(self):
        self._devices: dict[str, JetsonDevice] = {}
        self._latest_frames: dict[str, JetsonFrame] = {}
        self._action_success_handler: Callable[[dict[str, Any]], None] | None = None

    def set_action_success_handler(
        self,
        handler: Callable[[dict[str, Any]], None] | None,
    ) -> None:
        self._action_success_handler = handler

    def register_device(self, source: str) -> JetsonDevice:
        """註冊新設備"""
        if source not in self._devices:
            self._devices[source] = JetsonDevice(source=source)
        
        device = self._devices[source]
        device.connection_count += 1
        device.last_active = time()
        return device

    def unregister_device(self, source: str) -> None:
        """卸載設備"""
        if source in self._devices:
            logger.info(f"Device unregistered: {source}")

    def ingest_frame(self, payload: dict[str, Any]) -> dict[str, Any]:
        """
        接收並驗證 Jetson 傳送的幀數據
        
        Returns:
            {
                "success": bool,
                "message": str,
                "frame_id": int,
                "processed_at": float,
                "error": str | None
            }
        """
        try:
            # 驗證必要欄位
            required_fields = [
                "timestamp",
                "source",
                "frame_id",
                "action_scores",
                "stable_action",
                "confidence",
                "skeleton_sequence",
            ]
            
            missing_fields = [f for f in required_fields if f not in payload]
            if missing_fields:
                return {
                    "success": False,
                    "message": "Missing required field",
                    "error": f"Missing fields: {', '.join(missing_fields)}",
                }

            source = str(payload.get("source", "")).strip()
            if not source:
                return {
                    "success": False,
                    "message": "Invalid source",
                    "error": "source must be a non-empty string",
                }

            # 驗證 action_scores
            action_scores = payload.get("action_scores", {})
            if not isinstance(action_scores, dict):
                return {
                    "success": False,
                    "message": "Invalid action_scores format",
                    "error": "action_scores must be a dictionary",
                }
            
            for key, value in action_scores.items():
                if not isinstance(value, (int, float)) or not (0.0 <= value <= 1.0):
                    return {
                        "success": False,
                        "message": "Invalid action_scores value",
                        "error": f"Score {key}={value} must be between 0.0 and 1.0",
                    }

            # 驗證 skeleton_sequence
            skeleton_data = payload.get("skeleton_sequence", {})
            try:
                skeleton = SkeletonSequence(
                    layout=skeleton_data.get("layout", "mediapipe_pose_33"),
                    shape=skeleton_data.get("shape", []),
                    frames=skeleton_data.get("frames", []),
                )
            except Exception as e:
                return {
                    "success": False,
                    "message": "skeleton_sequence format error",
                    "error": str(e),
                }

            # 驗證 shape 與 frames 一致，且固定為 V=33、C=3
            if len(skeleton.shape) != 3:
                return {
                    "success": False,
                    "message": "skeleton_sequence format error",
                    "error": f"shape must be [T, V, C], got {skeleton.shape}",
                }
            
            t, v, c = skeleton.shape
            if len(skeleton.frames) != t:
                return {
                    "success": False,
                    "message": "skeleton_sequence format error",
                    "error": f"frames length {len(skeleton.frames)} != T {t}",
                }

            if v != 33 or c != 3:
                return {
                    "success": False,
                    "message": "skeleton_sequence format error",
                    "error": f"shape must be [T, 33, 3], got {skeleton.shape}",
                }

            for frame_index, frame_points in enumerate(skeleton.frames):
                if len(frame_points) != 33:
                    return {
                        "success": False,
                        "message": "skeleton_sequence format error",
                        "error": f"frame[{frame_index}] points length must be 33, got {len(frame_points)}",
                    }
                for point_index, point in enumerate(frame_points):
                    if not isinstance(point, list) or len(point) != 3:
                        return {
                            "success": False,
                            "message": "skeleton_sequence format error",
                            "error": f"frame[{frame_index}][{point_index}] must be [x, y, z]",
                        }

            pose_data = payload.get("pose") or {}
            pose_points = pose_data.get("points") if isinstance(pose_data, dict) else None
            if pose_points is None:
                pose_points = skeleton.frames[-1] if skeleton.frames else []

            if not isinstance(pose_points, list) or len(pose_points) != 33:
                return {
                    "success": False,
                    "message": "pose format error",
                    "error": f"pose.points must be 33 points, got {len(pose_points) if isinstance(pose_points, list) else 'invalid'}",
                }

            for point_index, point in enumerate(pose_points):
                if not isinstance(point, list) or len(point) != 3:
                    return {
                        "success": False,
                        "message": "pose format error",
                        "error": f"pose.points[{point_index}] must be [x, y, z]",
                    }

            pose = PosePoints(points=pose_points)

            # 構建 JetsonFrame
            frame = JetsonFrame(
                timestamp=float(payload["timestamp"]),
                source=source,
                frame_id=int(payload["frame_id"]),
                action_scores=action_scores,
                stable_action=str(payload["stable_action"]),
                confidence=float(payload["confidence"]),
                skeleton_sequence=skeleton,
                pose=pose,
            )

            # 註冊設備和更新狀態
            device = self.register_device(frame.source)
            device.last_frame_id = frame.frame_id
            device.last_active = time()
            device.frame_count += 1

            # 儲存最新幀
            self._latest_frames[frame.source] = frame

            # 只要偵測到當前事件需要的正確動作，就立即判定成功。
            from app.services import event_service

            action_resolved = event_service.apply_observed_action(
                observed_action=frame.stable_action,
                confidence=frame.confidence,
            )

            if action_resolved and self._action_success_handler:
                from app.services.state_store import store

                state = store.get_game_state()
                current = store.get_current_event()
                self._action_success_handler(
                    {
                        "type": "event_result",
                        "result": "success",
                        "event_id": state.event_id,
                        "target_action": state.target_action,
                        "observed_action": frame.stable_action,
                        "confidence": frame.confidence,
                        "source": frame.source,
                        "resolved_at": current.resolved_at if current else time(),
                    }
                )

            logger.debug(
                f"Frame ingested: source={frame.source}, "
                f"frame_id={frame.frame_id}, action={frame.stable_action}"
            )

            return {
                "success": True,
                "message": "Data received successfully",
                "frame_id": frame.frame_id,
                "processed_at": time(),
            }

        except Exception as e:
            logger.error(f"Error ingesting frame: {e}")
            return {
                "success": False,
                "message": "Internal server error",
                "error": str(e),
            }

    def get_latest_frame(self, source: str) -> JetsonFrame | None:
        """取得特定設備的最新幀"""
        return self._latest_frames.get(source)

    def get_all_latest_frames(self) -> dict[str, JetsonFrame]:
        """取得所有設備的最新幀"""
        return dict(self._latest_frames)

    def get_device(self, source: str) -> JetsonDevice | None:
        """取得設備信息"""
        return self._devices.get(source)

    def get_all_devices(self) -> dict[str, JetsonDevice]:
        """取得所有已連線設備"""
        return dict(self._devices)

    def get_device_stats(self) -> dict[str, Any]:
        """取得所有設備的統計信息"""
        return {
            "total_devices": len(self._devices),
            "devices": {
                source: device.to_dict()
                for source, device in self._devices.items()
            },
        }


edge_service = EdgeService()
