# AI-Adventurer 全端系統規格

> 本文件負責**約束**：定義系統邊界、功能需求、資料契約、非功能需求與驗收標準。

## 1. 文件目的

本規格用於約束 AI-Adventurer 的 PC 端全端部分，確保：

- 團隊對需求範圍有一致理解
- 前後端對資料格式有共同契約
- 實作不偏離競賽展示目標
- 後續開發、測試與驗收有依據

## 2. 系統範圍

### In Scope

- PC 端前端介面
- PC 端後端 API / WebSocket / 事件處理
- 遊戲流程控制
- 事件判定邏輯
- 敘事生成服務整合
- 日誌與除錯輸出
- Docker 化部署

### Out of Scope

- 相機控制
- 人體骨架抽取
- 動作辨識模型訓練
- Edge AI 端裝置管理
- 雲端帳務 / 大規模多租戶能力

## 3. 角色與外部系統

### 使用者角色

- **Player**：遊戲操作與觀看回饋
- **Operator**：啟動系統、切換 demo 模式、監控狀態
- **Developer**：維護與除錯

### 外部系統

- **Edge AI Service**：輸出動作分數 / 穩定動作 / 時間戳
- **LLM Provider**：輸出敘事文字
- **Browser / Display Client**：呈現 UI

## 4. 核心名詞

| 名詞 | 定義 |
|---|---|
| `chapter` | 遊戲章節，包含背景與事件池 |
| `event` | 一次互動任務，包含目標動作、時限、成功/失敗敘事 |
| `target_action` | 當前事件要求玩家完成的動作 |
| `stable_action` | 經過時序平滑後的穩定動作結果 |
| `judge_result` | `success` / `fail` / `pending` |
| `player_state` | 玩家生命值、分數、狀態 |
| `story_segment` | 顯示給玩家的單段敘事內容 |

## 5. 功能需求

### FR-1 遊戲初始化

系統必須能在接收到開始指令後：

- 初始化玩家狀態
- 選擇章節
- 建立第一個事件
- 將初始狀態同步至前端

### FR-2 事件生成

系統必須能根據章節對應的事件池產生事件，且事件至少包含：

- `event_id`
- `target_action`
- `time_limit_ms`
- `success_prompt_key`
- `failure_prompt_key`

### FR-3 動作事件接收

系統必須能接收來自 Edge AI 端的輸入，至少包含：

- `timestamp`
- `action_scores`
- `stable_action` 或等價欄位

### FR-4 事件判定

系統必須能依據：

- 目標動作
- 時間限制
- 動作事件輸入

輸出 `success`、`fail` 或 `pending`。

### FR-5 劇情生成

系統必須能根據章節背景、關鍵詞、事件結果與模板產生敘事內容。

### FR-6 前端顯示

前端必須顯示至少以下資訊：

- 當前章節 / 劇情文字
- 玩家生命值 / 分數
- 目前目標動作
- 剩餘時間
- 成功 / 失敗結果
- 系統連線狀態

### FR-7 日誌記錄

系統必須記錄：

- 遊戲開始 / 結束
- 事件建立
- 判定結果
- LLM 呼叫結果
- 例外錯誤

### FR-8 Demo 模式

系統應支援 demo 模式，可在沒有 Edge AI 實機輸入時播放固定事件流。

## 6. 非功能需求

### NFR-1 即時性

- UI 狀態更新延遲目標：`< 300 ms`
- 動作事件到判定結果延遲目標：`< 500 ms`

### NFR-2 可重現性

- 使用 Docker Compose 可一鍵啟動
- `.env.example` 必須完整

### NFR-3 可維護性

- 前後端需分目錄
- 文件需對應三層：說明 / 規格 / 實作
- 主要模組需有單元測試或替代驗證方法

### NFR-4 可控性

- LLM 輸出需透過模板、關鍵詞與事件池限制
- 不允許直接生成未經約束的核心遊戲結果

### NFR-5 穩定性

- 任一外部服務失敗時，系統需提供退化行為
- LLM 失敗時，需回退到預設敘事模板

## 7. 業務規則

### BR-1 事件唯一目標動作

每個事件只能有一個 `target_action`。

### BR-2 時間限制

若在 `time_limit_ms` 內未判定成功，事件結果必須轉為 `fail`。

### BR-3 結果不可雙重提交

單一事件一旦進入 `success` 或 `fail`，不得再次改寫。

### BR-4 玩家狀態更新

- 成功時可加分 / 推進章節
- 失敗時可扣生命值或觸發失敗敘事

### BR-5 內容安全與一致性

LLM 輸出不得直接改寫：

- 目標動作
- 判定結果
- 玩家生命值規則
- 事件時間限制

## 8. 資料契約

### 8.1 Edge AI → Backend

```json
{
  "timestamp": 1712345678.12,
  "action_scores": {
    "stand": 0.12,
    "crouch": 0.81,
    "jump": 0.04,
    "background": 0.03
  },
  "stable_action": "crouch",
}
```

### 8.2 Backend → Frontend Game State

```json
{
  "chapter_id": "chapter-1",
  "event_id": "event-uuid",
  "target_action": "crouch",
  "time_remaining_ms": 8200,
  "judge_result": "pending",
  "player_state": {
    "hp": 3,
    "score": 20
  },
  "story_segment": "A shadow appears in the corridor..."
}
```

### 8.3 Story Service Input

```json
{
  "chapter_context": "{{context}}",
  "keywords": ["shadow", "gate", "escape"],
  "event_result": "success",
  "target_action": "crouch",
  "template_key": "chapter1_success"
}
```

### 8.4 Story Service Output

```json
{
  "story_segment": "You duck just in time and avoid the falling rocks.",
  "tone": "adventure",
  "template_key": "chapter1_success"
}
```

## 9. API 規格

### 系統

- `GET /api/health`：健康檢查
- `GET /api/config`：讀取前端必要設定

### 遊戲

- `POST /api/game/start`：開始遊戲
- `POST /api/game/reset`：重置遊戲
- `GET /api/game/state`：取得目前狀態
- `POST /api/game/demo-event`：注入測試事件

### 事件

- `POST /api/events/input`：接收 Edge AI 事件
- `GET /api/events/current`：取得當前事件
- `GET /api/events/history`：取得歷史記錄

### 敘事

- `POST /api/story/generate`：生成敘事
- `GET /api/story/current`：取得目前敘事

### 即時通訊

- `WS /ws/game-state`：前端訂閱遊戲狀態
- `WS /ws/debug`：除錯事件流

## 10. 狀態機約束

### Event 狀態

```text
idle -> active -> success
             └-> fail
```

### 約束

- `idle` 不可直接跳到 `success`
- `success` / `fail` 為終態
- 當前事件未終結前，不得建立下一事件

## 11. 前端約束

- 不可在頁面元件直接寫死 API base URL
- 不可在 UI 中直接實作遊戲規則判定
- 頁面特定邏輯應放在 `pages/<PageName>/`
- 可重用元件才提升到 `src/components/`

## 12. 後端約束

- Route 只負責 request / response，不放核心業務邏輯
- Game 規則放在 `domain/` 或 `services/`
- 外部整合放在 `integrations/`
- 所有環境變數需集中於設定模組
- 所有關鍵錯誤需記錄 log

## 13. Docker 與部署約束

- 必須提供 `docker-compose.yml`
- 必須提供 `.env.example`
- frontend 與 backend 必須為獨立 service
- 嚴禁把敏感金鑰寫進映像檔

## 14. 測試與驗收

### 最小驗收情境

1. 啟動系統
2. 建立遊戲
3. 注入一筆 `stable_action = target_action`
4. 成功觸發 `judge_result = success`
5. 前端收到更新並顯示成功敘事

### 驗收條件

- [ ] API 與 WebSocket 可正常連線
- [ ] 成功 / 失敗判定符合規則
- [ ] LLM 失敗時可 fallback
- [ ] Docker 可於全新環境啟動
- [ ] 文件與實作一致

## 15. 待決議事項

- 是否採用單體後端或拆成 story-service
- 是否需要本地 LLM fallback
- 前端是否採 web-only 或桌面包裝
- demo 模式是否內建固定劇本回放
