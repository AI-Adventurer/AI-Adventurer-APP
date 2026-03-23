from __future__ import annotations

from typing import Any

from flask import jsonify


def success(data: Any, status_code: int = 200):
    return jsonify({"success": True, "data": data}), status_code


def failure(message: str, status_code: int = 400, details: Any | None = None):
    payload: dict[str, Any] = {"success": False, "error": {"message": message}}
    if details is not None:
        payload["error"]["details"] = details
    return jsonify(payload), status_code
