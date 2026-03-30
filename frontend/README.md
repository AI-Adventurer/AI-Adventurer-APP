# AI-Adventurer Frontend

本目錄為 AI-Adventurer 前端應用，負責遊戲畫面呈現、互動流程控制與後端 API 串接。

## 1. 技術棧

- React 19
- TypeScript
- Vite 8
- React Router
- TanStack Query
- Tailwind CSS 4
- shadcn/ui + Radix UI

## 2. 專案結構

```text
frontend/
├── src/
│   ├── api/                # 各端點 API 函式（get/post 分檔）
│   ├── components/
│   │   ├── common/         # 共用元件（設定面板、返回按鈕）
│   │   ├── layout/         # 版面元件（RootLayout）
│   │   ├── ui/             # shadcn/radix UI 元件
│   │   └── theme-provider.tsx
│   ├── hooks/
│   │   ├── queries/        # 查詢 hooks
│   │   ├── mutations/      # 變更 hooks
│   │   ├── useQuery.ts     # Query 共用封裝
│   │   └── useMutation.ts  # Mutation 共用封裝
│   ├── lib/
│   │   ├── apiClient.ts    # 統一 API client
│   │   └── queryClient.ts  # TanStack Query client
│   ├── pages/
│   │   ├── Home/
│   │   ├── Game/
│   │   ├── Calibration/
│   │   └── HowToPlay/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
└── vite.config.ts
```

## 3. 設計原則

### 3.1 頁面級架構 (Pages-Based Architecture)

每個頁面視為獨立功能模組，頁面內部可以依需求拆分出專屬的元件、hooks 與工具函式，避免所有邏輯集中在單一檔案。

```text
pages/
├── Home/
├── Game/
│   ├── index.tsx
│   ├── components/
│   ├── hooks/             # (可選) 頁面專屬 Hook
│   └── lib/               # (可選) 頁面專屬工具函式
│   └── ui/                # (可選) 該頁面專屬 UI 元件
├── Calibration/
└── HowToPlay/
```

### 3.2 共享資源原則

跨頁面重用的邏輯與元件放在 `src` 的共享目錄，避免複製貼上與隱性耦合。

- `src/components/`: 多個頁面共用元件
- `src/api/`: API 請求函式（每個 endpoint 一個檔案）
- `src/hooks/`: 跨頁共享 hooks
- `src/context/`: 全域狀態上下文（若新增 auth/session 等全域狀態時使用）
- `src/lib/`: 工具函式與客戶端封裝
- `src/constants/`: 全域常數配置（若新增角色、狀態列舉時使用）
- `src/types/`: 全域型別定義

### 3.3 元件解構原則

當單一元件職責膨脹（例如 300~500 行以上、同時處理多段流程與 UI 區塊）時，應改為目錄式拆分。

```text
# 不推薦
GamePanel.tsx  # 單檔承載所有 UI + 狀態邏輯

# 推薦
GamePanel/
├── index.tsx              # 主元件邏輯
├── components/            # 子元件
│   ├── StatusIndicator.tsx
│   ├── EventTimeline.tsx
│   └── ActionButtons.tsx
└── hooks/                 # (可選) 元件專屬 Hook
```

建議拆分時機：

- 元件同時處理資料請求、狀態機、複雜互動與多區塊 UI
- 同一段 JSX 結構重複出現
- 子區塊可以獨立測試或跨頁重用

## 4. 開發指令

在 frontend 目錄執行：

```bash
npm install
npm run dev
```

其他常用指令：

```bash
npm run build
npm run preview
npm run lint
```

## 5. 環境變數

| 變數                | 說明              | 預設值                  |
| ------------------- | ----------------- | ----------------------- |
| `VITE_API_BASE_URL` | 後端 API 基底網址 | `http://localhost:8000` |

建議建立 `.env.local`：

```env
VITE_API_BASE_URL=http://localhost:8000
```
