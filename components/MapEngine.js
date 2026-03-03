/**
 * @Module: MapEngine
 * @Description: 惇陽 AI 實驗室 - 3D 空間編輯核心模組 (強化編輯與通訊版)
 */

const MapEngine = {
    map: null,
    draw: null,

    // 1. 初始化地圖基礎設定
    init: function(containerId, options = {}) {
        console.log("🚀 MapEngine 模組初始化中...");
        
        const mapStyle = {
            "version": 8,
            "sources": {
                "osm": { 
                    "type": "raster", 
                    "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], 
                    "tileSize": 256 
                },
                "terrain-rgb": {
                    "type": "raster-dem",
                    "tiles": ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
                    "encoding": "terrarium",
                    "tileSize": 256
                }
            },
            "layers": [{ "id": "osm", "type": "raster", "source": "osm" }],
            "terrain": { "source": "terrain-rgb", "exaggeration": 1.5 }
        };

        // 建立地圖實例
        this.map = new maplibregl.Map({
            container: containerId || 'map',
            style: mapStyle,
            center: options.center || [121.5645, 25.0339],
            zoom: options.zoom || 16,
            pitch: 45
        });

        // 加入導覽控制
        this.map.addControl(new maplibregl.NavigationControl(), 'top-left');

        // 2. 初始化繪圖工具 (MapboxDraw)
        this.draw = new MapboxDraw({
            displayControlsDefault: false,
            styles: [
                { "id": "gl-draw-polygon-fill", "type": "fill", "filter": ["==", "$type", "Polygon"], "paint": { "fill-color": "#00f2ff", "fill-opacity": 0.2 }},
                { "id": "gl-draw-line", "type": "line", "filter": ["==", "$type", "LineString"], "paint": { "line-color": "#00f2ff", "line-width": 3 }},
                { "id": "gl-draw-point", "type": "circle", "filter": ["==", "$type", "Point"], "paint": { "circle-radius": 6, "circle-color": "#ff4444" }}
            ]
        });
        this.map.addControl(this.draw);

        // 3. 綁定繪圖事件
        this.map.on('draw.create', (e) => this.updateWKT(e, options.onDrawComplete));
        this.map.on('draw.update', (e) => this.updateWKT(e, options.onDrawComplete));

        console.log("✅ MapEngine 載入完成");
        this.sendDebug("地圖核心引擎已就緒", "SUCCESS");
    },

    // 4. 開始繪圖模式 (由 map_editor.html 呼叫)
    startDrawing: function(mode, callback) {
        if (!this.draw) return;
        
        this.draw.deleteAll(); // 清除舊圖
        let drawMode = 'draw_point';
        if (mode === 'line') drawMode = 'draw_line_string';
        if (mode === 'polygon') drawMode = 'draw_polygon';
        
        this.draw.changeMode(drawMode);
        this.onDrawComplete = callback; // 暫存回傳函式
        this.sendDebug(`切換至繪圖模式: ${mode}`, "INFO");
    },

    // 5. 更新 WKT 資料
    updateWKT: function(e, callback) {
        const data = this.draw.getAll();
        if (data.features.length > 0) {
            const feature = data.features[0];
            const wkt = this.geoJSONToWKT(feature);
            
            if (callback) callback({ wkt: wkt });
            this.sendDebug("WKT 座標轉換完成", "INFO");
        }
    },

    // 6. 清除地圖內容
    clear: function() {
        if (this.draw) this.draw.deleteAll();
        this.sendDebug("地圖內容已清除", "WARN");
    },

    // 7. 內部工具：GeoJSON 轉 WKT (簡化版)
    geoJSONToWKT: function(feature) {
        const type = feature.geometry.type.toUpperCase();
        const coords = feature.geometry.coordinates;

        if (type === 'POINT') {
            return `POINT(${coords[0].toFixed(6)} ${coords[1].toFixed(6)})`;
        } else if (type === 'LINESTRING') {
            const path = coords.map(c => `${c[0].toFixed(6)} ${c[1].toFixed(6)}`).join(', ');
            return `LINESTRING(${path})`;
        } else if (type === 'POLYGON') {
            const rings = coords.map(ring => 
                `(${ring.map(c => `${c[0].toFixed(6)} ${c[1].toFixed(6)}`).join(', ')})`
            ).join(', ');
            return `POLYGON(${rings})`;
        }
        return "";
    },

    // 8. 傳送 Debug 訊息至母視窗
    sendDebug: function(msg, level) {
        if (window.parent) {
            window.parent.postMessage({
                type: 'debug',
                module: 'MapEngine',
                msg: msg,
                level: level
            }, '*');
        }
    }
};

// 暴露至全域
window.MapEngine = MapEngine;