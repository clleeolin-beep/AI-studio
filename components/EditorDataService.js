/**
 * @fileoverview EditorDataService.js - 惇陽 AI 實驗室 資料服務模組 v2.5
 * [分組模塊邏輯：依賴檢查與配置連動]
 * 功能：動態讀取 manifest 配置、Google Sheets CSV 解析、複選過濾。
 */

if (typeof fetch === 'undefined') {
    console.error('[EditorDataService] 環境不支援 Fetch API');
}

class EditorDataService {
    /**
     * @param {string} [sheetId] - 若不傳入，則自動從 manifest.json 讀取
     */
    constructor(sheetId = null) {
        this.sheetId = sheetId;
        this.gid = '0';
        this.rawRecords = [];
        this.headerMap = {};
        this.isLoaded = false;
        
        // [分組一：標準欄位對照配置]
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
     * [分組二：配置引導與資料載入]
     * 自動偵測 manifest 並讀取 SHEET_ID
     */
    async initAndFetch() {
        try {
            // 1. 如果沒有傳入 ID，則向上溯源讀取配置檔
            if (!this.sheetId) {
                this.log("嘗試從 manifest.json 獲取外部資料配置...", "INFO");
                const configResp = await fetch('../../manifest.json');
                const manifest = await configResp.json();
                this.sheetId = manifest.ai_lab_config.env.CASE_SHEET_ID;
            }

            if (!this.sheetId) throw new Error("找不到有效的 CASE_SHEET_ID 配置");

            // 2. 執行 CSV 載入
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
     * [分組三：CSV 核心解析邏輯]
     * @private
     */
    _processCSV(csv) {
        const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 1) return;

        // 建立標籤映射
        const headers = this._parseLine(lines[0]);
        this.headerMap = {};
        headers.forEach((h, i) => this.headerMap[h.trim()] = i);

        // 解析資料列並建立 Proxy 物件
        this.rawRecords = lines.slice(1).map(line => {
            const values = this._parseLine(line);
            const obj = {};
            for (const [key, colName] of Object.entries(this.fieldConfig)) {
                const idx = this.headerMap[colName];
                let val = (idx !== undefined) ? values[idx] : '';
                
                // WKT 深度清理邏輯
                if (key === 'wkt') {
                    val = val.replace(/^"|"$/g, '').replace(/""/g, '"').replace(/^"|"$/g, '');
                }
                obj[key] = val;
            }
            return obj;
        });

        this._extractCategories();
    }

    _parseLine(line) {
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        return line.split(regex).map(val => val.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    }

    /**
     * [分組四：搜尋與複選過濾]
     */
    search(query, filters = {}) {
        const q = query ? query.toLowerCase() : "";
        return this.rawRecords.filter(r => {
            const matchQuery = q === "" || r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
            const matchClass = !filters.class || filters.class.length === 0 || filters.class.includes(r.category);
            const matchStatus = !filters.status || filters.status.length === 0 || filters.status.includes(r.status);
            return matchQuery && matchClass && matchStatus;
        });
    }

    /**
     * [分組五：分類提取]
     */
    _extractCategories() {
        const getUniques = (key) => [...new Set(this.rawRecords.map(r => r[key]).filter(v => v))];
        this.categoryData.class = getUniques('category');
        this.categoryData.status = getUniques('status');
    }

    /**
     * [分組六：系統連動日誌]
     */
    log(msg, level = "INFO") {
        console.log(`[DataService][${level}] ${msg}`);
        if (window.parent) {
            window.parent.postMessage({ type: 'debug', module: 'DataService', msg: msg, level: level }, '*');
        }
    }
}

export default EditorDataService;