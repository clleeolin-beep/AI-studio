/**
 * @Core: AppLoader
 * @Version: 2.2.1
 * @Description: 管理 Manifest 分類選單生成、摺疊收合與模組切換
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
            // 建立分類標題 (category-item)
            const catHeader = document.createElement('div');
            catHeader.className = 'category-item';
            catHeader.innerHTML = `
                <span>${catName}</span>
                <i class="bi bi-chevron-down"></i>
            `;

            // 建立模組群組容器 (module-group)
            const groupDiv = document.createElement('div');
            groupDiv.className = 'module-group';

            // 綁定收合事件
            catHeader.addEventListener('click', () => {
                groupDiv.classList.toggle('collapsed');
                catHeader.classList.toggle('collapsed');
            });

            // 填充該分類下的模組
            groups[catName].forEach(mod => {
                const item = document.createElement('a');
                item.className = 'nav-link d-flex align-items-center';
                item.href = '#';
                
                // 處理 Emoji 圖示與名稱
                item.innerHTML = `
                    <span class="me-3" style="font-style: normal; width: 20px; text-align: center;">${mod.icon}</span>
                    <span>${mod.name}</span>
                `;
                
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation(); // 防止觸發分類收合
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

        // 切換 Iframe 地址
        if (mod.path) {
            frame.src = mod.path;
        }

        // 更新選單的 Active 狀態
        document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
        if (el) {
            el.classList.add('active');
        }

        // 同步顯示除錯日誌
        if (window.sysLog) {
            window.sysLog(`載入模組: ${mod.name}`, "success");
        }

        console.log(`[System] 切換模組: ${mod.name} -> ${mod.path}`);
    }
}