"""Flask 應用程式入口"""
from app import create_app
from app.config import get_config


# 創建應用實例
app, socketio = create_app()


if __name__ == '__main__':
    debug = get_config().app_env == "development"
    socketio.run(app, host='0.0.0.0', port=8000, debug=debug, allow_unsafe_werkzeug=True)
