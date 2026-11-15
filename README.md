# Space Miner C（離線版）

- 引擎：Defold HTML5（WebAssembly + Emscripten）
- 目前版本：**1.2**
- 原始來源：<https://poki.com/zh/g/space-miner-eaa2fa6e#fullscreen>
- 倉庫：GitHub `lisjfixm/space-miner`，預設分支 `main`
- 線上版（GitHub Pages）：<https://lisjfixm.github.io/space-miner/>

## 啟動方式

### Windows（建議）

雙擊 `啟動 Space Miner.bat`：使用 `py` 啟動器在 `127.0.0.1:8778` 開本機靜態伺服器，並自動開啟瀏覽器。

### 手動啟動

在本目錄啟動任一靜態檔案伺服器，例如：

```
py -m http.server 8778 --bind 127.0.0.1
```

然後瀏覽器開啟 <http://127.0.0.1:8778/index.html>。

注意：Defold HTML5 成品不可直接以 `file://` 雙擊開啟，必須經由 HTTP 伺服器載入；瀏覽器需支援 WebGL。

### 線上部署（GitHub Pages）

- Pages 由 `gh-pages` 分支根目錄部署，線上網址：<https://lisjfixm.github.io/space-miner/>。
- `main` 為開發分支；更新成品後需把 `main` 內容同步到 `gh-pages`，線上版本才會跟著更新。

## 目錄結構

```
space-miner/
├── index.html              入口頁（含離線 Poki SDK stub、favicon、畫布）
├── dmloader.js             Defold 引擎載入器
├── SpaceMinerC_wasm.js     Emscripten 膠水層
├── SpaceMinerC.wasm        遊戲主體 WebAssembly
├── 啟動 Space Miner.bat    Windows 本機伺服器啟動器（埠 8778）
└── archive/
    ├── archive_files.json   打包資產清單
    ├── game0.projectc       專案設定（標題、解析度、版本等）
    ├── game0.arci           打包索引
    ├── game0.arcd           打包資源資料
    └── game0.dmanifest      打包 manifest
```

## 離線化說明

- Poki SDK 已由 `index.html` 內建的離線 stub 取代：廣告插屏、獎勵廣告、登入、使用者資訊、遙測呼叫皆在本地直接回呼，不發出網路請求。
- 所有美術、音效、腳本資源皆打包在本地 `archive/`，載入階段不向外部 CDN 取值。
- 殘留限制：`SpaceMinerC.wasm` 二進位內仍保留 PokiSDK 橋接的程式碼字串與呼叫點，由 stub 攔截，不會聯網；若要徹底剝除需有 Defold 原始工程重新打包，不建議直接硬改二進位。

## 存檔與帳號

- 存檔經 Emscripten IDBFS 寫入瀏覽器 IndexedDB（本機留存，不上傳）。
- 靜態分析未發現排行榜、雲端存檔或帳號解鎖依賴；`getUser` 回傳 `null` 有本地 callback 處理，不阻礙啟動。
- 存檔實際寫入與保留需在有 WebGL 的本機瀏覽器實跑確認。

## 已知限制

- 必須使用支援 WebGL 的瀏覽器；無 GPU / 無 WebGL 的環境（例如部分雲端 headless 瀏覽器）會在 GL 初始化階段中斷。
- 本目錄為 HTML5 發行成品，不含 Defold 原始工程；遊戲玩法、平衡與美術調整需回到原始工程處理。

## 版本沿革

### 1.2

- 啟動器改用 `py -m http.server`（本機 Python 未進 PATH 時亦可運作）。
- 加入本地 inline SVG favicon，消除 `/favicon.ico` 404。
- 錯誤面板（file:// 直開警告、無 WebGL）的外部連結改為純文字提示。
- 停用主控台「Made with Defold」橫幅輸出。
- 補本 README 與版本記錄。
- 啟用 GitHub Pages 線上版（`gh-pages` 分支根目錄部署）。

### 1.1

- 移除 index.html 中兩條 Poki `dns-prefetch` 提示（`api.poki.com`、`a.poki-cdn.com`）。
- 頁面標題與專案設定版本號更新為 1.1。

### 1.0

- 離線成品初始導入：Defold HTML5 bundle，Poki SDK 以離線 stub 取代。
