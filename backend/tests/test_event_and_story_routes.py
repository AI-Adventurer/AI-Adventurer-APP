def test_event_input_requires_fields(client):
    response = client.post("/api/events/input", json={})

    assert response.status_code == 422
    payload = response.get_json()
    assert payload["success"] is False


def test_event_input_accepts_minimal_payload(client):
    response = client.post(
        "/api/events/input",
        json={
            "timestamp": 1712345678.12,
            "action_scores": {"stand": 0.8, "jump": 0.2},
            "stable_action": "stand",
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["data"]["stable_action"] == "stand"


def test_story_generate_uses_fallback(client):
    response = client.post(
        "/api/story/generate",
        json={
            "event_result": "success",
            "template_key": "chapter1_success",
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["data"]["template_key"] == "chapter1_success"
    assert payload["data"]["tone"] == "adventure"
