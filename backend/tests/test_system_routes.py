def test_health_ok(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "ok"


def test_config_has_required_keys(client):
    response = client.get("/api/config")

    assert response.status_code == 200
    payload = response.get_json()
    data = payload["data"]
    assert "app_env" in data
    assert "api_base_url" in data
    assert "edge_gateway_url" in data
