/* ------------------------------------------------------------
   Developed by the Applications Prototype Lab
   (c) 2016 Esri | http://www.esri.com/legal/software-license  
--------------------------------------------------------------- */

require([
    'esri/Map',
    'esri/Graphic',
    'esri/geometry/SpatialReference',
    'esri/symbols/FillSymbol3DLayer',
    'esri/symbols/PolygonSymbol3D',
    'esri/renderers/SimpleRenderer',
    'esri/layers/GraphicsLayer',
    'esri/tasks/support/Query',
    'esri/tasks/QueryTask',
    'esri/views/SceneView',
    'dojo/domReady!'
],
function (
    Map,
    Graphic,
    SpatialReference,
    FillSymbol3DLayer,
    PolygonSymbol3D,
    SimpleRenderer,
    GraphicsLayer,
    Query,
    QueryTask,
    SceneView
    ) {
    $(document).ready(function () {
        // Enforce strict mode
        'use strict';

        // jQuery formating function
        $.format = function (f, e) {
            $.each(e, function (i) {
                f = f.replace(new RegExp('\\{' + i + '\\}', 'gm'), this);
            });
            return f;
        };

        // Application constants
        //var SOLAR = 'https://gd3d.esri.com/server/rest/services/Hosted/SolarEclipse_WSL/FeatureServer/0';
        //var SOLAR = 'https://gd3d.esri.com/server/rest/services/Hosted/SolarEclipse_WSL/SceneServer';
        var SOLAR = 'http://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/SolarEclipsePath/FeatureServer/0';
        var GEOMETRYPRECISION = 2;
        var MAXALLOWABLEOFFSET = 0.1;
        var OFFSET = 200000;
        var DATE_MIN = 1600;
        var DATE_MAX = 2200;
        var DATE_STA = 2017;
        var DURATION_MIN = 0;
        var DURATION_MAX = 800;
        var POINTER_WIDTH = 10; // years

        // Application variables
        var _paths = null;
        var _currentTime = DATE_STA;
        var _selected = null;

        // Create map and view
        var _view = new SceneView({
            container: 'map',
            ui: {
                // Only show zoom-in, zoom-out and compass elements
                components: [
                    'zoom',
                    'compass'
                ]
            },
            padding: {
                // Encourage the globe to leave some space at the bottom of the window for the chart
                left: 0,
                top: 50,
                right: 0,
                bottom: 200
            },
            center: [40, 22], // Center the globe around Europe
            environment: {
                // Disable lighting and stars
                lighting: {
                    directShadows: false,
                    ambientOcclusion: false
                },
                atmosphere: 'default',
                stars: 'none'
            },
            map: new Map({
                basemap: 'satellite',
                layers: [
                    new GraphicsLayer({
                        // Graphics from this layer will be toggled on/off with the 'visible' property
                        id: 'solar',
                        elevationInfo: {
                            mode: 'absoluteHeight',
                            offset: OFFSET
                        },
                        renderer: new SimpleRenderer({
                            symbol: new PolygonSymbol3D({
                                symbolLayers: [
                                    new FillSymbol3DLayer({
                                        material: {
                                            color: 'rgba(255, 255, 255, 0.5)'
                                        }
                                    })
                                ]
                            })
                        })
                    }),
                    new GraphicsLayer({
                        // This layer will be used to simulate selection
                        id: 'highlight',
                        elevationInfo: {
                            mode: 'absoluteHeight',
                            offset: OFFSET
                        },
                        renderer: new SimpleRenderer({
                            symbol: new PolygonSymbol3D({
                                symbolLayers: [
                                    new FillSymbol3DLayer({
                                        material: {
                                            color: 'rgba(0, 255, 255, 1)'
                                        }
                                    })
                                ]
                            })
                        })
                    })
                ]
            })
        });
        _view.on('click', function (e) {
            // Hide popup if nothing clicked
            if (!e.graphic) {
                _view.popup.viewModel.visible = false;
                return;
            }

            // Construct popup title
            var title = '';
            switch (e.graphic.attributes.EclType) {
                case 'A':
                    title = 'Annular Solar Eclipse';
                    break;
                case 'H':
                    title = 'Hybrid Solar Eclipse';
                    break;
                case 'T':
                    title = 'Total Solar Eclipse';
                    break;
                default:
                    title = 'Solar Eclipse';
                    break;
            }

            // Construct content
            var TEMPLATE = '<div><div class="rcHeading">{0}</div><div class="rcValue">{1}</div></div>';
            var content = '';
            content += $.format(TEMPLATE, [
                'Date',
                new Date(e.graphic.attributes.Date).toLocaleDateString()
            ]);
            content += $.format(TEMPLATE, [
                'Time',
                new Date(e.graphic.attributes.TimeGE).toLocaleTimeString()
            ]);
            content += $.format(TEMPLATE, [
                'Duration',
                e.graphic.attributes.DurationSeconds + ' seconds'
            ]);
            content += $.format(TEMPLATE, [
                'Width',
                e.graphic.attributes.PathWid + ' km'
            ]);
            content += $.format(TEMPLATE, [
                'Magnitude',
                e.graphic.attributes.EclMagn
            ]);
            content += $.format(TEMPLATE, [
                'Sun Altitude',
                e.graphic.attributes.SunAlt + '°'
            ]);
            content += $.format(TEMPLATE, [
                'Sun Azimuth',
                e.graphic.attributes.SunAzi + '°'
            ]);
            content += $.format(TEMPLATE, [
                'Lunation',
                e.graphic.attributes.Lunation
            ]);
            content += $.format(TEMPLATE, [
                'Saros Cycle',
                e.graphic.attributes.Saro
            ]);
            content += $.format(TEMPLATE, [
                'Gamma',
                e.graphic.attributes.Gamma
            ]);
            content += $.format(TEMPLATE, [
                'Delta-T',
                e.graphic.attributes.DT + ' seconds'
            ]);

            // Update and display popup
            _view.popup.viewModel.set({
                docked: false,
                title: title,
                content: content,
                location: e.mapPoint,
                visible: true
            });
        });
        _view.then(function () {
            //return;
            //var d1 = downloadData(0, 200);
            //var d2 = downloadData(0, 200);
            //var d3 = downloadData(0, 200);
            //var d4 = downloadData(0, 200);
            //var d5 = downloadData(0, 200);
            $.when(
                downloadData(0, 200),
                downloadData(200, 200),
                downloadData(400, 200),
                downloadData(600, 200),
                downloadData(800, 200)
                ).done(function (v1, v2, v3, v4, v5) {
                    // Concatenate all graphics
                    _paths = [].concat.call(v1, v2, v3, v4, v5);

                    // Load the chart
                    drawChart();

                    // Reload chart if window resized
                    var width = $(window).width();
                    $(window).resize($.debounce(250, function () {
                        var w = $(window).width();
                        if (width !== w) {
                            width = w;
                            drawChart();
                        }
                    }));
                }
            );
        });

        $('#map').mousemove($.throttle(50, function (e) {
            // Exit if view not initialized
            if (!_view || !_view.ready) { return; }

            _view.hitTest(e.offsetX, e.offsetY).then(function (p) {
                // Nothing found. Clear selection (if any).
                if (!p) { return; }

                // Nothing found and nothing previously selected.
                if (!p.graphic && !_selected) {
                    return;
                }

                // Nothing found and existing selection.
                if (!p.graphic && _selected) {
                    // Remove old selection.
                    _selected = null;
                    _view.map.getLayer('highlight').clear();
                    d3.selectAll('#chart circle.eclipse').classed({ hover: false }).attr('r', 3);
                    return;
                }

                // Graphic found and something already selected.
                if (p.graphic && _selected) {
                    // Same graphic selected
                    if (_selected === p.graphic.attributes.OBJECTID) {
                        
                        return;
                    }

                    // New graphic selected.
                    _selected = p.graphic.attributes.OBJECTID;
                    _view.map.getLayer('highlight').clear();
                    _view.map.getLayer('highlight').add(new Graphic({
                        attributes: p.graphic.attributes,
                        geometry: p.graphic.geometry
                    }));
                    d3.selectAll('#chart circle.eclipse')
                        .classed({
                            hover: function (d) {
                                return d.attributes.OBJECTID === _selected;
                            }
                        })
                        .attr('r', function (d) {
                            return d.attributes.OBJECTID === _selected ? 5 : 3;
                        });

                    return;
                }

                // New selection
                if (p.graphic && !_selected) {
                    _selected = p.graphic.attributes.OBJECTID;
                    _view.map.getLayer('highlight').add(new Graphic({
                        attributes: p.graphic.attributes,
                        geometry: p.graphic.geometry
                    }));
                    d3.selectAll('#chart circle.eclipse')
                        .filter(function (d) {
                            return d.attributes.OBJECTID === _selected;
                        })
                        .classed({
                            hover: true
                        })
                        .attr('r', 5);
                    return;
                }
            });
        }));

        $('#button-help').click(function () {
            $('#help-about').fadeIn();
        });

        $('#button-about').click(function () {
            $('#window-about').fadeIn();
        });

        $('.dialog .close').click(function () {
            $(this).parents('.dialog').fadeOut();
        });

        $('a').attr('target', '_blank');

        function downloadData(start, num) {
            var defer = new $.Deferred();
            var query = new Query({
                start: start,
                num: num,
                returnGeometry: true,
                multipatchOption: 'xyFootprint',
                geometryPrecision: GEOMETRYPRECISION,
                maxAllowableOffset: MAXALLOWABLEOFFSET,
                outFields: [
                    'EclType',         // Eclipse Type
                    'Date',            // Eclipse Date
                    'TimeGE',          // Eclipse Time
                    'DurationSeconds', // Duration at Maximum Eclipse (seconds)
                    'PathWid',         // Path Width (km)
                    'EclMagn',         // Eclipse Magnitude
                    'SunAlt',          // Sun Altitude (°)
                    'SunAzi',          // Sun Azimuth (°)
                    'Lunation',        // Lunation
                    'Saro',            // Saros Cycle
                    'Gamma',           // Gamma
                    'DT'               // Delta-T (seconds)
                ],
                orderByFields: ['Date'],
                outSpatialReference: new SpatialReference({
                    wkid: 4326
                }),
                where: '1=1'
            });
            var queryTask = new QueryTask({
                url: SOLAR
            });
            queryTask.execute(query).then(function (r) {
                defer.resolve(r.features);
            });
            return defer.promise();
        }
        
        function drawChart() {
            // Remove SVG container (if any)
            d3.select('#chart svg').remove();

            // Define padding inside 'chart' div
            var margin = {
                left: 75,
                top: 20,
                right: 50,
                bottom: 35
            };

            // Create SVG container
            var width = $('#chart').width();
            var height = $('#chart').height();
            var svg = d3.select('#chart')
                .append('svg')
                .attr('width', width)
                .attr('height', height);

            // Define scales
            var x = d3.scale.linear()
                .domain([DATE_MIN, DATE_MAX])
                .range([
                    0,
                    width - margin.left - margin.right
                ]);
            var y = d3.scale.linear()
                .domain([DURATION_MIN, DURATION_MAX])
                .range([
                    height - margin.top - margin.bottom,
                    0
                ]);

            // Define axises
            var xaxis = d3.svg.axis()
                .scale(x)
                .orient('bottom')
                .tickFormat(d3.format('g'));
            var yaxis = d3.svg.axis()
                .scale(y)
                .orient('left')
                .tickValues([0, 200, 400, 600, 800]);

            // Draw x-axis
            svg.append('g')
                .classed({
                    axis: true
                })
                .attr('transform', $.format('translate({0},{1})', [
                    margin.left,
                    height - margin.bottom
                ]))
                .call(xaxis);

            // Draw y-axis
            svg.append('g')
                .classed({
                    axis: true
                })
                .attr('transform', $.format('translate({0},{1})', [
                    margin.left,
                    margin.top
                ]))
                .call(yaxis)
                .append('text')
                .attr('transform', 'rotate(-90)')
                .attr('x', -30)
                .attr('y', -50)
                .style('text-anchor', 'end')
                .text('Duration (s)');

            // Add the pointer
            var pointer = svg.append('g')
                .attr('transform', $.format('translate({0},{1})', [
                    margin.left,
                    margin.top
                ]))
                .append('polygon')
                .classed({
                    pointer: true
                })
                .attr('points', $.format('{0},{1} {2},{3} {4},{5} {6},{7}', [
                    x(DATE_MIN), y(DURATION_MIN),
                    x(DATE_MIN), y(DURATION_MAX),
                    x(DATE_MIN + POINTER_WIDTH), y(DURATION_MAX),
                    x(DATE_MIN + POINTER_WIDTH), y(DURATION_MIN)
                ]))
                .attr('transform', $.format('translate({0},{1})', [x(_currentTime), 0]))
                .call(d3.behavior.drag()
                    .on('dragstart', function () {
                        // Suppress drag events
                        d3.event.sourceEvent.stopPropagation();
                        d3.event.sourceEvent.preventDefault();

                        // Disable dot events
                        d3.selectAll('#chart circle.eclipse').classed({
                            disabled: true
                        });
                    })
                    .on('drag', function () {
                        // Get mouse location. Exit if mouse beyond chart bounds.
                        var mouse = d3.mouse(this.parentNode)[0];
                        if (mouse < 0 || mouse > width) { return; }

                        // Update current time
                        _currentTime = x.invert(mouse);

                        // Move time pointer
                        movePointer();

                        // Draw selected eclipses on globe
                        drawEclipses();
                    })
                    .on('dragend', function () {
                        // Restore event listening for all dots
                        d3.selectAll('#chart circle.eclipse').classed({
                            disabled: false
                        });
                    })
                );

            // Add data dots
            svg.append('g')
                .attr('transform', $.format('translate({0},{1})', [
                    margin.left,
                    margin.top
                ]))
                .selectAll('circle')
                .data(_paths)
                .enter()
                .append('circle')
                .classed({
                    eclipse: true
                })
                .attr('cx', function (d) {
                    var date = new Date(d.attributes.Date);
                    return x(date.getFullYear());
                })
                .attr('cy', function (d) {
                    return y(d.attributes.DurationSeconds);
                })
                .attr('r', 3)
                .on('mouseenter', function (d) {
                    // Highlight dot
                    d3.select(this).classed({ hover: true }).attr('r', 5);

                    // Add highlighted eclipse path
                    _view.map.getLayer('highlight').add(new Graphic({
                        attributes: d.attributes,
                        geometry: d.geometry
                    }));
                })
                .on('mouseleave', function (d) {
                    // Restore dot's color and size
                    d3.select(this).classed({ hover: false }).attr('r', 3);

                    // Remove highlighted eclipse path
                    _view.map.getLayer('highlight').clear();
                })
                .on('click', function (d) {
                    // Update current time
                    var date = new Date(d.attributes.Date);
                    _currentTime = date.getFullYear();

                    // Pan to selected graphic
                    _view.animateTo({
                        target: d,
                        heading: 0
                    });

                    // Move time pointer
                    movePointer()
                    
                    // Draw selected eclipses on globe
                    drawEclipses();
                });

            // Position the pointer and select graphics
            movePointer();

            // Draw selected eclipses on globe
            drawEclipses();

            function movePointer() {
                // Move red timeline into position
                pointer.attr('transform', $.format('translate({0},{1})', [
                    x(_currentTime),
                    0
                ]));
            }

            function drawEclipses() {
                // Highlight eclipses within the pointer
                d3.selectAll('#chart circle.eclipse').classed({
                    selected: function (d) {
                        var date = new Date(d.attributes.Date);
                        var year = date.getFullYear();
                        return year >= _currentTime && year <= _currentTime + POINTER_WIDTH;
                    }
                });

                //
                var graphics = [];
                d3.selectAll('#chart circle.eclipse.selected').each(function (d) {
                    graphics.push(new Graphic({
                        attributes: d.attributes,
                        geometry: d.geometry
                    }));
                });
                _view.map.getLayer('solar').clear();
                _view.map.getLayer('solar').add(graphics);
            }
        }
    });
});
