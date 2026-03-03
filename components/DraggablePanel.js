/**
 * @fileoverview DraggablePanel.js - 惇陽 AI 實驗室 互動 UI 模組 v1.1
 * [分組模塊邏輯：依賴檢查與守衛邏輯]
 * 功能：建立可拖移、最小化、支援動態內容注入的浮動面板。
 */

// --- 模組防禦性檢查 ---
if (typeof document === 'undefined') {
    console.error('[DraggablePanel] 嚴重錯誤：此模組僅支援瀏覽器環境。');
}

class DraggablePanel {
    /**
     * @param {Object} options - 配置參數
     */
    constructor(options) {
        this.options = {
            id: 'default',
            title: '系統面板',
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
     * [分組一：DOM 結構建立]
     * @private
     */
    _init() {
        // 1. 建立主容器
        this.container = document.createElement('div');
        this.container.id = `panel-${this.options.id}`;
        this.container.className = 'ai-lab-panel shadow-lg';
        Object.assign(this.container.style, {
            position: 'absolute',
            width: `${this.options.width}px`,
            top: `${this.options.top}px`,
            left: `${this.options.left}px`,
            zIndex: '1050', 
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #ddd',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            transition: 'width 0.3s ease'
        });

        // 2. 建立標題欄 (拖移點) - 使用實驗室招牌配色
        this.header = document.createElement('div');
        this.header.className = 'panel-header d-flex justify-content-between align-items-center p-2';
        Object.assign(this.header.style, {
            backgroundColor: '#212529',
            color: '#00f2ff', 
            cursor: 'move',
            userSelect: 'none',
            fontSize: '14px',
            fontWeight: '600'
        });
        this.header.innerHTML = `
            <span class="ms-2"><i class="bi bi-grid-3x3-gap-fill me-2"></i>${this.options.title}</span>
            <div class="header-controls d-flex gap-2 pe-1">
                <button class="btn btn-sm text-white p-0 minimize-btn" title="最小化"><i class="bi bi-dash-lg"></i></button>
                ${this.options.isClosable ? '<button class="btn btn-sm text-white p-0 close-btn" title="關閉"><i class="bi bi-x-lg"></i></button>' : ''}
            </div>
        `;

        // 3. 建立內容區
        this.body = document.createElement('div');
        this.body.className = 'panel-body p-3';
        Object.assign(this.body.style, {
            maxHeight: '75vh',
            overflowY: 'auto',
            backgroundColor: '#f8f9fa'
        });

        this.container.appendChild(this.header);
        this.container.appendChild(this.body);
        document.body.appendChild(this.container);

        this._bindEvents();
    }

    /**
     * [分組二：交互與拖拽邏輯]
     * @private
     */
    _bindEvents() {
        let isDragging = false;
        let offsetX, offsetY;

        // 拖拽啟動
        this.header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            isDragging = true;
            offsetX = e.clientX - this.container.offsetLeft;
            offsetY = e.clientY - this.container.offsetTop;
            this.container.style.zIndex = '1100'; // 點擊時暫時置於最頂層
            this.container.style.transition = 'none'; // 拖動時關閉動畫以防延遲
        });

        // 拖拽移動
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            let left = e.clientX - offsetX;
            let top = e.clientY - offsetY;
            
            // 邊界檢查：防止面板移出視窗
            const maxX = window.innerWidth - this.container.offsetWidth;
            const maxY = window.innerHeight - this.header.offsetHeight;
            left = Math.max(0, Math.min(left, maxX));
            top = Math.max(0, Math.min(top, maxY));

            this.container.style.left = `${left}px`;
            this.container.style.top = `${top}px`;
        });

        // 拖拽停止
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.container.style.zIndex = '1050';
                this.container.style.transition = 'width 0.3s ease';
            }
        });

        // 最小化控制
        this.header.querySelector('.minimize-btn').addEventListener('click', () => this.toggleMinimize());

        // 關閉控制
        if (this.options.isClosable) {
            this.header.querySelector('.close-btn').addEventListener('click', () => this.destroy());
        }
    }

    /**
     * [分組三：外部接口 - 內容注入]
     * @param {string|HTMLElement} content 
     */
    setContent(content) {
        if (typeof content === 'string') {
            this.body.innerHTML = content;
        } else {
            this.body.innerHTML = '';
            this.body.appendChild(content);
        }
        this.log(`內容已更新: ${this.options.id}`);
    }

    /**
     * [分組四：狀態管理]
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        if (this.isMinimized) {
            this.body.style.display = 'none';
            this.container.style.width = '180px';
        } else {
            this.body.style.display = 'block';
            this.container.style.width = `${this.options.width}px`;
        }
        this.log(`面板狀態: ${this.isMinimized ? '最小化' : '展開'}`);
    }

    /**
     * [分組五：系統銷毀與日誌]
     */
    destroy() {
        this.container.remove();
        this.log(`面板 ${this.options.id} 已關閉並銷毀`);
    }

    log(msg) {
        if (window.parent && typeof window.parent.postMessage === 'function') {
            window.parent.postMessage({ type: 'debug', module: 'DraggablePanel', msg: msg }, '*');
        }
    }
}

export default DraggablePanel;