from app.services import event_service, store


def _pose_points() -> list[list[float]]:
    return [
        [round(0.15 + index * 0.01, 3), round(0.2 + index * 0.005, 3), 0.0]
        for index in range(33)
    ]


def _frame_payload(
    *,
    source: str,
    stable_action: str,
    confidence: float,
) -> dict:
    pose_points = _pose_points()
    return {
        "timestamp": 1712345678.12,
        "source": source,
        "frame_id": 1,
        "action_scores": {
            "stand": 0.01,
            "jump": 0.96 if stable_action == "jump" else 0.02,
            "crouch": 0.96 if stable_action == "crouch" else 0.02,
            "push": 0.96 if stable_action == "push" else 0.02,
            "run_forward": 0.96 if stable_action == "run_forward" else 0.02,
        },
        "stable_action": stable_action,
        "confidence": confidence,
        "pose": {
            "layout": "mediapipe_pose_33",
            "shape": [33, 3],
            "points": pose_points,
        },
        "skeleton_sequence": {
            "layout": "mediapipe_pose_33",
            "shape": [1, 33, 3],
            "frames": [pose_points],
        },
    }


def _prepare_active_event(monkeypatch, *, target_action: str, age_seconds: float):
    event_service.reset()
    monkeypatch.setattr(
        event_service._engine,
        "pick_event",
        lambda _chapter_id: {
            "id": f"event_{target_action}",
            "chapter": 1,
            "text": "Test event",
            "required_action": target_action,
            "time_limit": 10.0,
            "success_text": "Success",
            "fail_text": "Fail",
            "effects": {
                "on_success": {"hp": 0, "score": 10},
                "on_fail": {"hp": -1, "score": -10},
            },
        },
    )
    event = event_service.create_event()
    event.created_at -= age_seconds
    return event


def test_edge_frame_matching_target_resolves_event_after_reading_guard(
    client,
    monkeypatch,
):
    event = _prepare_active_event(
        monkeypatch,
        target_action="jump",
        age_seconds=6.0,
    )

    response = client.post(
        "/edge/frames",
        json=_frame_payload(
            source="jetson-test-success",
            stable_action="jump",
            confidence=0.93,
        ),
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["data"]["success"] is True

    state = store.get_game_state()
    current = store.get_current_event()

    assert state.event_id == event.event_id
    assert state.judge_result == "success"
    assert state.player_state.score == 10
    assert current is not None
    assert current.status == "resolved"
    assert current.resolved_at is not None


def test_edge_frame_does_not_resolve_before_reading_guard_expires(
    client,
    monkeypatch,
):
    event = _prepare_active_event(
        monkeypatch,
        target_action="crouch",
        age_seconds=0.0,
    )

    response = client.post(
        "/edge/frames",
        json=_frame_payload(
            source="jetson-test-guard",
            stable_action="crouch",
            confidence=0.98,
        ),
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["data"]["success"] is True

    state = store.get_game_state()
    current = store.get_current_event()

    assert state.event_id == event.event_id
    assert state.judge_result == "pending"
    assert state.player_state.score == 0
    assert current is not None
    assert current.status == "active"
    assert current.resolved_at is None
