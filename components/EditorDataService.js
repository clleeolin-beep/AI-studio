/**
 * @fileoverview EditorDataService.js - 高彈性動態欄位版本
 * 具備欄位對調自適應、動態分類提取、以及 WKT 特殊格式處理功能。
 */

class EditorDataService {
    /**
     * @param {string} sheetId 
     * @param {string} gid 
     */
    constructor(sheetId, gid = '0') {
        this.sheetId = sheetId;
        this.gid = gid;
        this.rawRecords = [];
        this.headerMap = {}; // 儲存 欄位名稱 -> 陣列索引 的對照
        
        /**
         * 內部標準金鑰對照表：
         * 即使日後 Google 表單改名（例如「案號」改為「案件編號」），
         * 只需要修改這裡的映射值，其餘邏輯完全不動。
         */
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
     * 讀取並動態建立索引地圖
     */
    async fetchSheetData() {
        const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/export?format=csv&gid=${this.gid}`;
        try {
            const response = await fetch(url);
            const csvText = await response.text();
            
            const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 1) return [];

            // 1. 動態解析 Header
            const headers = this._parseCSVLine(lines[0]);
            this.headerMap = {};
            headers.forEach((h, index) => {
                this.headerMap[h.trim()] = index;
            });

            // 2. 解析資料列
            this.rawRecords = lines.slice(1).map(line => {
                const values = this._parseCSVLine(line);
                return this._createProxyObject(values);
            });

            this._autoExtractCategories();
            
            if (window.DebugSystem) {
                window.DebugSystem.log('DataService', `欄位解析完成，共偵測到 ${headers.length} 個欄位`);
            }
            return this.rawRecords;
        } catch (error) {
            console.error('Data Load Failed', error);
            return [];
        }
    }

    /**
     * CSV 行解析 (處理引號內的逗號與 WKT 特殊符號)
     * @private
     */
    _parseCSVLine(line) {
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        return line.split(regex).map(val => {
            let clean = val.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
            // 針對 WKT 再次清理可能殘留的包裹引號
            if (clean.startsWith('"') && clean.endsWith('"')) {
                clean = clean.substring(1, clean.length - 1);
            }
            return clean;
        });
    }

    /**
     * 建立代理物件 (Proxy-like Object)
     * 確保之後存取資料時，是透過 fieldConfig 找出的欄位名稱，而非索引
     * @private
     */
    _createProxyObject(values) {
        const obj = {};
        // 遍歷所有我們關心的欄位
        for (const [key, columnName] of Object.entries(this.fieldConfig)) {
            const index = this.headerMap[columnName];
            obj[key] = (index !== undefined) ? values[index] : '';
        }
        // 同時保留原始資料供完整顯示
        obj._raw = values; 
        return obj;
    }

    /**
     * 搜尋邏輯：使用代理金鑰，不受欄位順序影響
     */
    search(query) {
        if (!query) return [];
        const q = query.toLowerCase();
        return this.rawRecords.filter(r => 
            r.id.toLowerCase().includes(q) || 
            r.name.toLowerCase().includes(q)
        );
    }

    /**
     * 自動分析分類清單
     */
    _autoExtractCategories() {
        const getUniques = (key) => [...new Set(this.rawRecords.map(r => r[key]).filter(v => v))];
        this.categoryData.class = getUniques('category');
        this.categoryData.type = getUniques('type');
        this.categoryData.status = getUniques('status');
    }
}

export default EditorDataService;