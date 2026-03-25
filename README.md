# AI-Adventurer 全端系統

AI-Adventurer 是一個姿態互動冒險遊戲原型，包含前端互動介面與後端 API 服務。

## 1. 主要功能

- 首頁流程：開始遊戲、姿態校正、玩法說明
- 遊戲主畫面：
  - 玩家狀態（血量血條、分數、遊戲階段）
  - 劇情顯示與目標動作提示
  - 剩餘時間顯示
- 設定面板：Dark Mode 切換、Debug 模式切換
- Debug 模式：顯示 debug 資訊與 Demo Event 注入工具
- 後端 API：遊戲狀態、事件輸入、劇情生成、系統健康檢查

## 2. 快速開始

### 2.1 使用 Docker Compose（開發）

```bash
docker compose up --build -d
```

啟動後：

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

停止服務：

```bash
docker compose down
```

### 2.2 本機開發

Frontend：

```bash
cd frontend
npm install
npm run dev
```

Backend：

```bash
cd backend
uv sync --dev
uv run app.py
```

## 3. 使用指南

1. 開啟首頁 `/`，點擊「開始遊戲」。
2. 進入遊戲頁後可查看玩家狀態與劇情區塊。
3. 右上角 Settings 可切換 Dark Mode 與 Debug 模式。
4. 開啟 Debug 模式後，可看到 Debug 卡片與 Inject Demo Event。
5. 如需返回首頁，可使用各頁左上角返回按鈕。

## 4. 專案結構

```text
AI-Adventurer/
├── frontend/                 # React + Vite 前端
├── backend/                  # Flask 後端 API
├── docker-compose.yml        # 前後端開發容器編排
└── README.md
```

## 5. 開發指南

- 前端開發請見 [frontend/README.md](frontend/README.md)
- 後端開發請見 [backend/README.md](backend/README.md)

## 6. 環境變數

### Frontend

| 變數                | 說明              | 預設值                  |
| ------------------- | ----------------- | ----------------------- |
| `VITE_API_BASE_URL` | 前端 API 基底網址 | `http://localhost:8000` |

### Backend

| 變數               | 說明                     | 預設值                                        |
| ------------------ | ------------------------ | --------------------------------------------- |
| `APP_ENV`          | 執行環境                 | `development`                                 |
| `BACKEND_HOST`     | 後端 host                | `0.0.0.0`                                     |
| `BACKEND_PORT`     | 後端 port                | `8000`                                        |
| `API_BASE_URL`     | 對外 API 基底網址        | `http://localhost:8000`                       |
| `EDGE_GATEWAY_URL` | Edge 事件來源（預留）    | `ws://localhost:9000/events`                  |
| `LLM_MODEL`        | 敘事模型名稱（預留）     | `gpt-4.1-mini`                                |
| `LOG_LEVEL`        | 日誌等級                 | `INFO`                                        |
| `CORS_ORIGINS`     | 允許前端來源（逗號分隔） | `http://localhost:5173,http://127.0.0.1:5173` |
