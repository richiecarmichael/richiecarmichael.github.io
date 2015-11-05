/* -----------------------------------------------------------------------------------
   Arctic DEM
   Develolped by the Applications Prototype Lab
   (c) 2015 Esri | http://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

require([
    'esri/map',
    'esri/Color',
    'esri/SpatialReference',
    'esri/layers/ArcGISTiledMapServiceLayer',
    'esri/layers/ArcGISImageServiceLayer',
    'esri/layers/RasterFunction',
    'esri/layers/ImageServiceParameters',
    'esri/layers/FeatureLayer',
    'esri/layers/GraphicsLayer',
    'esri/symbols/SimpleFillSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/renderers/SimpleRenderer',
    'esri/tasks/query',
    'esri/tasks/QueryTask',
    'esri/geometry/Extent',
    'dojo/domReady!'
],
function (
    Map,
    Color,
    SpatialReference,
    ArcGISTiledMapServiceLayer,
    ArcGISImageServiceLayer,
    RasterFunction,
    ImageServiceParameters,
    FeatureLayer,
    GraphicsLayer,
    SimpleFillSymbol,
    SimpleLineSymbol,
    SimpleRenderer,
    Query,
    QueryTask,
    Extent
    ) {
    $(document).ready(function () {
        // Enforce strict mode
        'use strict';

        // Hardcoded constants
        var BASE = 'http://maps8.arcgisonline.com/arcgis/rest/services/Arctic_Polar_Ocean_Base/MapServer';
        var ARCTIC = 'http://arctic-661168812.us-east-1.elb.amazonaws.com/arcgis/rest/services/umn/ImageServer';
        var FXN = 'DynamicShadedRelief_2';
        var EXTENT = new Extent(586268, -1851963, 3655360, -25433, new SpatialReference(5936));

        // Hidden flag to switch from single to multidirectional hillshade
        var _isMultiDirectional = false;

        // Configure UI
        $('#slider-sun-azimuth').slider({
            id: 'slider-sun-azimuth-div',
            ticks: [0, 90, 180, 270, 360],
            ticks_labels: ['0°', '90°', '180°', '270°', '360°'],
            range: false,
            value: 315,
            formatter: function (e) {
                return e + '°';
            }
        }).slider().on('slideStop', function () {
            setSunRenderingRule();
        });
        $('#slider-sun-altitude').slider({
            id: 'slider-sun-altitude-div',
            ticks: [0, 15, 30, 45, 60, 75, 90],
            ticks_labels: ['0°', '15°', '30°', '45°', '60°', '75°', '90°'],
            range: false,
            value: 45,
            formatter: function (e) {
                return e + '°';
            }
        }).slider().on('slideStop', function () {
            setSunRenderingRule();
        });
        $('#slider-elevation').slider({
            ticks: [0, 500, 1000, 1500, 2000, 2500],
            ticks_labels: ['0', '500', '1,000', '1,500', '2,000', '2,500'],
            range: true,
            value: [0, 2500],
            formatter: function (e) {
                return e[0] + 'm – ' + e[1] + 'm';
            }
        }).slider().on('slideStop', function () {
            setElevationRenderingRule();
        });
        $('#slider-slope').slider({
            ticks: [0, 15, 30, 45, 60, 75, 90],
            ticks_labels: ['0°', '15°', '30°', '45°', '60°', '75°', '90°'],
            range: true,
            value: [0, 90],
            formatter: function (e) {
                return e[0] + '° – ' + e[1] + '°';
            }
        }).slider().on('slideStop', function () {
            setElevationRenderingRule();
        });
        $('#slider-aspect').slider({
            ticks: [0, 90, 180, 270, 360],
            ticks_labels: ['0°', '90°', '180°', '270°', '360°'],
            range: true,
            value: [0, 360],
            formatter: function (e) {
                return e[0] + '° – ' + e[1] + '°';
            }
        }).slider().on('slideStop', function () {
            setElevationRenderingRule();
        });
        $('#buttonShow').click(function () {
            _sun.show();
            $(this).addClass('disabled').siblings().removeClass('disabled');
        });
        $('#buttonHide').click(function () {
            _sun.hide();
            $(this).addClass('disabled').siblings().removeClass('disabled');
        });
        $('#buttonReset').click(function () {
            $('#slider-elevation').slider('setValue', [
                $('#slider-elevation').slider('getAttribute', 'min'),
                $('#slider-elevation').slider('getAttribute', 'max')
            ]);
            $('#slider-aspect').slider('setValue', [
                $('#slider-aspect').slider('getAttribute', 'min'),
                $('#slider-aspect').slider('getAttribute', 'max')
            ]);
            $('#slider-slope').slider('setValue', [
                $('#slider-slope').slider('getAttribute', 'min'),
                $('#slider-slope').slider('getAttribute', 'max')
            ]);
            setElevationRenderingRule();
        });
        $('#titleHillshade').click(function () {
            _isMultiDirectional = !_isMultiDirectional;
            setSunRenderingRule();
        });

        // Initiate Popover
        $(function () {
            $('[data-toggle="popover"]').popover({
                html: true
            });
        });

        // Create layers
        var _bas = new ArcGISTiledMapServiceLayer(BASE);
        var _sun = new ArcGISImageServiceLayer(ARCTIC);
        var _ele = new ArcGISImageServiceLayer(ARCTIC, { opacity: 0.5 });
        var _fot = new GraphicsLayer();

        // Update layer settings
        setSunRenderingRule();
        setElevationRenderingRule();
        _sun.setInterpolation(ImageServiceParameters.INTERPOLATION_BILINEAR);
        _fot.setRenderer(new SimpleRenderer(new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0, 1]), 0.5), new Color([255, 255, 255, 0]))));

        // Create map and add basemap
        var _map = new Map('map', {
            logo: true,
            showAttribution: false,
            slider: true,
            extent: EXTENT
        });
        _map.addLayers([
            _bas
        ]);

        // Continue loading after map+basemap loaded
        _map.on('load', function () {
            // Load imagery layers and footprings
            _map.addLayers([
                _sun,
                _ele,
                _fot
            ]);
            var query = new Query();
            query.returnGeometry = true;
            query.outSpatialReference = _map.spatialReference;
            query.where = "Tag <> 'Overview' AND Tag <> 'mnGMTED_OV' AND Tag <> 'mn75_grd_m2' AND Tag <> 'mn30_grd_m2' AND Tag <> 'mn15_grd_m2'";

            var queryTask = new QueryTask(ARCTIC);
            queryTask.execute(query, function (r) {
                $.each(r.features, function () {
                    _fot.add(this);
                });
            });
        });

        function setSunRenderingRule() {
            if (_isMultiDirectional) {
                _sun.setRenderingRule(new RasterFunction({
                    rasterFunction: 'MultiDirectionalShadedRelief_2'
                }));
                $('#slider-sun-azimuth').slider('disable');
                $('#slider-sun-altitude').slider('disable');
            }
            else {
                _sun.setRenderingRule(new RasterFunction({
                    rasterFunction: FXN,
                    functionArguments: {
                        Altitude: $('#slider-sun-altitude').slider('getValue'),
                        Azimuth: $('#slider-sun-azimuth').slider('getValue')
                    }
                }));
                $('#slider-sun-azimuth').slider('enable');
                $('#slider-sun-altitude').slider('enable');
            }
        }

        function setElevationRenderingRule() {
            var e_min = $('#slider-elevation').slider('getAttribute', 'min');
            var e_max = $('#slider-elevation').slider('getAttribute', 'max');
            var e_lef = $('#slider-elevation').slider('getValue')[0];
            var e_rig = $('#slider-elevation').slider('getValue')[1];

            var a_min = $('#slider-aspect').slider('getAttribute', 'min');
            var a_max = $('#slider-aspect').slider('getAttribute', 'max');
            var a_lef = $('#slider-aspect').slider('getValue')[0];
            var a_rig = $('#slider-aspect').slider('getValue')[1];

            var s_min = $('#slider-slope').slider('getAttribute', 'min');
            var s_max = $('#slider-slope').slider('getAttribute', 'max');
            var s_lef = $('#slider-slope').slider('getValue')[0];
            var s_rig = $('#slider-slope').slider('getValue')[1];

            if (e_min === e_lef && e_max === e_rig &&
                a_min === a_lef && a_max === a_rig &&
                s_min === s_lef && s_max === s_rig) {
                _ele.hide();
                return;
            }
            else {
                _ele.show();
            }

            _ele.setRenderingRule(new RasterFunction({
                rasterFunction: 'Filter_ElevationSlopeAspect',
                functionArguments: {
                    'NoDataRanges_Elevation': [
                        e_min,
                        e_lef,
                        e_rig,
                        e_max
                    ],
                    'InputRanges_Aspect': [
                        a_lef,
                        a_rig
                    ],
                    'InputRanges_Slope': [
                        s_lef,
                        s_rig
                    ]
                }
            }));
        }
    });
});
