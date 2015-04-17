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

        // Add four Lenses 
        $.each(['satellite', 'osm', 'topo', 'national-geographic'], function () {
            var SIZE = 250;
            var x = $('#map').width() / 2 - SIZE / 2 + (Math.random() - 0.5) * 300;
            var y = $('#map').height() / 2 - SIZE / 2 + (Math.random() - 0.5) * 300;
            Lens(map, this, x, y, SIZE, SIZE);
        });
    });

    // Lens definition 
    function Lens(map, basemap, x, y, width, height) {
        var _d = null;
        var _map = null;
        map.on('pan', $.throttle(25, function (e) {
            parentUpdated(e)
        }));
        map.on('extent-change', $.throttle(25, function (e) {
            parentUpdated(e)
        }));
        map.on('load', function () {
            var m = $(document.createElement('div')).uniqueId().css({
                width: '100%',
                height: '100%',
                border: '0px'
            });
            _d = $(document.createElement('div'))
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
                        childUpdated();
                    }
                })
                .resizable({
                    maxHeight: 500,
                    maxWidth: 500,
                    minHeight: 100,
                    minWidth: 100
                })
                .resize(function () {
                    if (!_map) { return; }
                    _map.reposition();
                    _map.resize();
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
            $('#' + map.id).parent().append(_d.append(m));

            // Create Esri map from div
            _map = new Map(m[0].id, {
                zoom: 3,
                basemap: basemap,
                logo: false,
                showAttribution: false,
                slider: false
            });
            _map.on('load', function (e) {
                // Disable normal map navigation
                e.map.disableMapNavigation();
            });
            childUpdated();
        });
        function childUpdated() {
            if (!_map) { return; }
            var p = _d.position();
            var x1 = p.left;
            var y1 = p.top + _d.height();
            var x2 = p.left + _d.width();
            var y2 = p.top;
            var ll = map.toMap(new Point({ 'x': x1, 'y': y1 }));
            var ur = map.toMap(new Point({ 'x': x2, 'y': y2 }));
            _map.setExtent(new Extent({
                'xmin': ll.x,
                'ymin': ll.y,
                'xmax': ur.x,
                'ymax': ur.y,
                'spatialReference': map.spatialReference
            }));
        }
        function parentUpdated(e) {
            if (!_map) { return; }
            var p = _d.position();
            var h = _d.height();
            var w = _d.width();
            _map.setExtent(new Extent({
                'xmin': e.extent.xmin + (e.extent.xmax - e.extent.xmin) * p.left / e.target.width,
                'ymin': e.extent.ymin + (e.extent.ymax - e.extent.ymin) * (e.target.height - p.top - h) / e.target.height,
                'xmax': e.extent.xmin + (e.extent.xmax - e.extent.xmin) * (p.left + w) / e.target.width,
                'ymax': e.extent.ymin + (e.extent.ymax - e.extent.ymin) * (e.target.height - p.top) / e.target.height,
                'spatialReference': e.target.spatialReference
            }));
        }
    }
});