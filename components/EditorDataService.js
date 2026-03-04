/**
 * @fileoverview EditorDataService.js - 惇陽 AI 實驗室 資料服務模組 v2.6.0
 * [分組模塊邏輯：支援多表單架構、偵錯橋接與資料清洗]
 */

if (typeof fetch === 'undefined') {
    console.error('[EditorDataService] 環境不支援 Fetch API');
}

export default class EditorDataService {
    constructor() {
        this.sheetId = null;
        this.gid = '0';
        this.rawRecords = [];
        this.headerMap = {};
        this.isLoaded = false;
        
        // 預設針對「公司案例地圖」的欄位對照配置
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
     * @param {string} envKey - 指定要讀取 manifest 中的哪一個表單 (例如 'SHEET_CASES')
     */
    async initAndFetch(envKey = 'SHEET_CASES') {
        try {
            this.log(`嘗試從 manifest 獲取表單配置 [${envKey}]...`, "INFO");
            const configResp = await fetch('../../manifest.json');
            const manifest = await configResp.json();
            
            this.sheetId = manifest.ai_lab_config.env[envKey];

            if (!this.sheetId) throw new Error(`找不到有效的 ${envKey} 配置`);

            const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/export?format=csv&gid=${this.gid}`;
            const response = await fetch(url);
            
            if (!response.ok) throw new Error("Google 表單存取被拒或連結無效 (HTTP " + response.status + ")");
            
            const csvText = await response.text();
            
            this._processCSV(csvText);
            this.isLoaded = true;
            
            this.log(`表單 [${envKey}] 連線成功，載入 ${this.rawRecords.length} 筆資料`, "SUCCESS");
            return this.rawRecords;
        } catch (error) {
            this.log(`初始化失敗: ${error.message}`, "ERROR");
            return [];
        }
    }

    _processCSV(csv) {
        const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 1) return;

        const headers = this._parseLine(lines[0]);
        this.headerMap = {};
        headers.forEach((h, i) => this.headerMap[h.trim()] = i);

        this.rawRecords = lines.slice(1).map(line => {
            const values = this._parseLine(line);
            const obj = {};
            // 如果資料表沒有 wkt 欄位 (如測站資料)，依然會保留原始物件供擴充使用
            for (const [key, colName] of Object.entries(this.fieldConfig)) {
                const idx = this.headerMap[colName];
                let val = (idx !== undefined) ? (values[idx] || '') : '';
                
                if (key === 'wkt' && val) {
                    val = val.replace(/^["']|["']$/g, '').trim();
                }
                obj[key] = val;
            }
            // 儲存完整原始資料以備不時之需
            obj._raw = values;
            return obj;
        });

        this._extractCategories();
    }

    _parseLine(line) {
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        return line.split(regex).map(val => val.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    }

    search(query, filters = {}) {
        const q = query ? query.toLowerCase() : "";
        return this.rawRecords.filter(r => {
            const matchQuery = q === "" || r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
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

    log(msg, level = "INFO") {
        console.log(`[DataService][${level}] ${msg}`);
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ 
                source: 'AI_STUDIO_APP',
                type: 'debug', 
                module: 'DataService', 
                msg: msg, 
                level: level 
            }, '*');
        }
    }
}