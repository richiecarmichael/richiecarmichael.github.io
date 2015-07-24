/* -----------------------------------------------------------------------------------
   Map Lens
   Developed by the Applications Prototype Lab
   (c) 2014 Esri | http://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

require([
    'esri/map',
    'esri/geometry/Point',
    'esri/geometry/Extent',
    'dojo/domReady!'
],
function (
    Map,
    Point,
    Extent
    ) {
    $(document).ready(function () {
        'use strict';

        // Disable pan and zoom inertia
        esriConfig.defaults.map.panDuration = 0;
        esriConfig.defaults.map.zoomDuration = 1;

        // Create basic map with gray basemap
        var map = new Map('map', {
            zoom: 3,
            basemap: 'streets'
        });
        map.on('load', function () {
            // Add four Lenses 
            $.each(['satellite', 'osm', 'topo', 'national-geographic'], function () {
                var SIZE = 250;
                var x = $('#map').width() / 2 - SIZE / 2 + (Math.random() - 0.5) * 300;
                var y = $('#map').height() / 2 - SIZE / 2 + (Math.random() - 0.5) * 300;
                Lens(map, this, x, y, SIZE, SIZE);
            });
        });
    });

    // Lens definition 
    function Lens(map, basemap, x, y, width, height) {
        var m = $(document.createElement('div')).uniqueId().css({
            width: '100%',
            height: '100%',
            border: '0px'
        });
        var d = $(document.createElement('div'))
            .addClass('ui-widget-content apl-lens')
            .uniqueId()
            .css({
                width: width + 'px',
                height: height + 'px',
                position: 'absolute',
                zIndex: '1',
                border: 'none',
                'box-shadow': '2px 2px 10px 0px rgba(50, 50, 50, 0.5)'
            })
            .draggable({
                containment: 'window',
                scroll: false,
                drag: function () {
                    update();
                }
            })
            .resizable({
                maxHeight: 500,
                maxWidth: 500,
                minHeight: 100,
                minWidth: 100
            })
            .resize(function () {
                if (!lens) { return; }
                lens.reposition();
                lens.resize();
            })
            .css({
                'left': x,
                'top': y
            })
            .mouseenter(function () {
                // Force lens to top on mouseover
                var max = 0;
                $('.apl-lens').each(function () {
                    max = Math.max(max, $(this).zIndex());
                });
                $(this).zIndex(++max);
            });

        // Add new draggable div and map div to DOM
        $('#' + map.id).parent().append(d.append(m));

        // Create Esri map from div
        var lens = new Map(m[0].id, {
            zoom: 3,
            basemap: basemap,
            logo: false,
            showAttribution: false,
            slider: false
        });
        lens.on('load', function (e) {
            // Disable normal map navigation
            e.map.disableMapNavigation();
            update();
        });

        map.on('pan', $.throttle(25, function (e) {
            update(e);
        }));
        map.on('extent-change', $.throttle(25, function (e) {
            update(e);
        }));

        function update(e) {
            if (!lens) { return; }
            var extent = e ? e.extent : map.extent;
            var p = d.position();
            var h = d.height();
            var w = d.width();
            lens.setExtent(new Extent({
                'xmin': extent.xmin + (extent.xmax - extent.xmin) * p.left / map.width,
                'ymin': extent.ymin + (extent.ymax - extent.ymin) * (map.height - p.top - h) / map.height,
                'xmax': extent.xmin + (extent.xmax - extent.xmin) * (p.left + w) / map.width,
                'ymax': extent.ymin + (extent.ymax - extent.ymin) * (map.height - p.top) / map.height,
                'spatialReference': map.spatialReference
            }));
        }
    }
});