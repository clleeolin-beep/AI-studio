/**
 * @Core: AppLoader
 * @Version: 2.3.0 (Optimized)
 * @Description: 管理 Manifest 分類選單生成、摺疊收合與模組切換。
 * 強化點：新增 Iframe 生命週期監控與 DebugSystem 通訊橋接。
 */

export default class AppLoader {
    /**
     * 初始化 AppLoader
     * @param {Object} manifest - 傳入已加載的 JSON 配置
     */
    constructor(manifest) {
        if (!manifest || !manifest.ai_lab_config) {
            console.error("[AppLoader] 無效的 Manifest 配置");
            return;
        }
        this.manifest = manifest;
        this.activeModule = null;
        console.log("🧠 AppLoader 類別實例化成功");
    }

    /**
     * 渲染側邊欄選單 (支援分類收合)
     * @param {string} containerId - 側邊欄容器的 DOM ID
     */
    renderMenu(containerId) {
        const menuContainer = document.getElementById(containerId);
        if (!menuContainer) {
            console.error(`[AppLoader] 找不到選單容器: #${containerId}`);
            return;
        }

        menuContainer.innerHTML = '';
        const modules = this.manifest.ai_lab_config.modules;

        // 1. 將模組按分類分組
        const groups = {};
        modules.forEach(mod => {
            const cat = mod.category || "未分類";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(mod);
        });

        // 2. 遍歷分組並生成 HTML
        Object.keys(groups).forEach(catName => {
            const catHeader = document.createElement('div');
            catHeader.className = 'category-item';
            catHeader.innerHTML = `
                <span>${catName}</span>
                <i class="bi bi-chevron-down"></i>
            `;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'module-group';

            catHeader.addEventListener('click', () => {
                groupDiv.classList.toggle('collapsed');
                catHeader.classList.toggle('collapsed');
            });

            groups[catName].forEach(mod => {
                const item = document.createElement('a');
                item.className = 'nav-link d-flex align-items-center';
                item.href = '#';
                
                item.innerHTML = `
                    <span class="me-3" style="font-style: normal; width: 20px; text-align: center;">${mod.icon}</span>
                    <span>${mod.name}</span>
                `;
                
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation(); 
                    this.switchModule(mod, item);
                });

                groupDiv.appendChild(item);
            });

            menuContainer.appendChild(catHeader);
            menuContainer.appendChild(groupDiv);
        });

        // 3. 預設啟動：載入第一個分類的第一個項目
        const firstLink = menuContainer.querySelector('.nav-link');
        if (firstLink && modules.length > 0) {
            this.switchModule(modules[0], firstLink);
        }
    }

    /**
     * 切換主視窗內容
     * @param {Object} mod - 模組資料物件
     * @param {HTMLElement} el - 點擊的選單元素
     */
    switchModule(mod, el) {
        const frame = document.getElementById('main-frame');
        if (!frame) {
            console.error("[AppLoader] 找不到主框架 #main-frame");
            return;
        }

        // 避免重複載入相同模組
        if (this.activeModule === mod.name) return;

        // 重置 Iframe 監聽器，確保舊的事件不會干擾新的模組
        frame.onload = null;

        // 設置生命週期 Hook：當模組載入完成時
        frame.onload = () => {
            this._handleModuleLoaded(mod, frame);
        };

        // 切換 Iframe 地址
        if (mod.path) {
            this.activeModule = mod.name;
            frame.src = mod.path;
        }

        // 更新 UI 狀態
        document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
        if (el) el.classList.add('active');

        console.log(`[System] 準備切換至: ${mod.name} -> ${mod.path}`);
    }

    /**
     * 內部生命週期處理：模組載入完成後
     * @private
     */
    _handleModuleLoaded(mod, frame) {
        // 1. 同步顯示除錯日誌 (至主介面的 sysLog)
        if (window.sysLog) {
            window.sysLog(`載入模組: ${mod.name}`, "success");
        }

        // 2. 核心通訊校驗：通知 DebugSystem 重新檢查 Iframe
        // 如果父視窗有 DebugSystem，則在此主動標記連線
        console.log(`[System] 模組 [${mod.name}] 已載入完成，通訊管道建立中...`);

        // 3. 針對 MapEditor 等複雜模組進行自動初始化訊號
        try {
            frame.contentWindow.postMessage({
                source: 'AI_STUDIO_CORE',
                type: 'MODULE_MOUNTED',
                payload: { name: mod.name, time: Date.now() }
            }, '*');
        } catch (e) {
            console.warn("[AppLoader] 跨域限制，無法發送 MOUNTED 訊號");
        }
    }
}