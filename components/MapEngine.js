/**
 * @Module: MapEngine
 * @Description: 惇陽 AI 實驗室 - 3D 空間編輯核心模組
 */

window.initMapEngine = function() {
    console.log("🚀 MapEngine 模組初始化中...");

    // 1. 初始化地圖基礎設定 (地形與底圖)
    const terrainRGB = {
        "type": "raster-dem",
        "tiles": ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        "encoding": "terrarium",
        "tileSize": 256
    };

    const mapStyle = {
        "version": 8,
        "sources": {
            "osm": { "type": "raster", "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], "tileSize": 256 },
            "t-rgb": terrainRGB
        },
        "layers": [{ "id": "osm", "type": "raster", "source": "osm" }],
        "terrain": { "source": "t-rgb", "exaggeration": 1.5 }
    };

    // 2. 建立地圖實例
    window.map = new maplibregl.Map({
        container: 'map',
        style: mapStyle,
        center: [121.5645, 25.0339],
        zoom: 16,
        pitch: 45
    });

    // 3. 加入導覽控制
    map.addControl(new maplibregl.NavigationControl(), 'top-left');

    // 4. 初始化繪圖工具 (MapboxDraw)
    window.Draw = new MapboxDraw({
        displayControlsDefault: false,
        styles: [
            { "id": "gl-draw-polygon-fill", "type": "fill", "filter": ["==", "$type", "Polygon"], "paint": { "fill-color": "#00f2ff", "fill-opacity": 0.1 }},
            { "id": "gl-draw-line", "type": "line", "filter": ["==", "$type", "LineString"], "paint": { "line-color": "#00f2ff", "line-width": 3 }}
        ]
    });
    map.addControl(window.Draw);

    // 5. 模組功能：切換視角
    window.setMapPerspective = function(mode) {
        if (mode === '3D') {
            map.easeTo({ pitch: 65, bearing: -20 });
        } else {
            map.easeTo({ pitch: 0, bearing: 0 });
        }
    };

    console.log("✅ MapEngine 載入完成");
    if(parent && parent.logDebug) parent.logDebug("地圖核心引擎已就緒");
};