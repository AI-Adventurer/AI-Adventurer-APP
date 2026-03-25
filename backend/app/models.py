from dataclasses import asdict, dataclass, field
from time import time
from typing import Any


@dataclass
class EdgeInputEvent:
    timestamp: float
    action_scores: dict[str, float]
    stable_action: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


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
    hp: int = 3
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
