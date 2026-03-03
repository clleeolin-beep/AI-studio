/**
 * @Core: DebugSystem
 * @Description: 全域監控與跨視窗訊息接收
 */
const DebugSystem = {
    init: function() {
        window.DebugSystem = this;
        this.setupListeners();
        this.log("監控系統初始化完成", "SUCCESS");
    },

    setupListeners: function() {
        // 監聽主視窗錯誤
        window.onerror = (msg, url, line) => {
            this.log(`[主程式錯誤] ${msg} (Line: ${line})`, "ERROR");
        };

        // 核心：監聽來自 iframe 的 postMessage
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'debug') {
                this.log(`[${e.data.module}] ${e.data.msg}`, e.data.level || "INFO");
            }
        });
    },

    log: function(msg, level = "INFO") {
        const logEl = document.getElementById('debug-log');
        if (!logEl) return;

        const colors = { "ERROR": "#ff4444", "SUCCESS": "#00f2ff", "WARN": "#ffcc00", "INFO": "#00ff00" };
        const color = colors[level] || "#fff";
        const time = new Date().toLocaleTimeString('zh-TW', { hour12: false });

        const div = document.createElement('div');
        div.style.marginBottom = "5px";
        div.innerHTML = `<span style="color:#666">${time}</span> <span style="color:${color}; font-weight:bold;">[${level}]</span> ${msg}`;
        
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
    }
};
DebugSystem.init();