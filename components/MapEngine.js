/**
 * MapEngine.js v2.0 - 惇陽 AI 實驗室 通用空間分析引擎
 * 支援模組：實績地圖 (map.html)、圖資編輯器 (map_editor.html)、氣象動態分析 (Weather.html)
 */
class MapEngine {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.map = null;
        this.draw = null;
        this.isSatellite = false;
        this.terrainActive = options.terrainDefault !== undefined ? options.terrainDefault : true;
        
        // 預設樣式定義 (全面展開，不依賴外部隱藏邏輯)
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
     * 1. 核心地圖初始化邏輯
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
     * 2. 視角與底圖控制邏輯
     */
    switchBaseMap() {
        this.isSatellite = !this.isSatellite;
        // 保留當前的地形狀態進行樣式切換
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
     * 3. WKT 雙向演算邏輯 (完全展開公式，無依賴)
     */
    
    // GeoJSON 轉 WKT (負責 map_editor.html 畫圖匯出)
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
                let pts = [];
                for (let j = 0; j < coords.length; j++) {
                    pts.push(`${coords[j][0].toFixed(6)} ${coords[j][1].toFixed(6)}`);
                }
                wktArray.push(`LINESTRING(${pts.join(', ')})`);
            } 
            else if (type === 'Polygon') {
                let rings = [];
                for (let j = 0; j < coords.length; j++) {
                    let ringPts = [];
                    for (let k = 0; k < coords[j].length; k++) {
                        ringPts.push(`${coords[j][k][0].toFixed(6)} ${coords[j][k][1].toFixed(6)}`);
                    }
                    rings.push(`(${ringPts.join(', ')})`);
                }
                wktArray.push(`POLYGON(${rings.join(', ')})`);
            }
        }
        return wktArray;
    }

    // WKT 轉 GeoJSON (負責讀取資料庫舊案，重新渲染回地圖)
    parseWKT(wktString) {
        wktString = wktString.trim().toUpperCase();
        
        if (wktString.indexOf('POINT') === 0) {
            const content = wktString.replace('POINT', '').replace(/\(/g, '').replace(/\)/g, '').trim();
            const parts = content.split(/\s+/);
            return {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [parseFloat(parts[0]), parseFloat(parts[1])] },
                properties: {}
            };
        } 
        else if (wktString.indexOf('LINESTRING') === 0) {
            const content = wktString.replace('LINESTRING', '').replace(/\(/g, '').replace(/\)/g, '').trim();
            const pairs = content.split(',');
            const coordinates = [];
            for (let i = 0; i < pairs.length; i++) {
                const parts = pairs[i].trim().split(/\s+/);
                coordinates.push([parseFloat(parts[0]), parseFloat(parts[1])]);
            }
            return {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: coordinates },
                properties: {}
            };
        } 
        else if (wktString.indexOf('POLYGON') === 0) {
            // 處理 Polygon 的括號剝離
            const rawContent = wktString.substring(wktString.indexOf('(') + 1, wktString.lastIndexOf(')'));
            const ringStrings = rawContent.match(/\([^)]+\)/g);
            const coordinates = [];
            
            if (ringStrings) {
                for (let i = 0; i < ringStrings.length; i++) {
                    const ringContent = ringStrings[i].replace(/\(/g, '').replace(/\)/g, '').trim();
                    const pairs = ringContent.split(',');
                    const ringCoords = [];
                    for (let j = 0; j < pairs.length; j++) {
                        const parts = pairs[j].trim().split(/\s+/);
                        ringCoords.push([parseFloat(parts[0]), parseFloat(parts[1])]);
                    }
                    coordinates.push(ringCoords);
                }
            }
            return {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: coordinates },
                properties: {}
            };
        }
        return null; // 不支援的格式
    }

    /**
     * 4. 繪製引擎掛載 (MapboxDraw 整合)
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
     * 5. 圖層動態管理 (提供給 Weather.html 覆蓋運算使用)
     */
    addGeoJSONLayer(layerId, geojsonData, paintOptions) {
        if (this.map.getSource(layerId)) {
            this.map.getSource(layerId).setData(geojsonData);
        } else {
            this.map.addSource(layerId, { type: 'geojson', data: geojsonData });
            
            // 根據 GeoJSON 的類型決定渲染方式
            const geomType = geojsonData.features[0]?.geometry?.type || 'Point';
            let layerType = 'circle';
            if (geomType.includes('Polygon')) layerType = 'fill';
            if (geomType.includes('Line')) layerType = 'line';

            this.map.addLayer({
                id: layerId,
                type: layerType,
                source: layerId,
                paint: paintOptions || {}
            });
        }
        this.log(`已更新或寫入圖層: ${layerId}`, "INFO");
    }

    /**
     * 6. 系統除錯連動 (與 DebugSystem.js 整合)
     */
    log(message, level = "INFO") {
        console.log(`[MapEngine][${level}] ${message}`);
        if (window.parent && typeof window.parent.postMessage === 'function') {
            window.parent.postMessage({ type: 'debug', module: 'MapEngine', msg: message, level: level }, '*');
        }
    }
}