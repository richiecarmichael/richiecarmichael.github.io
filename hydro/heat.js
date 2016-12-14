/* -----------------------------------------------------------------------------------
   Hydro Flow Map
   Develolped by the Applications Prototype Lab
   (c) 2014 Esri | http://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

require([
    'esri/map',
    'esri/layers/ArcGISTiledMapServiceLayer',
    'esri/layers/FeatureLayer',
    'esri/renderers/HeatmapRenderer',
    'dojo/domReady!'
],
function (
    Map,
    ArcGISTiledMapServiceLayer,
    FeatureLayer,
    HeatmapRenderer
    ) {
    $(document).ready(function () {
        // Enforce strict mode
        'use strict';

        // Constants
        var CHECKED = 'Hide Legend';
        var UNCHECKED = 'Show Legend';
        
        // Help button/window
        $('#help-button-text').html(UNCHECKED);
        $('#help-button').click(function () {
            if ($('#help-button-text').html() === CHECKED) {
                var w1 = -$('#help-window').height();
                var w2 = w1.toString() + 'px';
                $('#help-window').animate({ marginTop: w2 }, 300, 'swing', function () {
                    $('#help-button-text').html(UNCHECKED);
                });
            } else {
                $('#help-window').animate({ marginTop: '0px' }, 300, 'swing', function () {
                    $('#help-button-text').html(CHECKED);
                });
            }
        });

        // Initialize slider
        $('#slider').slider({
            value: 1,
            min: 1,
            max: 12,
            step: 1,
            start: function () { },
            slide: function (event, ui) {
                updateUI(ui.value);
            },
            stop: function (event, ui) {
                updateUI(ui.value);
                updateMap(ui.value);
            }
        });
        
        // Variables
        var _base = new ArcGISTiledMapServiceLayer(_config.basemap);
        var _fl = new FeatureLayer(_config.levels[5].url, {
            definitionExpression: 'D<=' + _config.levels[5].buffer,
            mode: FeatureLayer.MODE_SNAPSHOT,
            outFields: ['B', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
            showAttribution: false,
            showLabels: false,
            visible: true
        });

        updateUI($('#slider').slider('value'));
        updateMap($('#slider').slider('value'));

        // Create map
        var _map = new Map('map', {
            zoom: 5,
            center: [-100, 40],
            logo: false,
            showAttribution: false,
            slider: true,
            wrapAround180: false
        });
        _map.addLayers([
            _base,
            _fl
        ]);

        function updateUI(m) {
            var f = new google.visualization.DateFormat({ pattern: 'MMMM, yyyy' });
            var t = f.formatValue(new Date(2014, m - 1, 1));
            $('#bottom-date').html(t);
        }
        function updateMap(m) {
            _fl.setRenderer(new HeatmapRenderer({
                field: 'F' + m.toString(),
                blurRadius: 5, // 10,
                minPixelIntensity: 0,
                maxPixelIntensity: 810000,
                colorStops: [
                    { ratio: 0.0, color: 'rgba(0, 0, 255, 0)' },   // blue transparent
                    { ratio: 0.2, color: 'rgba(0, 0, 255, 1)' },   // blue opaque
                    { ratio: 0.4, color: 'rgba(0, 255, 0, 1)' },   // green
                    { ratio: 0.6, color: 'rgba(255, 255, 0, 1)' }, // yellow
                    { ratio: 0.8, color: 'rgba(255, 127, 0, 1)' }, // orange
                    { ratio: 1.0, color: 'rgba(255, 0, 0, 1)' }    // red
                ]
            }));
            _fl.redraw();
        }
    });
});
