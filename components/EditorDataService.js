/**
 * @fileoverview EditorDataService.js - 惇陽 AI 實驗室 資料服務模組 v2.5.1
 * [分組模塊邏輯：補全偵錯橋接與資料清洗]
 */

if (typeof fetch === 'undefined') {
    console.error('[EditorDataService] 環境不支援 Fetch API');
}

export default class EditorDataService {
    /**
     * @param {string} [sheetId] - 目標 Google Sheet ID
     */
    constructor(sheetId = null) {
        this.sheetId = sheetId;
        this.gid = '0';
        this.rawRecords = [];
        this.headerMap = {};
        this.isLoaded = false;
        
        // [標準欄位對照配置]
        this.fieldConfig = {
            id: '案號',
            wkt: '座標',
            name: '案件簡稱',
            category: '類別',
            status: '案件狀態'
        };

        this.categoryData = { class: [], status: [] };
    }

    /**
     * 自動偵測配置並讀取資料
     */
    async initAndFetch() {
        try {
            if (!this.sheetId) {
                this.log("嘗試從 manifest.json 獲取外部資料配置...", "INFO");
                const configResp = await fetch('../../manifest.json');
                const manifest = await configResp.json();
                this.sheetId = manifest.ai_lab_config.env.CASE_SHEET_ID;
            }

            if (!this.sheetId) throw new Error("找不到有效的 CASE_SHEET_ID 配置");

            const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/export?format=csv&gid=${this.gid}`;
            const response = await fetch(url);
            const csvText = await response.text();
            
            this._processCSV(csvText);
            this.isLoaded = true;
            
            this.log(`資料源連線成功 ID: ${this.sheetId.substring(0, 8)}...`, "SUCCESS");
            return this.rawRecords;
        } catch (error) {
            this.log(`初始化失敗: ${error.message}`, "ERROR");
            return [];
        }
    }

    /**
     * CSV 核心解析與 Proxy 物件建立
     * @private
     */
    _processCSV(csv) {
        const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 1) return;

        const headers = this._parseLine(lines[0]);
        this.headerMap = {};
        headers.forEach((h, i) => this.headerMap[h.trim()] = i);

        this.rawRecords = lines.slice(1).map(line => {
            const values = this._parseLine(line);
            const obj = {};
            for (const [key, colName] of Object.entries(this.fieldConfig)) {
                const idx = this.headerMap[colName];
                let val = (idx !== undefined) ? (values[idx] || '') : '';
                
                // WKT 深度清理邏輯：處理引號轉義
                if (key === 'wkt') {
                    val = val.replace(/^["']|["']$/g, '').trim();
                }
                obj[key] = val;
            }
            return obj;
        });

        this._extractCategories();
    }

    _parseLine(line) {
        // 處理包含逗號的 CSV 欄位正則
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        return line.split(regex).map(val => val.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    }

    /**
     * 搜尋與過濾
     */
    search(query, filters = {}) {
        const q = query ? query.toLowerCase() : "";
        return this.rawRecords.filter(r => {
            const matchQuery = q === "" || r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
            // 修正：統一使用 category 作為過濾鍵
            const matchClass = !filters.class || filters.class.length === 0 || filters.class.includes(r.category);
            const matchStatus = !filters.status || filters.status.length === 0 || filters.status.includes(r.status);
            return matchQuery && matchClass && matchStatus;
        });
    }

    _extractCategories() {
        const getUniques = (key) => [...new Set(this.rawRecords.map(r => r[key]).filter(v => v))];
        this.categoryData.class = getUniques('category');
        this.categoryData.status = getUniques('status');
    }

    /**
     * 補全：系統連動日誌程序
     */
    log(msg, level = "INFO") {
        console.log(`[DataService][${level}] ${msg}`);
        if (window.parent) {
            window.parent.postMessage({ 
                source: 'AI_STUDIO_APP', // 補回此標籤以對接 DebugSystem
                type: 'debug', 
                module: 'DataService', 
                msg: msg, 
                level: level 
            }, '*');
        }
    }
}