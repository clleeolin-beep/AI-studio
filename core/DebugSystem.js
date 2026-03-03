/**
 * @fileoverview DebugSystem - 系統偵錯核心模組
 * @module core/DebugSystem
 * @description 負責全域日誌攔截、異常監控及偵錯視窗的 UI 渲染。
 * 支援跨 Context (Iframe) 的訊息彙整。
 */

class DebugSystem {
    constructor() {
        /** @type {Array<{type: string, msg: any, time: string}>} 日誌儲存池 */
        this.logs = [];
        this.isVisible = false;
        this.dom = null;
        
        this.init();
    }

    /**
     * 初始化偵錯系統
     * 設置全域攔截與跨域通訊監聽
     */
    init() {
        this._createUI();
        this._interceptConsole();
        this._setupMessageListener();
        
        console.log("[DebugSystem] 核心已啟動，監聽模式：Active");
    }

    /**
     * 設置跨視窗訊息監聽器 (Middleware)
     * 用於接收來自 MapEditor 或其他模組的獨立日誌
     * @private
     */
    _setupMessageListener() {
        window.addEventListener('message', (event) => {
            // 僅處理特定類型的偵錯訊息
            if (event.data && event.data.source === 'AI_STUDIO_APP') {
                const { type, content } = event.data;
                this.addLog(type || 'info', `[Remote] ${content}`);
            }
        });
    }

    /**
     * 攔截原生 Console 物件
     * @private
     */
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

    /**
     * 新增日誌項並觸發 UI 更新
     * @param {string} type - 日誌等級 (log, error, etc.)
     * @param {string} msg - 訊息內容
     */
    addLog(type, msg) {
        const entry = {
            type,
            msg,
            time: new Date().toLocaleTimeString('zh-TW', { hour12: false })
        };
        this.logs.push(entry);
        this._renderLog(entry);
    }

    /**
     * 建立偵錯視窗 DOM
     * @private
     */
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

        // 快捷鍵切換 (Alt + D)
        window.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'd') this.toggle();
        });
    }

    /**
     * 切換偵錯視窗顯示狀態
     */
    toggle() {
        this.isVisible = !this.isVisible;
        this.dom.style.display = this.isVisible ? 'block' : 'none';
    }

    /**
     * 將日誌渲染至 UI
     * @private
     * @param {Object} entry 
     */
    _renderLog(entry) {
        if (!this.dom) return;
        const line = document.createElement('div');
        line.style.borderBottom = '1px solid #222';
        line.style.padding = '2px 0';
        
        const colors = { error: '#ff4444', warn: '#ffbb33', info: '#00ff00' };
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

// 導出單例
export const debugSystem = new DebugSystem();