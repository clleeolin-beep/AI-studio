/**
 * @fileoverview MapEngine.js v2.2 - 惇陽 AI 實驗室 通用空間分析引擎
 * [分組模塊邏輯：依賴檢查與守衛邏輯]
 * 支援模組：實績地圖 (map.html)、圖資編輯器 (map_editor.html)、氣象動態分析 (Weather.html)
 */

// --- 模組防禦性檢查 ---
if (typeof maplibregl === 'undefined') {
    console.error('[MapEngine] 嚴重錯誤：偵測不到 Maplibre GL 庫，請檢查 HTML 引用。');
}

class MapEngine {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.map = null;
        this.draw = null;
        this.isSatellite = false;
        this.terrainActive = options.terrainDefault !== undefined ? options.terrainDefault : true;
        
        // 預設樣式與地形定義
        this.terrainSource = {
            "type": "raster-dem",
            "tiles": ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
            "encoding": "terrarium",
            "tileSize": 256
        };

        this.osmStyle = {
            "version": 8,
            "sources": {
                "osm": { "type": "raster", "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], "tileSize": 256 },
                "t-rgb": this.terrainSource
            },
            "layers": [{ "id": "base-layer", "type": "raster", "source": "osm" }],
            "terrain": this.terrainActive ? { "source": "t-rgb", "exaggeration": 1.5 } : null
        };

        this.esriStyle = {
            "version": 8,
            "sources": {
                "esri": { "type": "raster", "tiles": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], "tileSize": 256 },
                "t-rgb": this.terrainSource
            },
            "layers": [{ "id": "base-layer", "type": "raster", "source": "esri" }],
            "terrain": this.terrainActive ? { "source": "t-rgb", "exaggeration": 1.5 } : null
        };

        this.init(options);
    }

    /**
     * [分組一：核心地圖初始化邏輯]
     */
    init(options) {
        this.map = new maplibregl.Map({
            container: this.containerId,
            style: this.osmStyle,
            center: options.center || [121.5, 25.04],
            zoom: options.zoom || 13,
            pitch: options.pitch || 0,
            bearing: options.bearing || 0,
            antialias: true
        });

        this.map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
        this.map.addControl(new maplibregl.ScaleControl(), 'bottom-right');

        this.log("MapEngine 核心初始化完成", "SUCCESS");
    }

    /**
     * [分組二：視角與底圖控制邏輯]
     */
    switchBaseMap() {
        this.isSatellite = !this.isSatellite;
        const currentStyle = this.isSatellite ? this.esriStyle : this.osmStyle;
        currentStyle.terrain = this.terrainActive ? { "source": "t-rgb", "exaggeration": 1.5 } : null;
        this.map.setStyle(currentStyle);
        this.log(`底圖切換完畢: ${this.isSatellite ? '衛星航照' : '道路地圖'}`, "INFO");
        return this.isSatellite;
    }

    toggle3D() {
        this.terrainActive = !this.terrainActive;
        if (this.terrainActive) {
            this.map.setTerrain({ "source": "t-rgb", "exaggeration": 1.5 });
            this.log("3D 地形渲染已開啟", "INFO");
        } else {
            this.map.setTerrain(null);
            this.log("3D 地形渲染已關閉", "INFO");
        }
        return this.terrainActive;
    }

    resetView() {
        this.map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
        this.log("視角已重置為垂直正北投影", "INFO");
    }

    /**
     * [分組三：WKT 雙向演算邏輯]
     */
    featuresToWKT(features) {
        let wktArray = [];
        for (let i = 0; i < features.length; i++) {
            const feature = features[i];
            const type = feature.geometry.type;
            const coords = feature.geometry.coordinates;

            if (type === 'Point') {
                wktArray.push(`POINT(${coords[0].toFixed(6)} ${coords[1].toFixed(6)})`);
            } 
            else if (type === 'LineString') {
                let pts = coords.map(p => `${p[0].toFixed(6)} ${p[1].toFixed(6)}`);
                wktArray.push(`LINESTRING(${pts.join(', ')})`);
            } 
            else if (type === 'Polygon') {
                let rings = coords.map(ring => {
                    let pts = ring.map(p => `${p[0].toFixed(6)} ${p[1].toFixed(6)}`);
                    return `(${pts.join(', ')})`;
                });
                wktArray.push(`POLYGON(${rings.join(', ')})`);
            }
        }
        return wktArray;
    }

    parseWKT(wktString) {
        if (!wktString) return null;
        wktString = wktString.trim().toUpperCase();
        
        try {
            if (wktString.indexOf('POINT') === 0) {
                const content = wktString.replace('POINT', '').replace(/\(/g, '').replace(/\)/g, '').trim();
                const parts = content.split(/\s+/);
                return { type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(parts[0]), parseFloat(parts[1])] }, properties: {} };
            } 
            else if (wktString.indexOf('LINESTRING') === 0) {
                const content = wktString.replace('LINESTRING', '').replace(/\(/g, '').replace(/\)/g, '').trim();
                const coordinates = content.split(',').map(p => p.trim().split(/\s+/).map(Number));
                return { type: 'Feature', geometry: { type: 'LineString', coordinates: coordinates }, properties: {} };
            } 
            else if (wktString.indexOf('POLYGON') === 0) {
                const rawContent = wktString.substring(wktString.indexOf('(') + 1, wktString.lastIndexOf(')'));
                const ringStrings = rawContent.match(/\([^)]+\)/g);
                const coordinates = ringStrings.map(ring => {
                    const ringContent = ring.replace(/\(/g, '').replace(/\)/g, '').trim();
                    return ringContent.split(',').map(p => p.trim().split(/\s+/).map(Number));
                });
                return { type: 'Feature', geometry: { type: 'Polygon', coordinates: coordinates }, properties: {} };
            }
        } catch (e) {
            this.log(`WKT 解析失敗: ${wktString.substring(0, 20)}...`, "ERROR");
            return null;
        }
        return null;
    }

    /**
     * [分組四：繪製引擎掛載] (MapboxDraw 整合)
     */
    initDrawingTools() {
        if (typeof MapboxDraw === 'undefined') {
            this.log("未載入 MapboxDraw 庫，跳過繪製工具初始化", "ERROR");
            return null;
        }
        this.draw = new MapboxDraw({
            displayControlsDefault: false,
            styles: [
                { "id": "gl-draw-polygon-fill", "type": "fill", "filter": ["==", "$type", "Polygon"], "paint": { "fill-color": "#00f2ff", "fill-opacity": 0.4 }},
                { "id": "gl-draw-line", "type": "line", "filter": ["==", "$type", "LineString"], "paint": { "line-color": "#00f2ff", "line-width": 3 }},
                { "id": "gl-draw-point", "type": "circle", "filter": ["==", "$type", "Point"], "paint": { "circle-radius": 6, "circle-color": "#ff4444" }}
            ]
        });
        this.map.addControl(this.draw);
        this.log("繪製引擎已掛載", "SUCCESS");
        return this.draw;
    }

    /**
     * [分組五：自動定位與縮放功能] (新增需求)
     * 讀取案件資料後，自動鎖定並飛往該處
     */
    flyToWKT(wkt) {
        const feature = this.parseWKT(wkt);
        if (!feature) return;

        let center;
        const geom = feature.geometry;
        if (geom.type === 'Point') {
            center = geom.coordinates;
        } else if (geom.type === 'Polygon') {
            center = geom.coordinates[0][0]; // 取多邊形第一個點
        } else if (geom.type === 'LineString') {
            center = geom.coordinates[0];
        }

        this.map.flyTo({
            center: center,
            zoom: 16,
            pitch: 45,
            essential: true,
            duration: 2000
        });
        this.log(`地圖定位至案件座標: ${center}`, "INFO");
    }

    /**
     * [分組六：圖層動態管理]
     */
    addGeoJSONLayer(layerId, geojsonData, paintOptions) {
        if (this.map.getSource(layerId)) {
            this.map.getSource(layerId).setData(geojsonData);
        } else {
            this.map.addSource(layerId, { type: 'geojson', data: geojsonData });
            const geomType = geojsonData.features[0]?.geometry?.type || 'Point';
            const layerType = geomType.includes('Polygon') ? 'fill' : (geomType.includes('Line') ? 'line' : 'circle');
            this.map.addLayer({ id: layerId, type: layerType, source: layerId, paint: paintOptions || {} });
        }
        this.log(`已更新或寫入圖層: ${layerId}`, "INFO");
    }

    /**
     * [分組七：系統除錯與連動] (與 DebugSystem.js 整合)
     */
log(message, level = "INFO") {
    console.log(`[MapEngine][${level}] ${message}`);
    if (window.parent && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({ 
            source: 'AI_STUDIO_APP', // 必須加上此標籤
            type: 'debug', 
            module: 'MapEngine', 
            msg: message, 
            level: level 
        }, '*');
    }
}

// 模組導出，供 map_editor.html 使用
export default MapEngine;