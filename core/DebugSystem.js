/**
 * @Core: DebugSystem
 * @Version: 2.1.0 (深度監控強化版)
 * @Description: 全域報錯監控、跨視窗訊息接收與環境分析
 */

const DebugSystem = {
    isOpen: false,
    logContainer: null,

    // 初始化系統
    init: function() {
        window.DebugSystem = this;
        this.logContainer = document.getElementById('debug-log');
        
        this.setupListeners();
        this.log("🚀 深度偵錯系統已啟動，正在監控全域事件...", "SUCCESS");
        
        // 偵測環境資訊
        const info = `瀏覽器: ${navigator.userAgent.slice(0, 50)}...`;
        this.log(info, "INFO");
    },

    // 設定所有監聽器
    setupListeners: function() {
        // 1. 捕捉語法錯誤與執行錯誤 (包含堆疊追蹤)
        window.onerror = (msg, url, line, col, error) => {
            const fileName = url ? url.split('/').pop() : '未知檔案';
            let detail = `錯誤: ${msg}\n位置: ${fileName} (第 ${line} 行, 第 ${col} 列)`;
            if (error && error.stack) {
                detail += `\n堆疊: ${error.stack.split('\n').slice(0, 3).join(' -> ')}`;
            }
            this.log(detail, "ERROR");
            return false;
        };

        // 2. 捕捉非同步 Promise 拒絕錯誤 (例如 API 失敗沒寫 catch)
        window.onunhandledrejection = (event) => {
            this.log(`[非同步拒絕] ${event.reason}`, "ERROR");
        };

        // 3. 捕捉資源載入失敗 (例如圖片、Script CDN 斷線)
        window.addEventListener('error', (event) => {
            if (event.target && (event.target.src || event.target.href)) {
                const source = event.target.src || event.target.href;
                this.log(`[資源載入失敗] ${source.split('/').pop()}`, "WARN");
            }
        }, true); // 注意：必須在捕捉階段監聽

        // 4. 核心：接收來自 iframe 子頁面的跨視窗訊息
        window.addEventListener('message', (event) => {
            // 確保訊息格式符合規範
            if (event.data && event.data.type === 'debug') {
                const module = event.data.module || "Unknown";
                const level = event.data.level || "INFO";
                const msg = event.data.msg;
                
                // 如果訊息中包含 stack，進行深度格式化
                let finalMsg = `[${module}] ${msg}`;
                if (event.data.stack) {
                    finalMsg += `\n└─ 堆疊追蹤: ${event.data.stack}`;
                }
                
                this.log(finalMsg, level);
            }
        });
    },

    /**
     * 輸出訊息至面板
     * @param {string} msg 訊息內容
     * @param {string} level 級別: INFO, SUCCESS, WARN, ERROR, DEBUG
     */
    log: function(msg, level = "INFO") {
        if (!this.logContainer) {
            this.logContainer = document.getElementById('debug-log');
            if (!this.logContainer) return;
        }

        const time = new Date().toLocaleTimeString('zh-TW', { hour12: false });
        
        // 定義各級別顏色
        const theme = {
            "ERROR": { color: "#ff4444", bg: "rgba(255, 68, 68, 0.1)" },
            "SUCCESS": { color: "#00f2ff", bg: "rgba(0, 242, 255, 0.05)" },
            "WARN": { color: "#ffcc00", bg: "rgba(255, 204, 0, 0.05)" },
            "INFO": { color: "#00ff00", bg: "transparent" },
            "DEBUG": { color: "#888888", bg: "transparent" }
        };

        const style = theme[level] || theme["INFO"];
        
        const logItem = document.createElement('div');
        logItem.style.cssText = `
            padding: 6px 10px;
            margin-bottom: 2px;
            border-left: 3px solid ${style.color};
            background: ${style.bg};
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 11px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-all;
        `;

        logItem.innerHTML = `
            <span style="color:#666;">[${time}]</span> 
            <span style="color:${style.color}; font-weight:bold;">[${level}]</span> 
            <span>${this.escapeHTML(msg)}</span>
        `;

        this.logContainer.appendChild(logItem);
        
        // 自動滾動到底部
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // 效能優化：限制面板內的訊息數量，超過 200 條自動刪除舊的
        if (this.logContainer.childNodes.length > 200) {
            this.logContainer.removeChild(this.logContainer.firstChild);
        }
    },

    // 防止 HTML 注入的工具函數
    escapeHTML: function(str) {
        return str.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;', '<': '&lt;', '>': '&gt;',
                '"': '&quot;', "'": '&#39;'
            }[m];
        });
    }
};

// 立即啟動
DebugSystem.init();