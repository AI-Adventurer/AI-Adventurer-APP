from app import create_app
from app.config import get_config


def main() -> None:
    app = create_app()
    config = get_config()
    app.run(host=config.host, port=config.port)


if __name__ == "__main__":
    main()
