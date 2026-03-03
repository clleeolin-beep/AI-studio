/**
 * @Module: MapEngine
 * @Description: 3D 空間編輯核心模組 - 支援 WKT 生成與跨視窗通訊
 */

const MapEngine = {
    map: null,
    draw: null,
    onDrawComplete: null,

    init: function(containerId, options = {}) {
        const mapStyle = {
            "version": 8,
            "sources": {
                "osm": { "type": "raster", "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], "tileSize": 256 }
            },
            "layers": [{ "id": "osm", "type": "raster", "source": "osm" }]
        };

        this.map = new maplibregl.Map({
            container: containerId || 'map',
            style: mapStyle,
            center: options.center || [121.5, 25.0],
            zoom: options.zoom || 12,
            pitch: 45
        });

        // 初始化繪圖工具
        this.draw = new MapboxDraw({
            displayControlsDefault: false,
            styles: [
                { "id": "draw-poly", "type": "fill", "filter": ["==", "$type", "Polygon"], "paint": { "fill-color": "#00f2ff", "fill-opacity": 0.3 }},
                { "id": "draw-line", "type": "line", "filter": ["==", "$type", "LineString"], "paint": { "line-color": "#00f2ff", "line-width": 3 }},
                { "id": "draw-point", "type": "circle", "filter": ["==", "$type", "Point"], "paint": { "circle-radius": 6, "circle-color": "#ff4444" }}
            ]
        });
        this.map.addControl(this.draw);

        // 綁定繪圖結束事件
        this.map.on('draw.create', (e) => this.processUpdate());
        this.map.on('draw.update', (e) => this.processUpdate());

        this.sendDebug("MapEngine 初始化完成", "SUCCESS");
    },

    startDrawing: function(mode, callback) {
        if (!this.draw) return;
        this.onDrawComplete = callback;
        this.draw.deleteAll();

        const modes = { 'point': 'draw_point', 'line': 'draw_line_string', 'polygon': 'draw_polygon' };
        this.draw.changeMode(modes[mode] || 'simple_select');
        this.sendDebug(`引擎切換至: ${mode} 模式`, "INFO");
    },

    processUpdate: function() {
        const data = this.draw.getAll();
        if (data.features.length > 0) {
            const feature = data.features[0];
            const wkt = this.toWKT(feature);
            if (this.onDrawComplete) this.onDrawComplete({ wkt: wkt });
            this.sendDebug("WKT 座標轉換成功", "SUCCESS");
        }
    },

    toWKT: function(feature) {
        const type = feature.geometry.type.toUpperCase();
        const coords = feature.geometry.coordinates;
        if (type === 'POINT') return `POINT(${coords[0].toFixed(6)} ${coords[1].toFixed(6)})`;
        if (type === 'LINESTRING') return `LINESTRING(${coords.map(c => c[0].toFixed(6)+' '+c[1].toFixed(6)).join(',')})`;
        if (type === 'POLYGON') {
            const ring = coords[0].map(c => c[0].toFixed(6)+' '+c[1].toFixed(6)).join(',');
            return `POLYGON((${ring}))`;
        }
        return "";
    },

    clear: function() {
        if (this.draw) this.draw.deleteAll();
    },

    sendDebug: function(msg, level) {
        if (window.parent) {
            window.parent.postMessage({ type: 'debug', module: 'MapEngine', msg: msg, level: level }, '*');
        }
    }
};

window.MapEngine = MapEngine;