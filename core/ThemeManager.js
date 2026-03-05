/**
 * @Core: ThemeManager
 * @Description: 管理系統 UI 主題切換與 GitHub 動態日誌整合 (v2.5 Pro)
 */

export const ThemeManager = {
    // 預設 8 種風格矩陣
    themes: [
        'theme-ty-pro',        // 惇陽專業 (預設/工程)
        'theme-elegant',       // 典雅大地 (景觀/設計)
        'theme-paper',         // 紙感文青 (文青/設計)
        'theme-kawaii',        // 萌點開發 (可愛)
        'theme-steel',         // 鋼鐵結構 (工程)
        'theme-studio',        // 清新工作 (文青/藝術)
        'theme-art-gallery',   // 藝術畫廊 (藝術)
        'theme-nebula'         // 幻彩星雲 (隨機/創意)
    ],

    /**
     * @description 初始化系統，隨機套用主題
     */
    initRandomTheme: function() {
        const randomIndex = Math.floor(Math.random() * this.themes.length);
        const selectedTheme = this.themes[randomIndex];
        this.applyTheme(selectedTheme);
        return selectedTheme;
    },

    /**
     * @description 套用特定主題
     * @param {string} themeName 主題 Class 名稱
     */
    applyTheme: function(themeName) {
        // 移除舊主題
        document.body.classList.remove(...this.themes);
        // 加入新主題
        document.body.classList.add(themeName);
        
        if (window.sysLog) {
            window.sysLog(`視覺風格已套用: ${themeName}`, 'info');
        }
    },

    /**
     * @description 從 GitHub 抓取更新日誌並渲染
     * @param {string} repoPath GitHub 儲存庫路徑 (格式: "擁有者/儲存庫")
     * @param {string} elementId 要渲染的 DOM 元素 ID
     */
    fetchGitHubLogs: async function(repoPath = "clleeolin-beep/ai-studio", elementId = "github-commits-list") {
        const listContainer = document.getElementById(elementId);
        if (!listContainer) return;

        try {
            // 使用 GitHub Public API 獲取最新 5 筆 Commits
            const response = await fetch(`https://api.github.com/repos/${repoPath}/commits?per_page=5`);
            if (!response.ok) throw new Error(`API 請求失敗: ${response.status}`);
            
            const commits = await response.json();
            
            listContainer.innerHTML = commits.map(item => {
                const date = new Date(item.commit.author.date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
                // 擷取第一行作為標題
                const message = item.commit.message.split('\n')[0]; 
                return `
                    <div class="commit-item">
                        <span class="commit-date">${date}</span>
                        <span class="commit-msg" title="${item.commit.message}">${message}</span>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error("GitHub API 讀取失敗", error);
            listContainer.innerHTML = `<div class="text-muted small">目前無法取得更新日誌 (${error.message})</div>`;
        }
    }
};