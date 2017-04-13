/*    
    Copyright 2016 Esri

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

require([
    'esri/map',
    'esri/Color',
    'esri/SpatialReference',
    'esri/layers/ArcGISTiledMapServiceLayer',
    'esri/layers/ArcGISImageServiceLayer',
    'esri/layers/RasterFunction',
    'esri/layers/ImageServiceParameters',
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
        var BASE = 'https://services.arcgisonline.com/arcgis/rest/services/Polar/Arctic_Ocean_Base/MapServer';
        var ARCTIC = 'https://maps.esri.com/apl1/rest/services/Arctic_DEM_APS/ImageServer';
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

        // Updating sun position with client-side raster function.
        function setSunRenderingRule() {
            if (_isMultiDirectional) {
                $('#slider-sun-azimuth').slider('disable');
                $('#slider-sun-altitude').slider('disable');

                _sun.setRenderingRule(new RasterFunction({
                    rasterFunction: 'MultiDirectionalShadedRelief'
                }));
            }
            else {
                $('#slider-sun-azimuth').slider('enable');
                $('#slider-sun-altitude').slider('enable');

                var mask = new RasterFunction();
                mask.functionName = 'Mask';
                mask.functionArguments = {
                    NoDataValues: ['0']
                };

                var hillshade = new RasterFunction();
                hillshade.functionName = 'Hillshade';
                hillshade.functionArguments = {
                    DEM: mask,
                    Azimuth: $('#slider-sun-azimuth').slider('getValue'),
                    Altitude: $('#slider-sun-altitude').slider('getValue')
                };

                _sun.setRenderingRule(hillshade);
            }
        }

        // Filtering elevation pixels with client-side raster function.
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

            var remap = new RasterFunction();
            remap.functionName = 'Remap';
            remap.functionArguments = {
                NoDataRanges: [e_min, e_lef, e_rig, e_max],
                AllowUnmatched: true
            };

            var aspect = new RasterFunction();
            aspect.functionName = 'Aspect';
            aspect.functionArguments = {
                Raster: remap
            };

            var remap2 = new RasterFunction();
            remap2.functionName = 'Remap';
            remap2.functionArguments = {
                Raster: aspect,
                InputRanges: [a_lef, a_rig],
                OutputValues: [1],
                AllowUnmatched: false
            };
            remap2.outputPixelType = 'U8';

            var slope = new RasterFunction();
            slope.functionName = 'Slope';
            slope.functionArguments = {
                DEM: remap,
                ZFactor: 1
            };

            var remap3 = new RasterFunction();
            remap3.functionName = 'Remap';
            remap3.functionArguments = {
                Raster: slope,
                InputRanges: [s_lef, s_rig],
                OutputValues: [1],
                AllowUnmatched: false
            };

            var arithmetic = new RasterFunction();
            arithmetic.functionName = 'Arithmetic';
            arithmetic.functionArguments = {
                Raster: remap2,
                Raster2: remap3,
                Operation: 1
            };
            arithmetic.outputPixelType = 'U8';

            var colormap = new RasterFunction();
            colormap.functionName = 'Colormap';
            colormap.functionArguments = {
                Raster: arithmetic,
                Colormap: [[2, 0, 255, 255]]
            };
            colormap.outputPixelType = 'U8';

            _ele.setRenderingRule(colormap);
        }

        //// Updating sun position with custom raster function.
        //function setSunRenderingRule() {
        //    if (_isMultiDirectional) {
        //        _sun.setRenderingRule(new RasterFunction({
        //            rasterFunction: 'MultiDirectionalShadedRelief'
        //        }));
        //        $('#slider-sun-azimuth').slider('disable');
        //        $('#slider-sun-altitude').slider('disable');
        //    }
        //    else {
        //        _sun.setRenderingRule(new RasterFunction({
        //            rasterFunction: 'DynamicShadedRelief',
        //            functionArguments: {
        //                Altitude: $('#slider-sun-altitude').slider('getValue'),
        //                Azimuth: $('#slider-sun-azimuth').slider('getValue')
        //            }
        //        }));
        //        $('#slider-sun-azimuth').slider('enable');
        //        $('#slider-sun-altitude').slider('enable');
        //    }
        //}

        //// Filtering elevation pixels with a custom raster function.
        //function setElevationRenderingRule() {
        //    var e_min = $('#slider-elevation').slider('getAttribute', 'min');
        //    var e_max = $('#slider-elevation').slider('getAttribute', 'max');
        //    var e_lef = $('#slider-elevation').slider('getValue')[0];
        //    var e_rig = $('#slider-elevation').slider('getValue')[1];

        //    var a_min = $('#slider-aspect').slider('getAttribute', 'min');
        //    var a_max = $('#slider-aspect').slider('getAttribute', 'max');
        //    var a_lef = $('#slider-aspect').slider('getValue')[0];
        //    var a_rig = $('#slider-aspect').slider('getValue')[1];

        //    var s_min = $('#slider-slope').slider('getAttribute', 'min');
        //    var s_max = $('#slider-slope').slider('getAttribute', 'max');
        //    var s_lef = $('#slider-slope').slider('getValue')[0];
        //    var s_rig = $('#slider-slope').slider('getValue')[1];

        //    if (e_min === e_lef && e_max === e_rig &&
        //        a_min === a_lef && a_max === a_rig &&
        //        s_min === s_lef && s_max === s_rig) {
        //        _ele.hide();
        //        return;
        //    }
        //    else {
        //        _ele.show();
        //    }

        //    _ele.setRenderingRule(new RasterFunction({
        //        rasterFunction: 'Filter_ElevationSlopeAspect',
        //        functionArguments: {
        //            'NoDataRanges_Elevation': [
        //                e_min,
        //                e_lef,
        //                e_rig,
        //                e_max
        //            ],
        //            'InputRanges_Aspect': [
        //                a_lef,
        //                a_rig
        //            ],
        //            'InputRanges_Slope': [
        //                s_lef,
        //                s_rig
        //            ]
        //        }
        //    }));
        //}
    });
});
