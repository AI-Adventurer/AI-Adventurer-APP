# AI-Adventurer 全端系統架構

> 本文件負責**實作**：描述模組切分、資料流、目錄規劃、部署方式與落地策略。

## 1. 架構原則

本專案採三層文件分工：

- `README.md`：讓人快速理解系統與啟動方式
- `spec.md`：限制需求邊界與資料契約
- `architecture.md`：指導實作與部署

PC 端全端部分採以下原則：

1. **前後端分離**
2. **規則與 UI 分離**
3. **對外整合集中管理**
4. **可 Docker 化部署**
5. **支援 demo 與 fallback**

## 2. 高層架構

```text
Edge AI / Sensing Side
    ↓
PC Backend Gateway
    ↓
Game Manager + Event Judge
    ↓
Story Service
    ↓
Frontend UI
```

### 元件說明

- **Gateway**：接收 Edge AI 端輸入，轉成內部事件
- **Game Manager**：管理章節、事件、玩家狀態
- **Event Judge**：根據目標動作與時間限制進行判定
- **Story Service**：生成或選擇敘事內容
- **Frontend UI**：顯示遊戲畫面、狀態、倒數與敘事

## 3. 建議目錄結構

```text
AI-Adventurer/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   │   ├── Home/
│   │   │   ├── Play/
│   │   │   ├── Result/
│   │   │   └── Debug/
│   │   ├── stores/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── health.py
│   │   │   ├── game.py
│   │   │   ├── events.py
│   │   │   └── story.py
│   │   ├── services/
│   │   │   ├── game_service.py
│   │   │   ├── judge_service.py
│   │   │   ├── event_service.py
│   │   │   └── story_service.py
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── rules/
│   │   │   └── state_machine/
│   │   ├── integrations/
│   │   │   ├── llm_client.py
│   │   │   └── edge_gateway.py
│   │   ├── middleware/
│   │   ├── config/
│   │   └── utils/
│   ├── tests/
│   ├── main.py
│   └── pyproject.toml
├── docs/
│   ├── README.md
│   ├── spec.md
│   └── architecture.md
├── docker-compose.yml
└── .env.example
```

## 4. 前端實作策略

### 4.1 架構模式

沿用你過往專案的**頁面級架構**：

```text
pages/PageName/
├── index.tsx
├── components/
├── hooks/
└── utils/
```

### 4.2 頁面規劃

- `Home/`：首頁與開始畫面
- `Play/`：主要遊戲畫面
- `Result/`：結果與結算畫面
- `Debug/`：展示或開發時查看即時事件流

### 4.3 共用模組

- `components/layout/`：整體版型
- `components/ui/`：按鈕、卡片、對話框
- `api/`：API 與 WebSocket 存取
- `stores/`：前端狀態管理
- `types/`：GameState、Event、PlayerState 等型別

### 4.4 前端狀態分層

- **Server state**：由 API / WebSocket 同步
- **UI state**：dialog 開關、動畫狀態、debug 面板
- **Derived state**：倒數時間、狀態文案、顏色提示

## 5. 後端實作策略

### 5.1 分層方式

#### Routes

處理：
- request validation
- response serialization
- status code

不處理：
- 遊戲規則
- LLM prompt 組裝細節
- 狀態機轉移

#### Services

負責：
- 遊戲流程協調
- 事件建立與查詢
- 判定與敘事呼叫
- 向前端推送狀態

#### Domain

負責：
- Entity 定義
- 狀態機
- 業務規則
- 純函式判定邏輯

#### Integrations

負責：
- LLM API 呼叫
- Edge AI 事件接收
- 其他外部服務抽象

## 6. 主要資料流

### 6.1 正常遊戲流程

```text
Start Game
  → create chapter
  → create event
  → publish initial game state
  → receive edge input
  → judge event
  → update player state
  → generate story
  → publish updated game state
```

### 6.2 Edge Input Flow

```text
Edge AI payload
  → gateway parse
  → event_service normalize
  → judge_service evaluate
  → game_service apply result
  → story_service build narrative
  → websocket broadcast
```

### 6.3 LLM Fallback Flow

```text
story_service.generate()
  → try llm_client
  → except error
  → fallback to local template
  → return safe story segment
```

## 7. 核心資料模型

### GameState

```ts
interface GameState {
  chapterId: string;
  eventId: string | null;
  targetAction: string | null;
  timeRemainingMs: number;
  judgeResult: 'pending' | 'success' | 'fail';
  hp: number;
  score: number;
  storySegment: string;
}
```

### EdgeEvent

```ts
interface EdgeEvent {
  timestamp: number;
  actionScores: Record<string, number>;
  stableAction?: string;
  source?: string;
}
```

### GameEvent

```ts
interface GameEvent {
  eventId: string;
  targetAction: string;
  timeLimitMs: number;
  status: 'idle' | 'active' | 'success' | 'fail';
}
```

## 8. API 與通訊實作

### HTTP API

適合：
- 初始化
- 查詢狀態
- 重置遊戲
- 管理設定

### WebSocket

適合：
- 推送遊戲狀態
- 推送 Edge AI 即時事件
- 推送 debug 資訊

### 推薦策略

- **HTTP**：控制面
- **WebSocket**：即時面

## 9. Docker 部署建議

### 9.1 Compose Services

```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "8080:8080"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - .env
```

### 9.2 建議

- backend 一定 Docker 化
- frontend 若為 web UI，建議一起 Docker 化
- 若未來改用 Unity / 桌面 UI，可讓 UI 保持原生執行

## 10. 觀測性與除錯

### 基本 log 類型

- `GAME_START`
- `EVENT_CREATED`
- `EDGE_INPUT_RECEIVED`
- `JUDGE_SUCCESS`
- `JUDGE_FAIL`
- `STORY_GENERATED`
- `STORY_FALLBACK`
- `UNHANDLED_EXCEPTION`

### Debug 頁面建議

顯示：
- 最後一筆 edge payload
- 當前 event
- 判定結果
- LLM 產生內容
- WebSocket 連線狀態

## 11. 測試策略

### Backend

- 單元測試：judge rule、state machine、story fallback
- 整合測試：`/api/game/start`、`/api/events/input`

### Frontend

- 元件測試：關鍵 UI 區塊
- 頁面測試：Play 頁更新流程
- Mock 測試：模擬 backend / websocket

### Demo 測試

- 無 Edge AI 實機下，能使用固定事件回放
- LLM 失敗時 UI 不崩潰

## 12. 實作順序建議

### Phase 1：骨架

- 建立 frontend / backend 目錄
- 建立 docs 三文件
- 建立 health check
- 建立 GameState 型別

### Phase 2：最小遊戲回路

- `POST /api/game/start`
- `POST /api/events/input`
- Event Judge
- Play UI 顯示

### Phase 3：敘事整合

- Story Service
- LLM Client
- fallback template

### Phase 4：部署與展示

- Docker Compose
- Debug page
- Demo mode
- 日誌輸出

## 13. 後續演進

- 後端拆成 `game-service` 與 `story-service`
- 加入持久化存檔
- 加入使用者與排行榜
- 加入 replay / analytics
