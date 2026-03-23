from __future__ import annotations

from flask import Flask
from werkzeug.exceptions import HTTPException

from app.utils.logger import get_logger
from app.utils.responses import failure

logger = get_logger(__name__)


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        return failure(error.description, status_code=error.code or 400)

    @app.errorhandler(Exception)
    def handle_unexpected_exception(error: Exception):
        logger.exception("UNHANDLED_EXCEPTION: %s", error)
        return failure("Internal server error", status_code=500)
