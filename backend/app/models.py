from dataclasses import asdict, dataclass, field
from time import time
from typing import Any


@dataclass
class StoryResult:
    story_segment: str
    tone: str
    template_key: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class EventRecord:
    event_id: str
    chapter: int
    text: str
    target_action: str
    success_text: str
    fail_text: str
    time_limit_ms: int
    status: str
    created_at: float = field(default_factory=time)
    resolved_at: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class PlayerState:
    hp: int = 5
    score: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class GameState:
    chapter_id: str = "chapter-1"
    event_id: str | None = None
    target_action: str | None = None
    time_remaining_ms: int = 0
    judge_result: str = "pending"
    player_state: PlayerState = field(default_factory=PlayerState)
    story_segment: str = "Ready for adventure."

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["player_state"] = self.player_state.to_dict()
        return payload


@dataclass
class SkeletonSequence:
    """骨骼序列數據"""
    layout: str  # e.g., "mediapipe_pose_33"
    shape: list[int]  # [T, V, C]
    frames: list[list[list[float]]]  # T x V x C

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class PosePoints:
    """單幀姿態點位（33 x 3）"""
    points: list[list[float]]  # 33 x 3

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class JetsonFrame:
    """Jetson Nano 傳送的單幀數據"""
    timestamp: float
    source: str
    frame_id: int
    action_scores: dict[str, float]
    stable_action: str
    confidence: float
    skeleton_sequence: SkeletonSequence
    pose: PosePoints | None = None
    received_at: float = field(default_factory=time)

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["skeleton_sequence"] = self.skeleton_sequence.to_dict()
        payload["pose"] = self.pose.to_dict() if self.pose else None
        payload["latest_pose"] = (
            self.pose.points
            if self.pose
            else self.skeleton_sequence.frames[-1]
            if self.skeleton_sequence.frames
            else []
        )
        return payload


@dataclass
class JetsonDevice:
    """Jetson Nano 設備信息"""
    source: str
    last_frame_id: int = 0
    last_active: float = field(default_factory=time)
    connection_count: int = 0  # 連線次數
    frame_count: int = 0  # 總幀數

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
