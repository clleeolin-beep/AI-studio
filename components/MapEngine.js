/**
 * @fileoverview MapEngine.js v2.3.2 - 惇陽 AI 實驗室 通用空間分析引擎
 * @description 完整整合版：修正生命週期衝突，確保 MapboxDraw 安全掛載。
 */

class MapEngine {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.map = null;
        this.draw = null;
        this.isSatellite = false;
        this.terrainActive = options.terrainDefault !== undefined ? options.terrainDefault : true;
        
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
        
        // 【AI Lab 修正】延遲繪圖工具掛載，等待地圖實例 Ready
        this.map.on('load', () => {
            this.initDrawingTools();
        });
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
        this.log("MapEngine 核心初始化成功", "SUCCESS");
    }

    startDrawing(mode, callback) {
        if (!this.draw) {
            this.log("繪製工具未準備就緒", "ERROR");
            return;
        }
        this.draw.deleteAll();
        const drawMode = mode === 'point' ? 'draw_point' : 
                         mode === 'line' ? 'draw_line_string' : 'draw_polygon';
        this.draw.changeMode(drawMode);
        
        this.map.once('draw.create', (e) => {
            const wkt = this.featuresToWKT(e.features);
            callback({ wkt: wkt.join('\n') });
        });
    }

    clear() {
        if (this.draw) this.draw.deleteAll();
    }

    switchBaseMap() {
        this.isSatellite = !this.isSatellite;
        const currentStyle = this.isSatellite ? this.esriStyle : this.osmStyle;
        currentStyle.terrain = this.terrainActive ? { "source": "t-rgb", "exaggeration": 1.5 } : null;
        this.map.setStyle(currentStyle);
        this.log(`底圖切換: ${this.isSatellite ? '衛星航照' : '道路地圖'}`, "INFO");
        return this.isSatellite;
    }

    toggle3D() {
        this.terrainActive = !this.terrainActive;
        if (this.terrainActive) {
            this.map.setTerrain({ "source": "t-rgb", "exaggeration": 1.5 });
        } else {
            this.map.setTerrain(null);
        }
        this.log(`3D 地形: ${this.terrainActive ? '開啟' : '關閉'}`, "INFO");
        return this.terrainActive;
    }

    resetView() {
        this.map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
        this.log("視角已重置", "INFO");
    }

    featuresToWKT(features) {
        return features.map(feature => {
            const type = feature.geometry.type;
            const coords = feature.geometry.coordinates;
            if (type === 'Point') return `POINT(${coords[0].toFixed(6)} ${coords[1].toFixed(6)})`;
            if (type === 'LineString') return `LINESTRING(${coords.map(p => `${p[0].toFixed(6)} ${p[1].toFixed(6)}`).join(', ')})`;
            if (type === 'Polygon') {
                const rings = coords.map(ring => `(${ring.map(p => `${p[0].toFixed(6)} ${p[1].toFixed(6)}`).join(', ')})`);
                return `POLYGON(${rings.join(', ')})`;
            }
            return "";
        });
    }

    parseWKT(wkt) {
        if (!wkt) return null;
        const str = wkt.trim().toUpperCase();
        try {
            if (str.startsWith('POINT')) {
                const c = str.replace('POINT', '').replace(/[()]/g, '').trim().split(/\s+/);
                return { type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(c[0]), parseFloat(c[1])] }, properties: {} };
            } else if (str.startsWith('LINESTRING')) {
                const content = str.replace('LINESTRING', '').replace(/[()]/g, '').trim();
                const coordinates = content.split(',').map(p => p.trim().split(/\s+/).map(Number));
                return { type: 'Feature', geometry: { type: 'LineString', coordinates: coordinates }, properties: {} };
            } else if (str.startsWith('POLYGON')) {
                const rawContent = str.substring(str.indexOf('(') + 1, str.lastIndexOf(')'));
                const ringStrings = rawContent.match(/\([^)]+\)/g);
                const coordinates = ringStrings.map(ring => {
                    const ringContent = ring.replace(/[()]/g, '').trim();
                    return ringContent.split(',').map(p => p.trim().split(/\s+/).map(Number));
                });
                return { type: 'Feature', geometry: { type: 'Polygon', coordinates: coordinates }, properties: {} };
            }
        } catch (e) { 
            this.log(`WKT 解析出錯: ${e.message}`, "ERROR"); 
        }
        return null;
    }

    flyToWKT(wkt) {
        const feature = this.parseWKT(wkt);
        if (!feature) return;
        let center;
        const geom = feature.geometry;
        if (geom.type === 'Point') center = geom.coordinates;
        else if (geom.type === 'Polygon') center = geom.coordinates[0][0];
        else if (geom.type === 'LineString') center = geom.coordinates[0];

        if (center) {
            this.map.flyTo({ center: center, zoom: 16, pitch: 45, essential: true, duration: 2000 });
            this.log(`地圖定位至: ${center[0].toFixed(4)}, ${center[1].toFixed(4)}`, "INFO");
        }
    }

    initDrawingTools() {
        if (typeof MapboxDraw === 'undefined' || this.draw) return this.draw;
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

    log(msg, level = "INFO") {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ 
                source: 'AI_STUDIO_APP',
                type: 'debug', 
                module: 'MapEngine', 
                msg: msg, 
                level: level 
            }, '*');
        }
    }
}

export default MapEngine;