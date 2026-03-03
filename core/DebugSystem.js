/**
 * @Core: DebugSystem
 * @Version: 2.3.0
 * @Description: 獨立偵錯終端模組。負責全域錯誤攔截與面板輸出。
 * 已解除與 index.html window.sysLog 的循環依賴，防止當機。
 */

export default class DebugSystem {
    constructor() {
        // 對接 index.html 中的浮動視窗 ID
        this.logContainer = document.getElementById('debug-log');
        this.maxLogs = 200; // 面板最多保留筆數，超過會自動刪除舊項
        
        this.setupListeners();
        this.log("🚀 偵錯終端核心已掛載 (v2.3.0)", "SUCCESS");
    }

    /**
     * 設定全域錯誤監聽與跨視窗通訊
     */
    setupListeners() {
        // 捕捉 Runtime 執行錯誤
        window.onerror = (msg, url, line, col, error) => {
            const file = url ? url.split('/').pop() : '未知來源';
            this.log(`運行錯誤: ${msg} [${file}:${line}]`, "ERROR");
            return false; // 讓錯誤繼續傳遞到 Console
        };

        // 捕捉 Promise 未處理的拒絕 (例如 API fetch 失敗)
        window.onunhandledrejection = (event) => {
            this.log(`非同步失敗: ${event.reason}`, "ERROR");
        };

        // 監聽來自 Iframe 子頁面的訊息
        // 子頁面可用 window.parent.postMessage({type:'debug', msg:'...', level:'INFO'}, '*') 傳送
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'debug') {
                const module = event.data.module || "子頁面";
                this.log(`[${module}] ${event.data.msg}`, event.data.level || "INFO");
            }
        });
    }

    /**
     * 核心輸出函式：僅負責將內容插入 DOM
     * @param {string} msg 訊息內容
     * @param {string} level 級別: INFO, SUCCESS, WARN, ERROR
     */
    log(msg, level = "INFO") {
        if (!this.logContainer) {
            this.logContainer = document.getElementById('debug-log');
            if (!this.logContainer) return;
        }

        const time = new Date().toLocaleTimeString('zh-TW', { hour12: false });
        
        // 定義配色方案
        const colors = {
            "ERROR": "#ff4444",
            "SUCCESS": "#00f2ff",
            "WARN": "#ffcc00",
            "INFO": "#00ff00"
        };
        const color = colors[level.toUpperCase()] || colors["INFO"];

        // 建立訊息項目
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 4px 10px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            font-size: 11px;
            word-break: break-all;
            line-height: 1.5;
            border-left: 3px solid ${color};
            background: rgba(255,255,255,0.02);
            margin-bottom: 2px;
        `;

        item.innerHTML = `
            <span style="color:#666; font-family: monospace;">[${time}]</span> 
            <span style="color:${color}; font-weight:bold; margin: 0 5px;">[${level.toUpperCase()}]</span> 
            <span style="color:#eee;">${this.escape(msg)}</span>
        `;

        this.logContainer.appendChild(item);
        
        // 自動捲動到底部
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // 限制面板顯示數量，避免瀏覽器卡頓
        if (this.logContainer.childNodes.length > this.maxLogs) {
            this.logContainer.removeChild(this.logContainer.firstChild);
        }
    }

    /**
     * 防止 HTML 注入的跳脫工具
     */
    escape(str) {
        if (typeof str !== 'string') return String(str);
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    }
}