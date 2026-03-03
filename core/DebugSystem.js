/**
 * @Core: DebugSystem
 * @Version: 2.3.1
 * @Description: 獨立偵錯終端，解除與全域 sysLog 的循環依賴。
 * 支援全域錯誤攔截、Promise 監控以及 Iframe 訊息接收。
 */

export default class DebugSystem {
    constructor() {
        this.logContainer = document.getElementById('debug-log');
        this.maxLogs = 200; 
        this.setupListeners();
        this.log("🚀 偵錯終端核心已掛載 (v2.3.1)", "SUCCESS");
    }

    setupListeners() {
        // 捕捉 Runtime 執行錯誤
        window.onerror = (msg, url, line, col, error) => {
            const file = url ? url.split('/').pop() : '未知來源';
            this.log(`運行錯誤: ${msg} [${file}:${line}]`, "ERROR");
            return false;
        };

        // 捕捉 Promise 錯誤 (如 API 失敗)
        window.onunhandledrejection = (event) => {
            this.log(`非同步失敗: ${event.reason}`, "ERROR");
        };

        // 接收來自 Iframe (子頁面) 的通訊
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'debug') {
                const module = event.data.module || "IFRAME";
                this.log(`[${module}] ${event.data.msg}`, event.data.level || "INFO");
            }
        });
    }

    /**
     * 核心渲染函式 (僅操作 DOM，不呼叫外部 sysLog)
     */
    log(msg, level = "INFO") {
        if (!this.logContainer) {
            this.logContainer = document.getElementById('debug-log');
            if (!this.logContainer) return;
        }

        const time = new Date().toLocaleTimeString('zh-TW', { hour12: false });
        const colors = {
            "ERROR": "#ff4444",
            "SUCCESS": "#00f2ff",
            "WARN": "#ffcc00",
            "INFO": "#00ff00"
        };
        const color = colors[level.toUpperCase()] || colors["INFO"];

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
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // 效能優化：限制日誌數量
        if (this.logContainer.childNodes.length > this.maxLogs) {
            this.logContainer.removeChild(this.logContainer.firstChild);
        }
    }

    escape(str) {
        if (typeof str !== 'string') return String(str);
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    }
}