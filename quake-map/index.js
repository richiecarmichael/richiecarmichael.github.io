/* -----------------------------------------------------------------------------------
   Developed by the Esri JavaScript Team
   (c) 2019 Esri | http://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/core/watchUtils"
],
function (
    Map,
    MapView,
    FeatureLayer,
    watchUtils
    ) {
    $(document).ready(function () {
        // Enforce strict mode
        "use strict";

        var URL = "https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/quakes/FeatureServer/0";

        var MAGNITUDE_MIN = 5;                          // Chart's smallest earthquake magnitude
        var MAGNITUDE_MAX = 10;                         // Chart's largest earthquake magnitude
        var DATE_MIN = new Date(1900, 0, 1);            // Chart's start date
        var DATE_MAX = new Date(2020, 0, 1);            // Chart's end date
        var DATE_START = new Date(2018, 1, 22);          // The chart's initial date

        var TICKS_PER_YEAR = 1000 * 60 * 60 * 24 * 365; // The number of milliseconds in one year
        var SELECTION = TICKS_PER_YEAR / 2;             // Quake selection width (milliseconds) on the chart

        var isdragging = false;
        var currentTime = DATE_START;

        var quakes = new FeatureLayer({
            url: URL,
            definitionExpression: "mag >= 4.8",
            outFields: ["time", "mag"],
            renderer: {
                type: "simple",
                symbol: {
                    type: "simple-marker",
                    style: "circle",
                    size: 3,
                    color: "#FF0055",
                    outline: {
                        style: "solid",
                        color: "#1D2224",
                        width: 0.5
                    }
                }
            }
        });

        var map = new Map({
            basemap: 'dark-gray-vector',
            layers: [quakes]
        })

        // Create map and view
        var view = new MapView({
            container: 'map',
            center: [114.194167, 22.328611],
            zoom: 3,
            map: map,
            ui: {
                components: []
            }
        });

        var quakeView = null;
        view.whenLayerView(quakes).then(function(layerView){
            quakeView = layerView;
 
            watchUtils.whenFalseOnce(layerView, "updating", function() {
                loadChart();
            });

            // Re-generate chart when the window resizes
            var width = $('#chart').width();
            $(window).debounce('resize', function () {
                // Exit if width is unchanged
                var w = $('#chart').width();
                if (width === w) { return; }
                width = w;

                // Load chart
                if (!layerView.updating){
                    loadChart();
                }
            }, 250);
        });

        function loadChart() {
            // Clear chart
            $('#chart').empty();

            var margin = {
                left: 80,
                top: 20,
                right: 50,
                bottom: 35
            };
            var width = $('#chart').width();
            var height = $('#chart').height();

            var svg = d3.select('#chart')
                .append('svg')
                .attr('width', width)
                .attr('height', height);

            var x = d3.time.scale()
                .domain([DATE_MIN, DATE_MAX])
                .range([0, width - margin.left - margin.right]);

            var y = d3.scale.linear()
                .domain([MAGNITUDE_MIN, MAGNITUDE_MAX])
                .range([height - margin.top - margin.bottom, 0]);

            var xaxis = d3.svg.axis()
                .scale(x)
                .orient('bottom');

            var yaxis = d3.svg.axis()
                .scale(y)
                .orient('left')
                .tickValues([5, 6, 7, 8, 9, 10]);

            svg.append('g')
                .attr('id', 'yaxis')
                .append('text')
                    .attr('transform', $.format('translate({0},{1}) rotate({2})', [30, 120, -90]))
                    .text('Magnitude');

            svg.append('g')
                .attr('transform', $.format('translate({0},{1})', [margin.left, height - margin.bottom]))
                .call(xaxis);

            svg.append('g')
                .attr('transform', $.format('translate({0},{1})', [margin.left, margin.top]))
                .call(yaxis);

            var pointer = svg.append('g')
                .attr('transform', $.format('translate({0},{1})', [margin.left, margin.top]))
                .append('g')
                    .attr('id', 'timeline')
                    .attr('transform', $.format('translate({0},{1})', [x(currentTime), 0]))
                    .call(d3.behavior.drag()
                        .on('dragstart', function () {
                            // Suppress drag events
                            d3.event.sourceEvent.stopPropagation();
                            d3.event.sourceEvent.preventDefault();

                            // Disable dot events
                            d3.select('#dots').style({
                                'pointer-events': 'none'
                            });

                            // Set dragging flag
                            isdragging = true;
                        })
                        .on('drag', function () {
                            // Get mouse location. Exit if mouse beyond chart bounds.
                            var mouse = d3.mouse(this.parentNode)[0];
                            var chartWidth = width - margin.left - margin.right;
                            if (mouse < 0 || mouse > chartWidth) { return; }

                            // Update current time
                            currentTime = x.invert(mouse);

                            // Select quakes
                            selectQuakes();
                        })
                        .on('dragend', function () {
                            // Restore event listening for all dots
                            d3.select('#dots').style({
                                'pointer-events': 'all'
                            });

                            // Update dragging flag
                            isdragging = false;
                        })
                    );

            pointer.append('line')
                .attr('x1', 0)
                .attr('x2', 0)
                .attr('y1', y(MAGNITUDE_MIN))
                .attr('y2', y(MAGNITUDE_MAX));

            pointer.append('polygon')
                .attr('points', $.format('{0},{1} {2},{3} {4},{5}', [
                    0, y(MAGNITUDE_MAX),
                    -10, y(MAGNITUDE_MAX) + 5,
                    0, y(MAGNITUDE_MAX) + 10
                ]));

            pointer.append('polygon')
                .attr('points', $.format('{0},{1} {2},{3} {4},{5}', [
                    0, y(MAGNITUDE_MAX),
                    10, y(MAGNITUDE_MAX) + 5,
                    0, y(MAGNITUDE_MAX) + 10
                ]));
            
            quakeView.queryFeatures().then(function(results){
                svg.append('g')
                    .attr('id', 'dots')
                    .attr('transform', $.format('translate({0},{1})', [margin.left, margin.top]))
                    .style({
                        'pointer-events': 'all'
                    })
                    .selectAll('circle')
                    .data(results.features)
                    .enter()
                    .append('circle')
                        .attr('cx', function (d) {
                            return x(d.attributes.time);
                        })
                        .attr('cy', function (d) {
                            return y(d.attributes.mag);
                        })
                        .attr('r', 1)
                        .on('mouseenter', function (d) {
                            if (isdragging) { return; }
                            d3.select(this)
                                .classed('selected', true)
                                .attr('r', 5);
                        })
                        .on('mouseleave', function (d) {
                            d3.select(this)
                                .classed('selected', false)
                                .attr('r', 1);
                        })
                        .on('click', function (d) {
                            currentTime = d.time;
                            view.animateTo({
                                target: [d.longitude, d.latitude],
                                heading: 0
                            }, {
                                delay: 0,
                                duration: 10000
                            });
                            selectQuakes();
                        });
            });
            
            // Select quakes
            selectQuakes();

            function selectQuakes() {
                // Move red timeline into position
                d3.select('#timeline').attr('transform', $.format('translate({0},{1})', [
                    x(currentTime),
                    0
                ]));
                quakeView.filter = {
                    timeExtent: {
                        start: null, // new Date(currentTime.valueOf() - TICKS_PER_YEAR),
                        end: currentTime
                    }
                };
            }
        }

        $('a').attr('target', '_blank');

        $.format = function (f, e) {
            $.each(e, function (i) {
                f = f.replace(new RegExp('\\{' + i + '\\}', 'gm'), this);
            });
            return f;
        };

        $.fn.debounce = function (on, func, threshold) {
            var debounce = function (func, threshold, execAsap) {
                var timeout;
                return function debounced() {
                    var obj = this;
                    var args = arguments;
                    function delayed() {
                        if (!execAsap) {
                            func.apply(obj, args);
                        }
                        timeout = null;
                    }
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    else if (execAsap) {
                        func.apply(obj, args);
                    }
                    timeout = setTimeout(delayed, threshold || 100);
                };
            };
            $(this).on(on, debounce(func, threshold));
        };
    });
});
