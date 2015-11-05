/* -----------------------------------------------------------------------------------
   Arctic DEM
   Develolped by the Applications Prototype Lab
   (c) 2015 Esri | http://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

require([
    'esri/map',
    'esri/SpatialReference',
    'esri/layers/ArcGISImageServiceLayer',
    'esri/layers/RasterFunction',
    'esri/geometry/Extent',
    'esri/urlUtils',
    'dojo/domReady!'
],
function (
    Map,
    SpatialReference,
    ArcGISImageServiceLayer,
    RasterFunction,
    Extent,
    urlUtils
    ) {
    $(document).ready(function () {
        // Enforce strict mode
        'use strict';

        // Hardcoded constants
        var ARCTIC = 'http://ngamaps.geointapps.org/arcgis/rest/services/Arctic_Summit/Arctic_DEM/ImageServer';
        var PROXY = 'http://maps.esri.com/rc/arctic/proxy.ashx';
        var FXN = 'DEM_Hillshade';
        var EXTENT = new Extent(-16774646, 8615655, -16548851, 8750337, new SpatialReference(102100));

        // Inidicate usage of proxy for the following hosted map services
        $.each([ARCTIC], function () {
            urlUtils.addProxyRule({
                urlPrefix: this,
                proxyUrl: PROXY
            });
        });

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
            _ele.refresh();
        });

        // Bookmarks
        $('#bookmarks > button').click(function () {
            $(this).addClass('disabled').siblings().removeClass('disabled');
            var split = $(this).attr('data-extent').split(',');
            var extent = new Extent(
                Number(split[0]),
                Number(split[1]),
                Number(split[2]),
                Number(split[3]),
                new SpatialReference(4326)
            );
            _map.setExtent(extent, true);
        });

        // Initiate Popover
        $(function () {
            $('[data-toggle="popover"]').popover({
                html: true
            });
        });
        
        // Create layers
        var _sun = new ArcGISImageServiceLayer(ARCTIC);
        var _ele = new ArcGISImageServiceLayer(ARCTIC, { opacity: 0.5 });

        // Update layer settings
        setSunRenderingRule();
        setElevationRenderingRule();

        // Create map and add basemap
        var _map = new Map('map', {
            basemap: 'satellite',
            logo: true,
            showAttribution: false,
            slider: true,
            extent: EXTENT
        });
        _map.addLayers([
            _sun,
            _ele
        ]);

        function setSunRenderingRule() {
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
    });
});
