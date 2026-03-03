/**
 * @Core: DebugSystem
 * @Version: 2.1.0 (ES6 Module 強化版)
 * @Description: 全域報錯監控、跨視窗訊息接收與環境分析
 */

export default class DebugSystem {
    /**
     * 建構子：由 index.html 透過 new DebugSystem() 呼叫
     */
    constructor() {
        this.isOpen = false;
        this.logContainer = document.getElementById('debug-log');
        
        // 將實例掛載到全域，方便其他非模組腳本呼叫
        window.DebugSystemInstance = this;
        
        this.setupListeners();
        this.log("🚀 深度偵錯系統已啟動，正在監控全域事件...", "SUCCESS");
        
        // 偵測環境資訊
        const info = `環境偵測: ${navigator.platform} | ${navigator.userAgent.slice(0, 30)}...`;
        this.log(info, "INFO");
    }

    /**
     * 設定全域監聽器
     */
    setupListeners() {
        // 1. 捕捉語法錯誤與執行錯誤
        window.onerror = (msg, url, line, col, error) => {
            const fileName = url ? url.split('/').pop() : '未知檔案';
            let detail = `錯誤: ${msg}\n位置: ${fileName} (第 ${line} 行, 第 ${col} 列)`;
            if (error && error.stack) {
                detail += `\n堆疊: ${error.stack.split('\n').slice(0, 2).join(' -> ')}`;
            }
            this.log(detail, "ERROR");
            return false;
        };

        // 2. 捕捉非同步 Promise 拒絕錯誤
        window.onunhandledrejection = (event) => {
            this.log(`[非同步拒絕] ${event.reason}`, "ERROR");
        };

        // 3. 捕捉資源載入失敗
        window.addEventListener('error', (event) => {
            if (event.target && (event.target.src || event.target.href)) {
                const source = event.target.src || event.target.href;
                this.log(`[資源載入失敗] ${source.split('/').pop()}`, "WARN");
            }
        }, true);

        // 4. 接收跨視窗訊息 (來自 iframe 子頁面)
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'debug') {
                const module = event.data.module || "Unknown";
                const level = event.data.level || "INFO";
                const msg = event.data.msg;
                let finalMsg = `[${module}] ${msg}`;
                if (event.data.stack) {
                    finalMsg += `\n└─ 堆疊: ${event.data.stack}`;
                }
                this.log(finalMsg, level);
            }
        });
    }

    /**
     * 輸出訊息至面板
     * @param {string} msg 訊息內容
     * @param {string} level 級別: INFO, SUCCESS, WARN, ERROR
     */
    log(msg, level = "INFO") {
        // 如果 index.html 沒提供容器，則輸出到 console
        if (!this.logContainer) {
            this.logContainer = document.getElementById('debug-log');
        }

        // 同步在 index.html 的黑框框(sysLog)顯示 (如果存在)
        if (window.sysLog) {
            window.sysLog(msg, level.toLowerCase() === 'error' ? 'err' : (level.toLowerCase() === 'success' ? 'ok' : ''));
        }

        if (!this.logContainer) {
            console.log(`[${level}] ${msg}`);
            return;
        }

        const time = new Date().toLocaleTimeString('zh-TW', { hour12: false });
        const theme = {
            "ERROR": { color: "#ff4444", bg: "rgba(255, 68, 68, 0.1)" },
            "SUCCESS": { color: "#00f2ff", bg: "rgba(0, 242, 255, 0.05)" },
            "WARN": { color: "#ffcc00", bg: "rgba(255, 204, 0, 0.05)" },
            "INFO": { color: "#00ff00", bg: "transparent" }
        };

        const style = theme[level] || theme["INFO"];
        const logItem = document.createElement('div');
        logItem.style.cssText = `
            padding: 4px 8px;
            margin-bottom: 1px;
            border-left: 3px solid ${style.color};
            background: ${style.bg};
            font-family: monospace;
            font-size: 11px;
            white-space: pre-wrap;
        `;

        logItem.innerHTML = `
            <span style="color:#888;">[${time}]</span> 
            <span style="color:${style.color}; font-weight:bold;">[${level}]</span> 
            <span>${this.escapeHTML(msg)}</span>
        `;

        this.logContainer.appendChild(logItem);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        if (this.logContainer.childNodes.length > 100) {
            this.logContainer.removeChild(this.logContainer.firstChild);
        }
    }

    escapeHTML(str) {
        if (typeof str !== 'string') return String(str);
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    }
}