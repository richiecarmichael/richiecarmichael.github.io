/* -----------------------------------------------------------------------------------
   Developed by the Esri JavaScript Team
   (c) 2019 Esri | http://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/core/watchUtils",
    "dojo/debounce",
    "dojo/number"
],
function (
    Map,
    MapView,
    FeatureLayer,
    watchUtils,
    debounce,
    number
    ) {
    // Enforce strict mode
    "use strict";

    var URL = "https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/quakes/FeatureServer/0";
    var INFO = "http://earthquake.usgs.gov/earthquakes/eventpage/";

    var MAGNITUDE_MIN = 5;                    // Chart's smallest earthquake magnitude
    var MAGNITUDE_MAX = 10;                   // Chart's largest earthquake magnitude
    var DATE_MIN = new Date(1900, 0, 1);      // Chart's start date
    var DATE_MAX = new Date(2020, 0, 1);      // Chart's end date

    var isdragging = false;
    var startTime = DATE_MIN;
    var endTime = DATE_MAX;
    var total = 0;
    var highlight = null;

    var featureLayerQuake = new FeatureLayer({
        url: URL,
        definitionExpression: `mag >= ${MAGNITUDE_MIN}`,
        outFields: ["time", "depth", "mag", "place", "type", "id"],
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
        },
        popupTemplate: {
            title: "{place}",
            content: [{
                type: "fields",
                fieldInfos: [{
                    fieldName: "type",
                    label: "Type",
                    visible: true
                }, {
                    fieldName: "mag",
                    label: "Magnitude",
                    visible: true,
                    format: {
                        places: 1
                    }
                }, {
                    fieldName: "depth",
                    label: "Depth (km)",
                    visible: true,
                    format: {
                        digitSeparator: true,
                        places: 2
                    }
                }, {
                    fieldName: "time",
                    label: "Date",
                    visible: true
                }, {
                    fieldName: "id",
                    label: "id",
                    visible: true
                }]
            }] 
        }
    });

    var map = new Map({
        basemap: 'dark-gray-vector',
        layers: [featureLayerQuake]
    });

    // Create map and view
    var view = new MapView({
        container: 'map',
        center: [170, 0],
        zoom: 2,
        map: map,
        ui: {
            components: []
        },
        padding: {
            left: 0, 
            top: 55, 
            right: 0,
            bottom: 225
        }
    });

    var quakeView = null;
    view.whenLayerView(featureLayerQuake).then(function(layerView){
        quakeView = layerView;

        featureLayerQuake.queryFeatureCount({
            where: `mag >= ${MAGNITUDE_MIN}`
        }).then(function(count){
            total = count;
        });

        watchUtils.whenFalseOnce(quakeView, "updating", function() {
            loadChart();
        });
    });

    view.on("resize", function(e){
        if (!quakeView) {return;}
        if (quakeView.updating) {return;}
        if (e.oldWidth === e.width){return;}
        // Select quakes
        debounce(loadChart(), 100);
    });

    function loadChart() {
        document.getElementById('chart').innerHTML = "";

        var margin = {
            left: 80,
            top: 45,
            right: 50,
            bottom: 35
        };
        var width = document.getElementById('chart').clientWidth;
        var height = document.getElementById('chart').clientHeight;

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
                .attr('transform', 'translate(30,120) rotate(-90)')
                .text('Magnitude');

        svg.append('g')
            .attr('transform', `translate(${margin.left},${height - margin.bottom})`)
            .call(xaxis);

        svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`)
            .call(yaxis);

        var xmin = x(DATE_MIN);
        var xmax = x(DATE_MAX);
        var ymin = y(MAGNITUDE_MIN);
        var ymax = y(MAGNITUDE_MAX);

        var start = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`)
            .append('g')
                .attr('id', 'timeline-start')
                .attr('transform', `translate(${xmin},${0})`)
                .attr('cursor', 'grab')
                .call(d3.behavior.drag()
                    .on('dragstart', function () {
                        // Suppress drag events
                        d3.event.sourceEvent.stopPropagation();
                        d3.event.sourceEvent.preventDefault();

                        // Disable dot events
                        d3.select('#dots').style({
                            'pointer-events': 'none'
                        });

                        d3.select(this).style({
                            'cursor': 'grabbing'
                        });

                        // Set dragging flag
                        isdragging = true;
                    })
                    .on('drag', function () {
                        // Get mouse location. Exit if mouse beyond chart bounds.
                        var mouse = d3.mouse(this.parentNode)[0];

                        // Update current time
                        var time = x.invert(mouse);
                        if (time < DATE_MIN || time > endTime ) {return;}
                        startTime = time;

                        // Select map and UI.
                        debounce(updateChart(), 50);
                    })
                    .on('dragend', function () {
                        // Restore event listening for all dots
                        d3.select('#dots').style({
                            'pointer-events': 'all'
                        });

                        d3.select(this).style({
                            'cursor': 'grab'
                        });

                        // Update dragging flag
                        isdragging = false;

                        updateHeading();
                    })
                );
        
        var end = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`)
            .append('g')
                .attr('id', 'timeline-end')
                .attr('transform', `translate(${xmax},${0})`)
                .attr('cursor', 'grab')
                .call(d3.behavior.drag()
                    .on('dragstart', function () {
                        // Suppress drag events
                        d3.event.sourceEvent.stopPropagation();
                        d3.event.sourceEvent.preventDefault();

                        // Disable dot events
                        d3.select('#dots').style({
                            'pointer-events': 'none'
                        });

                        d3.select(this).style({
                            'cursor': 'grabbing'
                        });

                        // Set dragging flag
                        isdragging = true;
                    })
                    .on('drag', function () {
                        // Get mouse location. Exit if mouse beyond chart bounds.
                        var mouse = d3.mouse(this.parentNode)[0];

                        // Update current time
                        var time = x.invert(mouse);
                        if (time > DATE_MAX || time < startTime ) {return;}
                        endTime = time;

                        // Update map and UI.
                        debounce(updateChart(), 50);
                    })
                    .on('dragend', function () {
                        // Restore event listening for all dots
                        d3.select('#dots').style({
                            'pointer-events': 'all'
                        });
                        d3.select(this).style({
                            'cursor': 'grab'
                        });

                        // Update dragging flag
                        isdragging = false;

                        updateHeading();
                    })
                );
        
        start.append('line')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', ymin)
            .attr('y2', ymax);

        end.append('line')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', ymin)
            .attr('y2', ymax);

        start.append('circle')
            .attr('cx', 0)
            .attr('cy', ymax)
            .attr('r', 7);

        end.append('circle')
            .attr('cx', 0)
            .attr('cy', ymax)
            .attr('r', 7);

        quakeView.queryFeatures().then(function(results){
            svg.append('g')
                .attr('id', 'dots')
                .attr('transform', `translate(${margin.left},${margin.top})`)
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
                        d3.select(this).classed('highlight', true).attr('r', 7);

                        if (highlight) {
                            highlight.remove();
                        }
                        highlight = quakeView.highlight(d);
                    })
                    .on('mouseleave', function (d) {
                        d3.select(this).classed('highlight', false).attr('r', 1);
                        if (highlight) {
                            highlight.remove();
                        }
                    })
                    .on('click', function (d) {
                        view.goTo({
                            target: d
                        }, {
                            animate: true,
                            duration: 300,
                            easing: "ease"
                        });
                    });
        });

        updateHeading();

        function updateChart() {
            var xstart = x(startTime);
            var xend = x(endTime);
            d3.select('#timeline-start').attr('transform', `translate(${xstart},${0})`);
            d3.select('#timeline-end').attr('transform', `translate(${xend},${0})`);

            quakeView.effect = {
                filter: {
                    timeExtent: {
                        start: startTime,
                        end: endTime
                    }
                },
                insideEffect: null,
                outsideEffect: "saturate(0%) opacity(25%)"
            };
        }

        function updateHeading(){
            var query = featureLayerQuake.createQuery();
            query.timeExtent = {
                start: startTime,
                end: endTime
            }
            featureLayerQuake.queryFeatureCount(query).then(function(count){
                var formatCount = number.format(count);
                var formatTotal = number.format(total);
                document.getElementById('results').innerHTML = `${formatCount} of ${formatTotal}`;
            });
        }
    }
});
