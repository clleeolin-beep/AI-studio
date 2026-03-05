/**
 * @Core: DebugSystem
 * @Version: 2.2.0 (安全加固版)
 * @Description: 全域報錯監控、跨視窗訊息接收與環境分析 (已修復 XSS 與 Origin 漏洞)
 */

const DebugSystem = {
    isOpen: false,
    logContainer: null,

    // 初始化系統
    init: function() {
        window.DebugSystem = this;
        this.logContainer = document.getElementById('debug-log');
        
        this.setupListeners();
        this.log("🚀 深度偵錯系統已啟動，正在監控全域事件 (安全防護已開啟)...", "SUCCESS");
        
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
        }, true);

        // 4. 核心：接收來自 iframe 子頁面的跨視窗訊息 (增加 Origin 驗證)
        window.addEventListener('message', (event) => {
            // [安全加固] 確保訊息來源為同源 (Same-Origin)
            // 若未來需開放特定外部網域，請將其加入白名單比對
            if (event.origin !== window.location.origin) {
                console.warn(`[DebugSystem] 阻擋來自未授權來源的訊息: ${event.origin}`);
                return; 
            }

            // 確保訊息格式符合規範
            if (event.data && event.data.type === 'debug') {
                const module = String(event.data.module || "Unknown");
                const level = String(event.data.level || "INFO");
                const msg = String(event.data.msg || "");
                
                let finalMsg = `[${module}] ${msg}`;
                if (event.data.stack) {
                    finalMsg += `\n└─ 堆疊追蹤: ${String(event.data.stack)}`;
                }
                
                this.log(finalMsg, level);
            }
        });
    },

    /**
     * 輸出訊息至面板 (安全 DOM 操作)
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
        
        // [安全加固] 捨棄 innerHTML，改用 DOM 節點建立以防止 XSS
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

        // 建立時間標籤
        const timeSpan = document.createElement('span');
        timeSpan.style.color = '#666';
        timeSpan.textContent = `[${time}] `;

        // 建立級別標籤
        const levelSpan = document.createElement('span');
        levelSpan.style.color = style.color;
        levelSpan.style.fontWeight = 'bold';
        levelSpan.textContent = `[${level}] `;

        // 建立訊息內容 (textContent 會自動轉義，取代原有的 escapeHTML)
        const msgSpan = document.createElement('span');
        msgSpan.textContent = String(msg);

        // 將子元素加入容器
        logItem.appendChild(timeSpan);
        logItem.appendChild(levelSpan);
        logItem.appendChild(msgSpan);

        this.logContainer.appendChild(logItem);
        
        // 自動滾動到底部
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // 效能優化：限制面板內的訊息數量
        if (this.logContainer.childNodes.length > 200) {
            this.logContainer.removeChild(this.logContainer.firstChild);
        }
    }
    // 註：已移除舊版不安全的 escapeHTML 函數，交由瀏覽器底層處理
};

// 立即啟動
DebugSystem.init();
