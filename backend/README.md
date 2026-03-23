# Backend Scaffold

This backend currently provides infrastructure and API skeletons for AI-Adventurer, excluding core game-judging logic.

## Implemented

- Flask app factory and centralized config
- Unified success/error response format
- Global error handlers and logging setup
- CORS setup for `/api/*`
- In-memory store for temporary state and event history
- Route blueprints for:
  - `GET /api/health`
  - `GET /api/config`
  - `POST /api/game/start`
  - `POST /api/game/reset`
  - `GET /api/game/state`
  - `POST /api/game/demo-event`
  - `POST /api/events/input`
  - `GET /api/events/current`
  - `GET /api/events/history`
  - `POST /api/story/generate`
  - `GET /api/story/current`

## Not Implemented Yet

- Event judge state machine
- Core game rule transitions
- External LLM and Edge AI integrations
- WebSocket real-time push channel

## Local Run

```bash
cd backend
python -m pip install -e .[dev]
python main.py
```

## Test

```bash
cd backend
pytest -q
```
