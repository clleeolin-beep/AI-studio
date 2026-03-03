/**
 * @Core: DebugSystem
 * @Description: 全域報錯監控與偵錯視窗邏輯
 */

const DebugSystem = {
    isOpen: false,

    // 初始化偵錯系統
    init: function() {
        this.log("偵錯系統監控中...", "INFO");
        this.setupErrorHandling();
    },

    // 捕捉全域錯誤 (包含 iframe 報錯)
    setupErrorHandling: function() {
        window.onerror = (msg, url, line) => {
            this.log(`系統錯誤: ${msg} (Line: ${line})`, "ERROR");
            return false;
        };

        // 接收來自 iframe (modules) 的訊息
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'debug') {
                this.log(`[${event.data.module}] ${event.data.msg}`, event.data.level || "INFO");
            }
        });
    },

    // 輸出訊息到偵錯面板
    log: function(msg, level = "INFO") {
        const logEl = document.getElementById('debug-log');
        if (!logEl) return;

        const time = new Date().toLocaleTimeString();
        let color = "#00ff00"; // 預設綠色 (INFO)
        if (level === "ERROR") color = "#ff4444";
        if (level === "SUCCESS") color = "#00f2ff";
        if (level === "WARN") color = "#ffcc00";

        const logItem = document.createElement('div');
        logItem.style.marginBottom = "4px";
        logItem.innerHTML = `<span style="color:#888;">[${time}]</span> <span style="color:${color}; font-weight:bold;">[${level}]</span> ${msg}`;
        
        logEl.appendChild(logItem);
        logEl.scrollTop = logEl.scrollHeight;
    }
};

// 啟動監控
DebugSystem.init();