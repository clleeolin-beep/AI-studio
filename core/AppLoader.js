/**
 * @Core: AppLoader
 * @Version: 2.2.0
 * @Description: 管理 Manifest 載入、分類選單生成與 Iframe 模組切換
 * 支援 manifest.json 中的 Emoji 圖示與分類導航
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
     * 渲染側邊欄選單
     * @param {string} containerId - 側邊欄容器的 DOM ID
     */
    renderMenu(containerId) {
        const menuContainer = document.getElementById(containerId);
        if (!menuContainer) {
            console.error(`[AppLoader] 找不到選單容器: #${containerId}`);
            return;
        }

        // 清空現有選單內容
        menuContainer.innerHTML = '';
        
        const modules = this.manifest.ai_lab_config.modules;
        let lastCategory = "";

        modules.forEach(mod => {
            // 處理分類標題 (如果該模組有分類且與前一個不同)
            if (mod.category && mod.category !== lastCategory) {
                const head = document.createElement('div');
                head.className = 'px-3 py-2 mt-3 small text-uppercase text-muted fw-bold';
                head.style.letterSpacing = '1px';
                head.style.fontSize = '11px';
                head.innerText = mod.category;
                menuContainer.appendChild(head);
                lastCategory = mod.category;
            }

            // 建立選單項目 (a 標籤)
            const item = document.createElement('a');
            item.className = 'nav-link d-flex align-items-center';
            item.href = '#'; // 防止頁面跳轉
            
            // 處理 Emoji 與 名稱
            // 使用 span 包裹 Emoji 確保間距正確
            item.innerHTML = `
                <span class="me-3" style="font-style: normal; width: 20px; text-align: center;">${mod.icon}</span>
                <span>${mod.name}</span>
            `;
            
            // 綁定點擊事件
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchModule(mod, item);
            });

            menuContainer.appendChild(item);
        });

        // 預設載入第一個模組（空間實績地圖）
        if (modules.length > 0) {
            const firstItem = menuContainer.querySelector('.nav-link');
            this.switchModule(modules[0], firstItem);
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

        // 更新選單的 Active 樣式狀態
        document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
        if (el) {
            el.classList.add('active');
        }

        // 同步顯示除錯日誌 (如果全域函式存在)
        if (window.sysLog) {
            window.sysLog(`切換至模組: ${mod.name}`, "ok");
        }

        console.log(`[System] 切換模組: ${mod.name} -> ${mod.path}`);
    }
}