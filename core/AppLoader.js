/**
 * @Core: AppLoader
 * @Description: 負責管理全平台工具的載入、導覽與 Manifest 解析
 */

const AppLoader = {
    manifest: null,

    // 系統初始化啟動
    init: async function() {
        console.log("🧠 AppLoader 正在啟動核心...");
        try {
            // 加上快取清除機制，確保抓到最新的 manifest
            const response = await fetch('manifest.json?v=' + new Date().getTime());
            if (!response.ok) throw new Error("無法讀取 manifest.json");
            
            this.manifest = await response.json();
            this.renderNavigation();
            
            // 預設載入第一個模組 (通常是地圖)
            if (this.manifest.ai_lab_config.modules.length > 0) {
                const firstMod = this.manifest.ai_lab_config.modules[0];
                const frame = document.getElementById('content-frame');
                if (frame) frame.src = firstMod.path;
            }

            if (window.DebugSystem) {
                DebugSystem.log(`系統版本: ${this.manifest.ai_lab_config.version} 載入成功`, 'SUCCESS');
            }
        } catch (error) {
            console.error("核心啟動失敗:", error);
            if (window.DebugSystem) DebugSystem.log("Manifest 載入失敗: " + error.message, 'ERROR');
        }
    },

    // 根據 Manifest 內容生成左側選單
    renderNavigation: function() {
        const menuList = document.getElementById('menu-list');
        if (!menuList) return;
        
        menuList.innerHTML = ""; // 清空現有選單
        const modules = this.manifest.ai_lab_config.modules;

        modules.forEach(mod => {
            const item = document.createElement('div');
            item.className = 'menu-item';
            item.innerHTML = `<span>${mod.icon || '📦'} ${mod.name}</span>`;
            item.onclick = () => this.switchModule(mod, item);
            
            // 初始標記地圖為啟動
            if (mod.id === "MapEditor") item.classList.add('active');
            
            menuList.appendChild(item);
        });
    },

    // 執行模組切換
    switchModule: function(mod, element) {
        const frame = document.getElementById('content-frame');
        const statusMsg = document.getElementById('system-msg');
        
        if (frame) {
            frame.src = mod.path;
            
            // 更新 UI 狀態
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
            element.classList.add('active');
            
            // 更新狀態文字
            if (statusMsg) statusMsg.innerText = `目前位置: ${mod.name}`;
            
            // 紀錄到偵錯視窗
            if (window.DebugSystem) {
                DebugSystem.log(`載入模組: ${mod.name} (${mod.path})`, 'INFO');
            }
        }
    }
};

// 確保 DOM 載入後啟動
window.addEventListener('DOMContentLoaded', () => AppLoader.init());