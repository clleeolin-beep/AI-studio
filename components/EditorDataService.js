/**
 * @fileoverview EditorDataService.js - 惇陽 AI 實驗室 資料服務模組 v2.1
 * [分組模塊邏輯：依賴檢查與守衛邏輯]
 * 具備欄位對調自適應、動態分類提取、複選過濾及 WKT 強化處理功能。
 */

if (typeof fetch === 'undefined') {
    console.error('[EditorDataService] 嚴重錯誤：環境不支援 Fetch API');
}

class EditorDataService {
    /**
     * @param {string} sheetId 
     * @param {string} gid 
     */
    constructor(sheetId, gid = '0') {
        this.sheetId = sheetId;
        this.gid = gid;
        this.rawRecords = [];
        this.headerMap = {};
        this.isLoaded = false;
        
        // [分組一：欄位名稱配置表] - 支援未來欄位更名
        this.fieldConfig = {
            id: '案號',
            wkt: '座標',
            name: '案件簡稱',
            fullName: '契約案名',
            category: '類別',
            type: '類型',
            status: '案件狀態'
        };

        this.categoryData = { class: [], type: [], status: [] };
    }

    /**
     * [分組二：資料獲取與索引建立]
     */
    async fetchSheetData() {
        const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/export?format=csv&gid=${this.gid}`;
        try {
            const response = await fetch(url);
            const csvText = await response.text();
            
            const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 1) return [];

            const headers = this._parseCSVLine(lines[0]);
            this.headerMap = {};
            headers.forEach((h, index) => {
                this.headerMap[h.trim()] = index;
            });

            this.rawRecords = lines.slice(1).map(line => {
                const values = this._parseCSVLine(line);
                return this._createProxyObject(values);
            });

            this._autoExtractCategories();
            this.isLoaded = true;
            
            this.log(`資料載入完成，共偵測到 ${this.rawRecords.length} 筆案件`, "SUCCESS");
            return this.rawRecords;
        } catch (error) {
            this.log(`資料讀取失敗: ${error.message}`, "ERROR");
            return [];
        }
    }

    /**
     * [分組三：CSV 解析核心 (私有)]
     */
    _parseCSVLine(line) {
        // 修正：針對 WKT 內部可能存在的雙重與三重引號進行深度清理
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        return line.split(regex).map(val => {
            let clean = val.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
            if (clean.startsWith('"') && clean.endsWith('"')) {
                clean = clean.substring(1, clean.length - 1);
            }
            return clean;
        });
    }

    _createProxyObject(values) {
        const obj = {};
        for (const [key, columnName] of Object.entries(this.fieldConfig)) {
            const index = this.headerMap[columnName];
            obj[key] = (index !== undefined) ? values[index] : '';
        }
        return obj;
    }

    /**
     * [分組四：搜尋與複選過濾邏輯 (新增項目)]
     * @param {string} query - 關鍵字
     * @param {Object} filters - 分類勾選狀態 { class: [], status: [] }
     */
    search(query, filters = {}) {
        if (!query && (!filters.class || filters.class.length === 0) && (!filters.status || filters.status.length === 0)) {
            return [];
        }
        
        const q = query ? query.toLowerCase() : "";
        return this.rawRecords.filter(r => {
            // 關鍵字比對 (案號/案名)
            const matchQuery = q === "" || 
                              r.id.toLowerCase().includes(q) || 
                              r.name.toLowerCase().includes(q);
            
            // 類別複選比對 (只要案件分類在勾選清單內就通過)
            const matchClass = !filters.class || filters.class.length === 0 || filters.class.includes(r.category);
            const matchStatus = !filters.status || filters.status.length === 0 || filters.status.includes(r.status);
            
            return matchQuery && matchClass && matchStatus;
        });
    }

    /**
     * [分組五：自動分類提取]
     */
    _autoExtractCategories() {
        const getUniques = (key) => [...new Set(this.rawRecords.map(r => r[key]).filter(v => v))];
        this.categoryData.class = getUniques('category');
        this.categoryData.type = getUniques('type');
        this.categoryData.status = getUniques('status');
    }

    /**
     * [分組六：系統日誌連動]
     */
    log(msg, level = "INFO") {
        console.log(`[DataService][${level}] ${msg}`);
        if (window.parent && typeof window.parent.postMessage === 'function') {
            window.parent.postMessage({ type: 'debug', module: 'DataService', msg: msg, level: level }, '*');
        }
    }
}

export default EditorDataService;