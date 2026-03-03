/**
 * @Core: AppLoader
 * @Description: 管理工具載入、分類選單生成與導覽邏輯
 */

const AppLoader = {
    manifest: null,

    // 初始化啟動
    init: async function() {
        console.log("🧠 AppLoader: 啟動核心中...");
        try {
            // 使用時間戳防止 Manifest 快取
            const response = await fetch('manifest.json?v=' + new Date().getTime());
            if (!response.ok) throw new Error("無法讀取 manifest.json");
            
            this.manifest = await response.json();
            this.renderNavigation();
            
            // 自動載入第一個模組
            if (this.manifest.ai_lab_config.modules.length > 0) {
                const firstMod = this.manifest.ai_lab_config.modules[0];
                this.switchModule(firstMod, document.querySelector('.menu-item'));
            }

            if (window.DebugSystem) {
                DebugSystem.log(`系統版本: ${this.manifest.ai_lab_config.version} 載入成功`, 'SUCCESS');
            }
        } catch (error) {
            console.error("核心啟動失敗:", error);
            if (window.DebugSystem) DebugSystem.log("Manifest 載入失敗: " + error.message, 'ERROR');
        }
    },

    // 生成左側選單（含分類標題）
    renderNavigation: function() {
        const menuList = document.getElementById('menu-list');
        if (!menuList) return;
        
        menuList.innerHTML = ""; 
        const modules = this.manifest.ai_lab_config.modules;
        
        let lastCategory = "";

        modules.forEach(mod => {
            // --- 處理分類標題 ---
            if (mod.category && mod.category !== lastCategory) {
                const catHeader = document.createElement('div');
                catHeader.className = 'category-header';
                catHeader.innerText = mod.category;
                menuList.appendChild(catHeader);
                lastCategory = mod.category;
            }

            // --- 建立功能項目 ---
            const item = document.createElement('div');
            item.className = 'menu-item';
            item.setAttribute('data-id', mod.id);
            item.innerHTML = `
                <div class="menu-icon">${mod.icon || '📦'}</div>
                <span>${mod.name}</span>
            `;
            
            item.onclick = () => this.switchModule(mod, item);
            menuList.appendChild(item);
        });
    },

    // 切換視圖
    switchModule: function(mod, element) {
        const frame = document.getElementById('content-frame');
        const statusMsg = document.getElementById('system-msg');
        
        if (frame && mod) {
            frame.src = mod.path;
            
            // UI 反饋
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
            if (element) element.classList.add('active');
            
            if (statusMsg) statusMsg.innerText = `目前位置: ${mod.name}`;
            
            if (window.DebugSystem) {
                DebugSystem.log(`載入視圖: ${mod.name} -> ${mod.path}`, 'INFO');
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', () => AppLoader.init());