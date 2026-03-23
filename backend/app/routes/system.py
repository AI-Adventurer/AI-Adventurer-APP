from __future__ import annotations

from flask import Blueprint

from app.services.system_service import system_service
from app.utils.responses import success

system_bp = Blueprint("system", __name__, url_prefix="/api")


@system_bp.get("/health")
def health():
    return success({"status": "ok"})


@system_bp.get("/config")
def config():
    return success(system_service.read_public_config())
