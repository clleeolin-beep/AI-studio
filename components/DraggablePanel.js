/**
 * @fileoverview DraggablePanel.js - 專業級可拖移視窗組件
 * 專為 AI 實驗室地圖編輯器設計，支援滑鼠拖拽、最小化及高度自定義。
 * @author AI Lab Assistant
 * @version 1.0.0
 */

/**
 * @typedef {Object} PanelOptions
 * @property {string} id - 視窗的唯一 ID
 * @property {string} title - 視窗標題
 * @property {number} [width=350] - 初始寬度
 * @property {number} [top=20] - 初始頂部距離 (px)
 * @property {number} [left=20] - 初始左側距離 (px)
 * @property {boolean} [isClosable=true] - 是否顯示關閉按鈕
 */

class DraggablePanel {
    /**
     * 初始化可拖移面板
     * @param {PanelOptions} options - 配置參數
     */
    constructor(options) {
        this.options = {
            width: 350,
            top: 20,
            left: 20,
            isClosable: true,
            ...options
        };

        this.isMinimized = false;
        this.container = null;
        this.header = null;
        this.body = null;

        this._init();
    }

    /**
     * 私有初始化方法，建立 DOM 結構與綁定事件
     * @private
     */
    _init() {
        // 建立主容器
        this.container = document.createElement('div');
        this.container.id = `panel-${this.options.id}`;
        this.container.className = 'ai-lab-panel shadow-lg';
        Object.assign(this.container.style, {
            position: 'absolute',
            width: `${this.options.width}px`,
            top: `${this.options.top}px`,
            left: `${this.options.left}px`,
            zIndex: '1000',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #ddd',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        });

        // 建立標題欄 (拖移點)
        this.header = document.createElement('div');
        this.header.className = 'panel-header d-flex justify-content-between align-items-center p-2';
        Object.assign(this.header.style, {
            backgroundColor: '#2c3e50',
            color: '#ecf0f1',
            cursor: 'move',
            userSelect: 'none',
            fontSize: '14px',
            fontWeight: '600'
        });
        this.header.innerHTML = `
            <span class="ms-2"><i class="bi bi-pencil-square me-1"></i>${this.options.title}</span>
            <div class="header-controls d-flex gap-2 pe-2">
                <button class="btn btn-sm text-white p-0 minimize-btn" title="最小化"><i class="bi bi-dash-lg"></i></button>
                ${this.options.isClosable ? '<button class="btn btn-sm text-white p-0 close-btn" title="關閉"><i class="bi bi-x-lg"></i></button>' : ''}
            </div>
        `;

        // 建立內容區
        this.body = document.createElement('div');
        this.body.className = 'panel-body p-3';
        Object.assign(this.body.style, {
            maxHeight: '70vh',
            overflowY: 'auto',
            backgroundColor: '#f8f9fa'
        });

        this.container.appendChild(this.header);
        this.container.appendChild(this.body);
        document.body.appendChild(this.container);

        this._bindEvents();
    }

    /**
     * 綁定拖拽與控制事件
     * @private
     */
    _bindEvents() {
        let isDragging = false;
        let offsetX, offsetY;

        // 拖拽邏輯
        this.header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return; // 點擊按鈕不觸發拖拽
            isDragging = true;
            offsetX = e.clientX - this.container.offsetLeft;
            offsetY = e.clientY - this.container.offsetTop;
            this.container.style.zIndex = '1001'; // 置頂
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            
            // 邊界檢查 (可選)
            this.container.style.left = `${left}px`;
            this.container.style.top = `${top}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // 最小化邏輯
        const minBtn = this.header.querySelector('.minimize-btn');
        minBtn.addEventListener('click', () => this.toggleMinimize());

        // 關閉邏輯
        if (this.options.isClosable) {
            const closeBtn = this.header.querySelector('.close-btn');
            closeBtn.addEventListener('click', () => this.destroy());
        }
    }

    /**
     * 切換最小化狀態
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        if (this.isMinimized) {
            this.body.style.display = 'none';
            this.container.style.width = '200px';
        } else {
            this.body.style.display = 'block';
            this.container.style.width = `${this.options.width}px`;
        }
    }

    /**
     * 將 HTML 內容注入面板內容區
     * @param {string|HTMLElement} content 
     */
    setContent(content) {
        if (typeof content === 'string') {
            this.body.innerHTML = content;
        } else {
            this.body.innerHTML = '';
            this.body.appendChild(content);
        }
    }

    /**
     * 銷毀面板
     */
    destroy() {
        this.container.remove();
        // 通知 DebugSystem (若存在)
        if (window.DebugSystem) {
            window.DebugSystem.log('UI', `Panel ${this.options.id} destroyed.`);
        }
    }
}

// 導出模組
export default DraggablePanel;