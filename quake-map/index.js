/* -----------------------------------------------------------------------------------
   Developed by the Esri JavaScript Team
   (c) 2019 Esri | http://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

require([
    "esri/Map",
    "esri/Graphic",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/core/watchUtils",
    "dojo/debounce",
    "dojo/number"
],
function (
    Map,
    Graphic,
    MapView,
    FeatureLayer,
    watchUtils,
    debounce,
    number
    ) {
    "use strict";

    const URL = "https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/quakes/FeatureServer/0";
    const MAGNITUDE_MIN = 6;                // Chart's smallest earthquake magnitude
    const MAGNITUDE_MAX = 10;               // Chart's largest earthquake magnitude
    const DATE_MIN = new Date(1900, 0, 1);  // Chart's start date
    const DATE_MAX = new Date(2020, 0, 1);  // Chart's end date

    let isdragging = false;
    let startTime = DATE_MIN;
    let endTime = DATE_MAX;
    let total = 0;
    let highlight = null;
    let index = {};
    let magnitude = MAGNITUDE_MIN;

    const vars = getUrlVars();
    if (vars && vars.mag) {
        var mag = Number.parseFloat(vars.mag);
        if (!Number.isNaN(mag)){
            if (mag > 0 && mag < MAGNITUDE_MAX){
                magnitude = mag;
            }
        }
    }

    const featureLayerQuake = new FeatureLayer({
        url: URL,
        definitionExpression: `mag >= ${magnitude}`,
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

    const map = new Map({
        basemap: 'dark-gray-vector',
        layers: [featureLayerQuake]
    });

    // Create map and view
    const view = new MapView({
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

    let quakeView = null;
    view.whenLayerView(featureLayerQuake).then(function(layerView){
        quakeView = layerView;

        featureLayerQuake.queryFeatureCount({
            where: `mag >= ${magnitude}`
        }).then(function(count){
            total = count;
        });

        watchUtils.whenFalseOnce(quakeView, "updating", function() {
            loadChart();
        });
    });

    view.on("resize", function(event){
        if (!quakeView) { return; }
        if (quakeView.updating) { return; }
        if (event.oldWidth === event.width){ return; }
        // Select quakes
        debounce(loadChart(), 100);
    });

    view.on("pointer-move", function(event){
        if (!quakeView) { return; }
        highlightEarthquakes(event);
    });

    view.on("pointer-leave", function(){
        clearSelection();
    });

    function clearSelection(){
        view.graphics.removeAll();

        if (highlight) {
            highlight.remove();
            highlight = null;
        }

        d3.selectAll("#dots circle").classed('highlight', false);
    }

    function highlightEarthquakes(event) {
        event.stopPropagation();

        const query = featureLayerQuake.createQuery();
        query.timeExtent = {
            start: startTime,
            end: endTime
        };
        query.geometry = view.toMap(event);
        query.distance = 500;
        query.units = "kilometers";
        query.returnQueryGeometry = true;
        
        quakeView.queryFeatures(query).then(function(results) {
            // Remove current highlights.
            clearSelection();

            // Add search circle to map.
            view.graphics.add(new Graphic({
                geometry: results.queryGeometry,      
                symbol: {
                    type: "simple-fill",
                    color: null,
                    outline: {
                        color: [255, 255, 255, 0.5],
                        width: 0.5
                    }
                }
            }));

            // Highlight selected quakes on map.
            highlight = quakeView.highlight(results.features);

            // Highlight selected quakes in the chart.
            results.features.forEach(function(feature){
                const dot = index[feature.attributes.OBJECTID];
                d3.select(dot).classed('highlight', true);
            });
        });
    }

    function loadChart() {
        document.getElementById('chart').innerHTML = "";

        const margin = {
            left: 80,
            top: 45,
            right: 50,
            bottom: 35
        };
        const width = document.getElementById('chart').clientWidth;
        const height = document.getElementById('chart').clientHeight;

        const svg = d3.select('#chart')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const x = d3.time.scale()
            .domain([DATE_MIN, DATE_MAX])
            .range([0, width - margin.left - margin.right]);

        const y = d3.scale.linear()
            .domain([magnitude, MAGNITUDE_MAX])
            .range([height - margin.top - margin.bottom, 0]);

        const xaxis = d3.svg.axis()
            .scale(x)
            .orient('bottom');

        const yaxis = d3.svg.axis()
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

        const xmin = x(DATE_MIN);
        const xmax = x(DATE_MAX);
        const ymin = y(magnitude);
        const ymax = y(MAGNITUDE_MAX);

        const start = svg.append('g')
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
        
        const end = svg.append('g')
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
                        d3.select(this).classed('highlight', true);

                        if (highlight) {
                            highlight.remove();
                            highlight = null;
                        }
                        highlight = quakeView.highlight(d);
                    })
                    .on('mouseleave', function (d) {
                        d3.select(this).classed('highlight', false);
                        if (highlight) {
                            highlight.remove();
                            highlight = null;
                        }
                    })
                    .on('click', function (d) {
                        const options = {
                            animate: true,
                            duration: 300,
                            easing: "ease"
                        };
                        view.goTo({target: d}, options).then(function(){
                            view.popup.open({
                                location: {
                                    latitude: d.attributes.latitude,
                                    longitude: d.attributes.longitude
                                },
                                features: [d]
                            });
                        });
                    });

            d3.selectAll('#dots circle').each(function(d){
                index[d.attributes.OBJECTID] = this;
            });
        });

        updateHeading();

        function updateChart() {
            const xstart = x(startTime);
            const xend = x(endTime);
            d3.select('#timeline-start').attr('transform', `translate(${xstart},${0})`);
            d3.select('#timeline-end').attr('transform', `translate(${xend},${0})`);

            quakeView.effect = {
                filter: {
                    timeExtent: {
                        start: startTime,
                        end: endTime
                    }
                },
                includedEffect: null,
                excludedEffect: "saturate(0%) opacity(25%)"
            };
        }

        function updateHeading(){
            let query = featureLayerQuake.createQuery();
            query.timeExtent = {
                start: startTime,
                end: endTime
            }
            featureLayerQuake.queryFeatureCount(query).then(function(count){
                const formatCount = number.format(count);
                const formatTotal = number.format(total);
                document.getElementById('results').innerHTML = `${formatCount} of ${formatTotal}`;
            });
        }
    }

    function getUrlVars() {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for (var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }
        return vars;
    }
});
