# Security Policy for AI Studio (惇陽 AI 實驗室)

確保「模組化空間資訊編輯平台」的安全性是我們的首要任務。我們非常重視資安研究人員與社群開發者的貢獻，並致力於維持系統核心架構的安全性與 **可擴展性 (Scalability)**。

## Supported Versions

目前 AI Studio 採用動態模組載入架構。以下是我們目前支援並主動提供安全性更新的版本。
（註：版本號對應 `manifest.json` 中的 `ai_lab_config.version` 以及核心模組的版號）

| Version | Supported          | Description |
| ------- | ------------------ | ----------- |
| 2.2.x   | :white_check_mark: | 當前主版本（包含最新模組化架構與空間資訊類別） |
| 2.1.x   | :white_check_mark: | 核心防護支援版（對應 `DebugSystem.js` 深度監控強化版） |
| 2.0.x   | :x:                | 舊版基礎架構（不再提供安全性更新，請升級） |
| < 2.0   | :x:                | 停用（缺乏跨視窗通訊安全保護） |

## Reporting a Vulnerability

我們強烈建議**不要**在公開的 GitHub Issues 中發佈潛在的安全漏洞（例如針對 `AppLoader.js` 或 `DebugSystem.js` 的 XSS 或 Injection 弱點），以免在修復前遭到惡意利用。

### 提報管道 (Reporting Channel)
請透過以下安全管道回報漏洞：
1. **GitHub Private Vulnerability Reporting (首選)**: 
   請導覽至本儲存庫的 `Security` 標籤頁面，點選 `Advisories` -> `Report a vulnerability`，私下向維護團隊提交您的發現。
2. **安全專線信箱**: 
   若您無法使用 GitHub 內建功能，請將漏洞詳情發送至我們指定的開發維護信箱（*clleeolin@outlook.com*）。

### 應提供的資訊 (What to Include)
為了幫助我們快速重現並修復問題，請在報告中提供：
* 漏洞類型（如 Cross-Site Scripting, 權限繞過, 或針對 **Middleware / iframe 通訊** 的攻擊）。
* 影響的模組範圍（例如：`MapEngine.js` 3D 地圖與 WKT 解析核心，或是 `BusinessCard_Vision.html` 等）。
* 重現該漏洞的完整步驟 (Proof of Concept)。
* 潛在的危害影響評估。

### 處理流程與預期回應 (What to Expect)
1. **確認接收**: 我們會在收到私下回報後的 **48 小時內** 確認您的提報。
2. **審查與分析**: 我們的資深工程團隊將進行 **封裝性 (Encapsulation)** 與安全性驗證，並在 5 個工作天內回覆評估結果（接受或拒絕）。
3. **修復與發佈**: 若漏洞確認成立，我們將在私有的修復分支中進行代碼加固，並於修補完成後發布 CVE 或安全公告，同時在公告中對您的貢獻表達感謝（依據您的意願）。

感謝您協助守護 AI Studio 平台的安全！
