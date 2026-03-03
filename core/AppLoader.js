/**
 * @Core: AppLoader
 * @Description: 管理 Manifest 載入、分類選單生成
 */
const AppLoader = {
    manifest: null,
    init: async function() {
        console.log("🧠 AppLoader 啟動...");
        try {
            const resp = await fetch('manifest.json?v=' + Date.now());
            this.manifest = await resp.json();
            this.renderNavigation();
            if (this.manifest.ai_lab_config.modules.length > 0) {
                const first = this.manifest.ai_lab_config.modules[0];
                this.switchModule(first, document.querySelector('.menu-item'));
            }
        } catch (e) {
            console.error("載入失敗", e);
        }
    },
    renderNavigation: function() {
        const menuList = document.getElementById('menu-list');
        const modules = this.manifest.ai_lab_config.modules;
        let lastCat = "";
        modules.forEach(mod => {
            if (mod.category && mod.category !== lastCat) {
                const head = document.createElement('div');
                head.className = 'category-header';
                head.innerText = mod.category;
                menuList.appendChild(head);
                lastCat = mod.category;
            }
            const item = document.createElement('div');
            item.className = 'menu-item';
            item.innerHTML = `<div class="menu-icon">${mod.icon}</div><span>${mod.name}</span>`;
            item.onclick = () => this.switchModule(mod, item);
            menuList.appendChild(item);
        });
    },
    switchModule: function(mod, el) {
        const frame = document.getElementById('content-frame');
        if (!frame || !mod) return;
        frame.src = mod.path;
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        if (el) el.classList.add('active');
        document.getElementById('system-msg').innerText = `目前位置: ${mod.name}`;
        if (window.DebugSystem) DebugSystem.log(`切換工具: ${mod.name}`, "INFO");
    }
};
window.addEventListener('DOMContentLoaded', () => AppLoader.init());