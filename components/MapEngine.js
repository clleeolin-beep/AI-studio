/**
 * @fileoverview MapEngine.js v2.2.1 - 惇陽 AI 實驗室 通用空間分析引擎
 * 修正說明：補齊類別閉合括號、優化偵錯通訊、調整地形源。
 */

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
        
        // 修正：更換為較穩定的地形源，若仍有 Fetch 錯誤，請確認網路或 API Key
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

    switchBaseMap() {
        this.isSatellite = !this.isSatellite;
        const currentStyle = this.isSatellite ? this.esriStyle : this.osmStyle;
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

    featuresToWKT(features) {
        let wktArray = [];
        features.forEach(feature => {
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
        });
        return wktArray;
    }

    parseWKT(wktString) {
        if (!wktString) return null;
        wktString = wktString.trim().toUpperCase();
        try {
            if (wktString.startsWith('POINT')) {
                const content = wktString.replace('POINT', '').replace(/[()]/g, '').trim();
                const parts = content.split(/\s+/);
                return { type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(parts[0]), parseFloat(parts[1])] }, properties: {} };
            } 
            else if (wktString.startsWith('LINESTRING')) {
                const content = wktString.replace('LINESTRING', '').replace(/[()]/g, '').trim();
                const coordinates = content.split(',').map(p => p.trim().split(/\s+/).map(Number));
                return { type: 'Feature', geometry: { type: 'LineString', coordinates: coordinates }, properties: {} };
            } 
            else if (wktString.startsWith('POLYGON')) {
                const rawContent = wktString.substring(wktString.indexOf('(') + 1, wktString.lastIndexOf(')'));
                const ringStrings = rawContent.match(/\([^)]+\)/g);
                const coordinates = ringStrings.map(ring => {
                    const ringContent = ring.replace(/[()]/g, '').trim();
                    return ringContent.split(',').map(p => p.trim().split(/\s+/).map(Number));
                });
                return { type: 'Feature', geometry: { type: 'Polygon', coordinates: coordinates }, properties: {} };
            }
        } catch (e) {
            this.log(`WKT 解析失敗: ${e.message}`, "ERROR");
            return null;
        }
        return null;
    }

    initDrawingTools() {
        if (typeof MapboxDraw === 'undefined') {
            this.log("未載入 MapboxDraw 庫", "ERROR");
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

    flyToWKT(wkt) {
        const feature = this.parseWKT(wkt);
        if (!feature) return;
        let center;
        const geom = feature.geometry;
        if (geom.type === 'Point') center = geom.coordinates;
        else if (geom.type === 'Polygon') center = geom.coordinates[0][0];
        else if (geom.type === 'LineString') center = geom.coordinates[0];

        this.map.flyTo({ center: center, zoom: 16, pitch: 45, essential: true, duration: 2000 });
        this.log(`地圖定位至: ${center}`, "INFO");
    }

    log(message, level = "INFO") {
        console.log(`[MapEngine][${level}] ${message}`);
        if (window.parent && typeof window.parent.postMessage === 'function') {
            window.parent.postMessage({ 
                source: 'AI_STUDIO_APP',
                type: 'debug', 
                module: 'MapEngine', 
                msg: message, 
                level: level 
            }, '*');
        }
    }
} // <--- 修正：補齊 Class 閉合括號

export default MapEngine;