/**
 * @fileoverview DebugSystem - 系統偵錯核心模組
 * @module core/DebugSystem
 * @description 負責全域日誌攔截、異常監控及偵錯視窗的 UI 渲染。
 */

class DebugSystem {
    constructor() {
        this.logs = [];
        this.isVisible = false;
        this.dom = null;
        this.init();
    }

    init() {
        this._createUI();
        this._interceptConsole();
        this._setupMessageListener();
        console.log("[DebugSystem] 核心已啟動，監聽模式：Active");
    }

    _setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.data && event.data.source === 'AI_STUDIO_APP') {
                const { level, msg, module } = event.data;
                const logLevel = level ? level.toLowerCase() : 'info';
                this.addLog(logLevel, `[${module || 'Remote'}] ${msg || '未提供訊息內容'}`);
            }
        });
    }

    _interceptConsole() {
        const types = ['log', 'warn', 'error', 'debug'];
        types.forEach(type => {
            const original = console[type];
            console[type] = (...args) => {
                this.addLog(type, args.join(' '));
                original.apply(console, args);
            };
        });
    }

    addLog(type, msg) {
        const entry = {
            type,
            msg,
            time: new Date().toLocaleTimeString('zh-TW', { hour12: false })
        };
        this.logs.push(entry);
        this._renderLog(entry);
    }

    _createUI() {
        if (document.getElementById('debug-window')) return;

        const container = document.createElement('div');
        container.id = 'debug-window';
        container.style.cssText = `
            position: fixed; bottom: 0; right: 0; width: 400px; height: 300px;
            background: rgba(0, 0, 0, 0.85); color: #00ff00; font-family: monospace;
            z-index: 9999; overflow-y: auto; padding: 10px; font-size: 12px;
            border-top: 2px solid #444; display: none; pointer-events: auto;
        `;
        this.dom = container;
        document.body.appendChild(container);

        window.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'd') this.toggle();
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.dom.style.display = this.isVisible ? 'block' : 'none';
    }

    _renderLog(entry) {
        if (!this.dom) return;
        const line = document.createElement('div');
        line.style.borderBottom = '1px solid #222';
        line.style.padding = '2px 0';
        
        const colors = { error: '#ff4444', warn: '#ffbb33', info: '#00ff00', success: '#00ffff' };
        const color = colors[entry.type] || '#ffffff';

        line.innerHTML = `
            <span style="color: #888">[${entry.time}]</span> 
            <span style="color: ${color}">[${entry.type.toUpperCase()}]</span> 
            <span>${entry.msg}</span>
        `;
        this.dom.appendChild(line);
        this.dom.scrollTop = this.dom.scrollHeight;
    }
}

export const debugSystem = new DebugSystem();