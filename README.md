# AI-Adventurer 全端系統

本文件負責**說明**這個全端子系統是什麼、解決什麼問題、包含哪些能力，以及如何快速啟動。

## 1. 專案概述

AI-Adventurer 全端系統負責承接來自感測端 / Edge AI 端的動作事件，並在 PC 端完成：

- 遊戲狀態管理
- 劇情 / 敘事生成
- 事件判定與回饋
- 前端互動介面顯示
- 日誌與除錯資訊輸出

### 目標

- 提供穩定的互動式遊戲體驗
- 將「敘事 → 行動 → 回饋」形成可重現的閉環
- 支援本地開發、Docker 部署與競賽展示

### 不包含範圍

- 相機擷取
- MediaPipe Pose / 骨架抽取
- Edge AI 端的動作辨識模型推論

## 2. 系統功能

### 核心功能

- **Game Manager**：管理章節、事件、玩家狀態與回合流程
- **Event Judge**：依據目標動作、時間限制與辨識結果判定成功 / 失敗
- **Story Service**：根據章節背景、關鍵詞與事件結果生成敘事文字
- **Frontend UI**：顯示遊戲畫面、玩家狀態、目標動作、倒數計時與敘事內容
- **Gateway / API**：與 Edge AI 端或其他服務交換資料
- **Logger**：記錄事件流、判定結果與錯誤資訊

### 展示目標

- 即時顯示當前劇情與狀態
- 即時回應玩家動作結果
- 在失敗 / 成功後呈現對應敘事回饋
- 支援現場 demo 的穩定啟動流程

## 3. 使用情境

### 主要流程

1. 玩家開始遊戲
2. 前端顯示章節背景與劇情
3. 後端從事件池抽取事件
4. Edge AI 端回傳動作分數 / 穩定動作
5. Event Judge 判定是否在時限內完成指定動作
6. Game Manager 更新生命值 / 分數 / 關卡狀態
7. Story Service 生成成功或失敗敘事
8. 前端顯示新的狀態與文字

### 典型使用者

- 玩家
- 展示人員 / 評審
- 開發者 / 維護者

## 4. 技術棧

### 前端

- **Framework**: React 19.2.0
- **Language**: TypeScript
- **UI**: Radix UI + Tailwind CSS + Shadcn
- **State Management**: React Hooks
- **Build Tool**: Vite 7.3.1

### 後端

- **Framework**: Flask 3.x
- **Language**: Python
- **Runtime / Server**: {{BACKEND_RUNTIME}}
- **Package Manager**: {{BACKEND_PACKAGE_MANAGER}}

### 基礎設施

- **Container**: Docker / Docker Compose
- **Transport**: {{TRANSPORT_PROTOCOLS}}
- **Storage**: {{STORAGE_CHOICE}}
- **LLM Provider**: {{LLM_PROVIDER}}

## 5. 專案結構

```text
AI-Adventurer/
├── frontend/                 # 前端應用
│   ├── src/
│   │   ├── pages/            # 頁面級模組
│   │   ├── components/       # 共用元件
│   │   ├── hooks/            # 共用 hooks
│   │   ├── lib/              # API / utils
│   │   ├── types/            # 全域型別
│   │   └── main.tsx
│   └── public/
├── backend/                  # 後端應用
│   ├── app/                  # 應用主體
│   │   ├── routes/           # HTTP / WS 路由
│   │   ├── services/         # 業務邏輯
│   │   ├── domain/           # 遊戲規則 / 領域模型
│   │   ├── integrations/     # LLM / Edge AI / 外部服務
│   │   ├── middleware/       # 中間件
│   │   └── utils/            # 工具函式
│   ├── tests/
│   └── main.py
├── README.md                 # 說明文件
├── spec.md                   # 約束文件
├── architecture.md           # 實作文件
├── docker-compose.yml
└── .env.example
```

## 6. 快速開始

### 使用 Docker Compose

```bash
cp .env.example .env

docker compose up --build
```

啟動後：

- Frontend: `http://localhost:{{FRONTEND_PORT}}`
- Backend API: `http://localhost:{{BACKEND_PORT}}`
- Docs: `docs/`

### 本機開發

#### Frontend

```bash
cd frontend
{{FRONTEND_INSTALL_COMMAND}}
{{FRONTEND_DEV_COMMAND}}
```

#### Backend

```bash
cd backend
{{BACKEND_INSTALL_COMMAND}}
{{BACKEND_DEV_COMMAND}}
```

## 7. 環境變數

| 變數 | 說明 | 範例 |
|---|---|---|
| `APP_ENV` | 執行環境 | `development` |
| `API_BASE_URL` | 前端呼叫後端位置 | `http://localhost:8000` |
| `EDGE_GATEWAY_URL` | Edge AI 端資料入口 | `ws://localhost:9000/events` |
| `LLM_API_KEY` | LLM 金鑰 | `***` |
| `LLM_MODEL` | LLM 模型名稱 | `gpt-4.1-mini` |
| `LOG_LEVEL` | 日誌等級 | `INFO` |

## 8. 文件導覽

- **README.md**：看整體說明、功能、快速開始、操作方式
- **spec.md**：看需求邊界、資料契約、限制條件、驗收標準
- **architecture.md**：看模組切分、資料流、資料夾結構、部署方式、實作策略

## 9. 開發流程建議

1. 先閱讀 `spec.md` 確認需求與範圍
2. 依 `architecture.md` 建立資料夾與模組骨架
3. 實作最小可行流程：事件輸入 → 判定 → UI 顯示
4. 再接入 Story Service、Docker 與日誌

## 10. 驗收清單

- [ ] 可在本機成功啟動前後端
- [ ] 可接收來自 Edge AI 端的動作事件
- [ ] 可在前端顯示目標動作與倒數
- [ ] 可在後端正確判定成功 / 失敗
- [ ] 可產生並顯示成功 / 失敗敘事
- [ ] 可輸出基本日誌與錯誤資訊
- [ ] 可用 Docker Compose 一鍵啟動

---

## 11. 疑難排解

### 容器無法啟動

- 確認 `.env` 是否存在
- 確認 port 是否衝突
- 重新建置容器：

```bash

docker compose build --no-cache
docker compose up
```

### 前端無法連到後端

- 檢查 `API_BASE_URL`
- 檢查 CORS 設定
- 檢查 backend health check

### 收不到 Edge AI 事件

- 檢查 WebSocket / HTTP endpoint 是否正確
- 檢查事件 payload 格式是否符合 `spec.md`
- 檢查 logger 是否有收到封包

## 12. 後續擴充

- 使用者帳號與成績紀錄
- 回放模式與 demo 模式
- 多語系 UI
- 可替換式 LLM Provider
- 更完整的觀測性（metrics / tracing）
