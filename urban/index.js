/* ------------------------------------------------------------
   Developed by the Applications Prototype Lab
   (c) 2015 Esri | http://www.esri.com/legal/software-license  
--------------------------------------------------------------- */

require([
    'esri/Map',
    'esri/Camera',
    'esri/Graphic',
    'esri/Color',
    'esri/geometry/Point',
    'esri/symbols/PointSymbol3D',
    'esri/symbols/ObjectSymbol3DLayer',
    'esri/layers/ArcGISTiledLayer',
    'esri/layers/GraphicsLayer',
    'esri/core/Scheduler',
    'esri/views/SceneView',
    'dojo/domReady!'
],
function (
    Map,
    Camera,
    Graphic,
    Color,
    Point,
    PointSymbol3D,
    ObjectSymbol3DLayer,
    ArcGISTiledLayer,
    GraphicsLayer,
    Scheduler,
    SceneView
    ) {
    $(document).ready(function () {
        // Enforce strict mode
        'use strict';

        // jQuery functions
        $.fn.scrollToView = function () {
            return $.each(this, function () {
                if ($(this).position().top < 0 ||
                    $(this).position().top + $(this).height() > $(this).parent().height()) {
                    $(this).parent().animate({
                        scrollTop: $(this).parent().scrollTop() + $(this).position().top
                    }, {
                        duration: 300,
                        queue: false
                    });
                }
            });
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
        $.fn.bringToFont = function (selector) {
            var max = Math.max.apply(null, $(this).siblings(selector).map(function () {
                return $(this).zIndex();
            }));
            $(this).zIndex(++max);
            return this;
        };
        $.format = function (f, e) {
            $.each(e, function (i) {
                f = f.replace(new RegExp('\\{' + i + '\\}', 'gm'), this);
            });
            return f;
        };
        d3.selection.prototype.moveToFront = function () {
            return this.each(function () {
                this.parentNode.appendChild(this);
            });
        };

        // Constants
        var PROXY = 'http://maps.esri.com/rc/urban/proxy.ashx';
        var WIKI = 'https://en.wikipedia.org/w/api.php';
        var BASEMAP = 'http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer';
        var DATE_MIN = 0;              // Chart's start date
        var DATE_MAX = 2000;           // Chart's end date
        var DATE_STA = 500;            // Chart's initial date
        var POP_MIN = 0;               // Chart's minimum population
        var POP_MAX = 10000000;        // Chart's maximum population
        var FILTER = 100;              // Number of spikes
        var SPIKE_HEIGHT_MIN = 10000;
        var SPIKE_HEIGHT_MAX = 3000000;
        var SPIKE_SHAPE = 'cube';
        var SPIKE_WIDTH = 200000;
        var SPIKE_COLOR = [0, 200, 0, 0.3];
        var SPIKE_HIGHLIGHT_COLOR = [0, 200, 0, 1];
        var INTERPOLATE_THRESHOLD = 50;

        // Variables
        var _currentTime = DATE_STA;
        var _isdragging = false;
        var _spikes = new GraphicsLayer();
        var _selected = null;
        var _cities = null;
        var _x = null;
        var _y = null;

        // Create map and view
        var _view = new SceneView({
            container: 'map',
            map: new Map({
                layers: [
                    new ArcGISTiledLayer({
                        url: BASEMAP
                    })
                ]
            }),
            center: [40, 22],
            padding: {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0
            },
            constraints: {
                altitude: {
                    max: 50000000
                },
                tilt: {
                    mode: 'manual',
                    max: 0
                }
            },
            ui: {
                components: []
            },
            environment: {
                lighting: {
                    date: null,
                    directShadows: false,
                    ambientOcclusion: false
                },
                atmosphere: {
                    enabled: 'none'
                },
                stars: 'none'
            }
        });
        _view.then(function () {
            // Disable idle frame refreshes
            _view._stage.setRenderParams({
                idleSuspend: false
            });

            // Add altitude constraint to prevent zoom in/out
            _view.constraints = {
                altitude: {
                    min: _view.camera.position.z,
                    max: _view.camera.position.z
                }
            };

            // Add city graphics layer
            _view.map.add(_spikes);

            // Load population data
            loadPopulation().done(function (cities) {
                //
                _cities = cities;

                // Load chart
                loadChart();

                // Show panels
                $('#loading').hide();
                $('#left-panel').show();
                $('#right-panel').show();
                $('#button-about').show();

                // Load graphics and panel
                loadGraphics();

                // Load histogram
                loadHistogram();

                // Update year heading
                updateYearDisplay();

                // Re-generate chart when the window resizes
                var width = $(window).width();
                var height = $(window).height();
                $(window).debounce('resize', function () {
                    // Exit if width is unchanged
                    var w = $(window).width();
                    var h = $(window).height();
                    if (width !== w) {
                        // Re-load chart
                        loadChart(cities);
                        width = w;
                    }
                    if (height !== h) {
                        // Re-load chart
                        loadHistogram();
                        height = h;
                    }
                }, 250);
            });
        });
        //_view.watch('camera', function (camera) {
        //    _view.set({
        //        camera: camera.clone().set({
        //            heading: 0,
        //        })
        //    });
        //});

        $('#map').mousemove(function (e) {
            // Exit if view not initialized
            if (!_view || !_view.ready) { return; }

            _view.hitTest(e.offsetX, e.offsetY).then(function (p) {
                // Nothing found. Clear selection. Exit.
                if (!p || !p.graphic) {
                    clearSelection();
                    clearChartSeries();
                    clearPanel();
                    clearWiki();
                    $('#histogram').show();
                    return;
                }

                // Feature already selected
                if (isSelected(p.graphic)) {
                    return;
                }

                // Clear selection, chart and panel
                clearSelection();
                clearChartSeries();
                clearPanel();
                clearWiki();
                $('#histogram').show();

                // Select graphic
                selectGraphic(p.graphic.attributes.city);

                // Load chart series
                loadChartSeries(p.graphic.attributes.city);

                // Highlight row in panel (and scroll to)
                selectPanel(p.graphic.attributes.city);

                // Show wikipedia text
                showWiki(p.graphic.attributes.city);

                //
                $('#histogram').hide();
            });
        });

        $('#button-about').click(function () {
            $('#about').fadeIn();
        });

        $('.dialog .close').click(function () {
            $(this).parents('.dialog').fadeOut();
        });

        $('a').attr('target', '_blank');

        function isSelected(graphic) {
            if (!_selected) { return false; }
            return _selected === graphic;
        }

        function selectPanel(city) {
            $('#container > div.item')
                .filter(function () {
                    return $(this).data('city').id === city.id;
                })
                .addClass('hover')
                .scrollToView();
        }

        function clearPanel() {
            $('#container > div.item').removeClass('hover');
        }

        function clearSelection() {
            if (_selected) {
                var normal = new Graphic({
                    geometry: _selected.geometry,
                    attributes: _selected.attributes,
                    symbol: new PointSymbol3D({
                        symbolLayers: [new ObjectSymbol3DLayer({
                            width: SPIKE_WIDTH,
                            height: _selected.symbol.symbolLayers[0].height,
                            resource: {
                                primitive: SPIKE_SHAPE
                            },
                            material: {
                                color: SPIKE_COLOR
                            }
                        })]
                    })
                });
                _spikes.remove(_selected);
                _spikes.add(normal);
                _selected = null;
            }
        }

        function selectGraphic(city) {
            var graphic = _spikes.graphics.find(function (e) {
                return e.attributes.city.id === city.id;
            });
            if (graphic === null) { return; }
            _selected = new Graphic({
                geometry: graphic.geometry,
                attributes: graphic.attributes,
                symbol: new PointSymbol3D({
                    symbolLayers: [new ObjectSymbol3DLayer({
                        width: SPIKE_WIDTH,
                        height: graphic.symbol.symbolLayers[0].height,
                        resource: {
                            primitive: SPIKE_SHAPE
                        },
                        material: {
                            color: SPIKE_HIGHLIGHT_COLOR
                        }
                    })]
                })
            });
            _spikes.remove(graphic);
            _spikes.add(_selected);
        }

        function loadPopulation() {
            var defer = new $.Deferred();
            var cities = [];
            $.get('data/population.txt', function (data) {
                var lines = data.replace(new RegExp('\r', 'gm'), '').split('\n');
                $.each(lines, function () {
                    //  0 - ID
                    //  1 - NAME
                    //  2 - COUNTRY
                    //  3 - POPULATION,
                    //  4 - 100AD
                    //  5 - 500AD
                    //  6 - 800AD
                    //  7 - 1000AD
                    //  8 - 1100AD
                    //  9 - 1200AD
                    // 10 - 1300AD
                    // 11 - 1400AD
                    // 12 - 1500AD
                    // 13 - 1600AD
                    // 14 - 1700AD
                    // 15 - 1800AD
                    // 16 - 1850AD
                    // 17 - 1900AD
                    // 18 - 1950AD
                    // 19 - 2000AD
                    // 20 - X
                    // 21 - Y
                    // 22 - WIKI

                    // Skip if invalid line
                    if (this === '') { return true; }
                    var pieces = this.split('|');

                    //
                    cities.push({
                        id: Number(pieces[0]),
                        name: pieces[1].trim(),
                        country: pieces[2].trim(),
                        lon: Number(pieces[20]),
                        lat: Number(pieces[21]),
                        wiki: pieces.length === 23 ? pieces[22].trim() : null,
                        data: [
                            { year:  100, population: Number(pieces[4]) },
                            { year:  500, population: Number(pieces[5]) },
                            { year:  800, population: Number(pieces[6]) },
                            { year: 1000, population: Number(pieces[7]) },
                            { year: 1100, population: Number(pieces[8]) },
                            { year: 1200, population: Number(pieces[9]) },
                            { year: 1300, population: Number(pieces[10]) },
                            { year: 1400, population: Number(pieces[11]) },
                            { year: 1500, population: Number(pieces[12]) },
                            { year: 1600, population: Number(pieces[13]) },
                            { year: 1700, population: Number(pieces[14]) },
                            { year: 1800, population: Number(pieces[15]) },
                            { year: 1850, population: Number(pieces[16]) },
                            { year: 1900, population: Number(pieces[17]) },
                            { year: 1950, population: Number(pieces[18]) },
                            { year: 2000, population: Number(pieces[19]) }
                        ],
                        getPopulation: function (year) {
                            // Fix: Year are occassionally being parsed as strings.
                            year = Number(year);

                            // Too small
                            if (year < this.data[0].year) { return 0; }

                            // Too large
                            if (year > this.data[this.data.length - 1].year) { return 0; }

                            // Find population for year or next highest year
                            var population = null;
                            var index = null;
                            $.each(this.data, function (i) {
                                if (this.year === year) {
                                    population = this.population;
                                    return false;
                                }
                                if (this.year > year) {
                                    index = i;
                                    return false;
                                }
                            });

                            // Return population for recorded year
                            if (population || population === 0) {
                                return population;
                            }

                            // Get data for previous and next year
                            var l = this.data[index - 1];
                            var r = this.data[index];

                            // Populations identical. No need for interopolation
                            if (l.population === r.population) {
                                return l.population;
                            }

                            if (l.population === 0 && r.population > 0) {
                                if (r.year - year > INTERPOLATE_THRESHOLD) {
                                    return 0;
                                }
                            }
                            if (l.population > 0 && r.population === 0) {
                                if (year - l.year > INTERPOLATE_THRESHOLD) {
                                    return 0;
                                }
                            }

                            //
                            return l.population + ((year - l.year) / (r.year - l.year)) * (r.population - l.population);
                        }
                    });
                });
                defer.resolve(cities);
            });
            return defer.promise();
        }

        function loadChart() {
            // Clear chart
            d3.select('#chart svg').remove();

            var margin = {
                left: 30,
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

            _x = d3.scale.linear()
                .domain([DATE_MIN, DATE_MAX])
                .range([0, width - margin.left - margin.right]);

            _y = d3.scale.pow()
                .exponent(0.2)
                .domain([POP_MIN, POP_MAX])
                .range([height - margin.top - margin.bottom, 0]);

            var xaxis = d3.svg.axis()
                .scale(_x)
                .orient('bottom')
                .tickFormat(d3.format('g'));

            // Draw xaxis + ticks
            svg.append('g')
                .attr('transform', $.format('translate({0},{1})', [margin.left, height - margin.bottom]))
                .on('click', function(){
                    // Get mouse location. Exit if mouse beyond chart bounds.
                    var mouse = d3.mouse(this)[0];
                    if (mouse < 0 || mouse > width - margin.left - margin.right) { return; }

                    // Update current time
                    _currentTime = _x.invert(mouse).toFixed();

                    // Move time marker to correct location
                    d3.select('g.time-marker').attr('transform', $.format('translate({0},{1})', [
                        _x(_currentTime),
                        0
                    ]));

                    // Select cities
                    loadGraphics();

                    loadHistogram();

                    // Update year heading
                    updateYearDisplay();
                })
                .call(xaxis);

            // Group that will contain series path and circles
            svg.append('g')
                .classed({
                    series: true
                })
                .attr('transform', $.format('translate({0},{1})', [margin.left, margin.top]));

            // Pointer position and drag behavior
            var pointer = svg.append('g')
                .attr('transform', $.format('translate({0},{1})', [margin.left, height - margin.bottom]))
                .append('g')
                    .classed({ 'time-marker': true })
                    .attr('transform', $.format('translate({0},{1})', [_x(_currentTime), 0]))
                    .call(d3.behavior.drag()
                        .on('dragstart', function () {
                            // Suppress drag events
                            d3.event.sourceEvent.stopPropagation();
                            d3.event.sourceEvent.preventDefault();

                            // Set dragging flag
                            _isdragging = true;
                        })
                        .on('drag', function () {
                            // Get mouse location. Exit if mouse beyond chart bounds.
                            var mouse = d3.mouse(this.parentNode)[0];
                            if (mouse < 0){
                                mouse = 0;
                            } else if (mouse > width - margin.left - margin.right) {
                                mouse = width - margin.left - margin.right;
                            }

                            // Update current time
                            var _time = _x.invert(mouse).toFixed();
                            if (_currentTime === _time) {
                                return;
                            }
                            _currentTime = _time;

                            // Move time marker
                            d3.select(this).attr('transform', $.format('translate({0},{1})', [
                                _x(_currentTime),
                                0
                            ]));

                            // Update graphics and right hand panel
                            loadGraphics();

                            // Update histogram
                            loadHistogram();

                            // Update year heading
                            updateYearDisplay();
                        })
                        .on('dragend', function () {
                            // Update dragging flag
                            _isdragging = false;
                        })
                    );

            // Draw pointer
            pointer.append('polygon').attr('points', $.format('{0},{1} {2},{3} {4},{5}', [
                -10, -15,
                0, 0,
                10, -15
            ]));
        }

        function loadChartSeries(city) {
            // Trim zero population entries from start and end
            var data = city.data.slice(0);
            while (true) {
                if (data[0].population !== 0) {
                    break;
                }
                data.shift();
            }
            while (true) {
                if (data[data.length - 1].population !== 0) {
                    break;
                }
                data.pop();
            }

            // Line definition
            var line = d3.svg.line()
               .x(function (d) {
                   return _x(d.year);
               })
               .y(function (d) {
                   return _y(d.population * 1000);
               });

            // Container for population lines
            var g = d3.select('#chart g.series').append('g')
                .attr({
                    opacity: 0
                });

            // Gradually fade-in population lines
            g.transition()
                .duration(1000)
                .ease('circle-out')
                .attr({
                    opacity: 1
                });

            // Draw population levels
            $.each([10000, 100000, 1000000], function () {
                g.append('line')
                    .attr({
                        x1: _x(DATE_MIN),
                        y1: _y(this),
                        x2: _x(DATE_MAX),
                        y2: _y(this)
                    });
                g.append('text')
                    .attr({
                        x: _x(DATE_MIN),
                        y: _y(this) - 5
                    })
                    .text(d3.format(',g')(this));
            });

            // Draw line
            g.selectAll('path')
                .data([data])
                .enter()
                .append('path')
                    .attr({
                        d: function (d) {
                            return line(d);
                        }
                    });

            // Draw points
            g.selectAll('circle')
                .data(data)
                .enter()
                .append('circle')
                    .attr({
                        cx: function (d) {
                            return _x(d.year);
                        },
                        cy: function (d) {
                            return _y(d.population * 1000);
                        },
                        r: 5
                    });
        }

        function clearChartSeries() {
            d3.select('#chart g.series g').remove();
        }

        function loadGraphics() {
            // Select highest cities
            var selection = _cities.map(function (e) {
                return {
                    city: e,
                    population: e.getPopulation(_currentTime)
                };
            }).filter(function (e) {
                return e.population !== 0;
            }).sort(function (a, b) {
                return b.population - a.population;
            }).slice(0, FILTER - 1);

            // Add graphic
            _spikes.clear();
            _spikes.add(
                selection.map(function (e, i) {
                    return new Graphic({
                        geometry: new Point({
                            x: e.city.lon,
                            y: e.city.lat
                        }),
                        attributes: {
                            city: e.city,
                            population: e.population
                        },
                        symbol: new PointSymbol3D({
                            symbolLayers: [new ObjectSymbol3DLayer({
                                width: SPIKE_WIDTH,
                                height: SPIKE_HEIGHT_MIN + (SPIKE_HEIGHT_MAX - SPIKE_HEIGHT_MIN) * (FILTER - i) / FILTER,
                                resource: {
                                    primitive: SPIKE_SHAPE
                                },
                                material: {
                                    color: SPIKE_COLOR
                                }
                            })]
                        })
                    });
                })
            );

            // Add panel entries
            $('#container').empty();
            $.each(selection, function (i) {
                $('#container').append(
                    $(document.createElement('div')).addClass('item').append(
                        $(document.createElement('div')).addClass('item-order').html(i + 1),
                        $(document.createElement('div')).addClass('item-city').html(this.city.name),
                        $(document.createElement('div')).addClass('item-country').html(this.city.country),
                        $(document.createElement('div')).addClass('item-pop').html(d3.format(',.2r')(this.population * 1000))
                    )
                    .mouseenter(function () {
                        var city = $(this).data().city;
                        clearSelection();
                        selectGraphic(city);
                        loadChartSeries(city);
                        showWiki(city);
                        $(this).addClass('hover');
                        $('#histogram').hide();
                    })
                    .mouseleave(function () {
                        clearSelection();
                        clearChartSeries();
                        clearWiki();
                        $(this).removeClass('hover');
                        $('#histogram').show();
                    })
                    .data({
                        city: this.city
                    })
                    .click(function () {
                        var city = $(this).data().city;
                        _view.animateTo({
                            target: [city.lon, city.lat],
                            heading: 0
                        });
                    })
                );
            });
        }

        function loadHistogram() {
            // Remove existing chart
            d3.select('#histogram svg').remove();

            // Create histogram dataset
            var data = [
                { label:  '50K', population:    50000, frequency: 0 },
                { label: '100K', population:   100000, frequency: 0 },
                { label: '200K', population:   200000, frequency: 0 },
                { label: '300K', population:   300000, frequency: 0 },
                { label: '400K', population:   400000, frequency: 0 },
                { label: '500K', population:   500000, frequency: 0 },
                { label: '750K', population:   750000, frequency: 0 },
                { label:   '1M', population:  1000000, frequency: 0 },
                { label:  '1¼M', population:  1250000, frequency: 0 },
                { label:  '1½M', population:  1500000, frequency: 0 },
                { label:  '1¾M', population:  1750000, frequency: 0 },
                { label:   '2M', population:  2000000, frequency: 0 },
                { label:   '5M', population:  5000000, frequency: 0 },
                { label:  '10M', population: 10000000, frequency: 0 },
                { label:  '20M', population: 20000000, frequency: 0 },
                { label: '+20M', population: 30000000, frequency: 0 }
            ];
            $.each(_spikes.graphics.getAll(), function () {
                var that = this;
                $.each(data, function () {
                    if (that.attributes.population <= this.population / 1000) {
                        this.frequency++;
                        return false;
                    }
                });
            });

            var margin = {
                left: 60,
                top: 20,
                right: 20,
                bottom: 40
            };

            var width = $('#histogram').width();
            var height = $('#histogram').height();

            var svg = d3.select('#histogram')
                .append('svg')
                .attr('width', width)
                .attr('height', height);

            var x = d3.scale.linear()
                .domain([50, 0])
                .range([width - margin.left - margin.right, 0]);

            var y = d3.scale.ordinal()
                .domain(data.map(function (e) {
                    return e.label;
                }))
                .rangeRoundBands([0, height - margin.top - margin.bottom], 0.1);

            var xaxis = d3.svg.axis()
                .scale(x)
                .orient('top')
                .tickValues([0, 50]);

            var yaxis = d3.svg.axis()
                .scale(y)
                .orient('left');

            svg.append('g')
                .attr('transform', $.format('translate({0},{1})', [margin.left, margin.top]))
                .call(xaxis);

            svg.append("g")
                .attr('transform', $.format('translate({0},{1})', [margin.left - 3, margin.top]))
                .call(yaxis);

            svg.append('g')
                .attr('transform', $.format('translate({0},{1})', [margin.left, margin.top]))
                .selectAll()
                .data(data)
                .enter()
                .append('rect')
                    .attr('x', function () {
                        return x(0);
                    })
                    .attr('y', function (d) {
                        return y(d.label);
                    })
                    .attr('width', function (d) {
                        return x(d.frequency);
                    })
                    .attr('height', function () {
                        return y.rangeBand();
                    })
                    .attr('fill', 'rgba(0, 200, 200, 0.5)');
        }

        function showWiki(city) {
            $('#city').html(city.name);
            $('#country').html(city.country);
            $('#wiki-text').empty();

            if (!city.wiki) { return; }

            var url = PROXY + '?' + WIKI;
            url += $.format('?action={0}', ['query']);
            url += $.format('&prop={0}', ['extracts']);
            url += $.format('&exintro={0}', ['']);
            url += $.format('&titles={0}', [encodeURI(city.wiki)]);
            url += $.format('&format={0}', ['json']);

            $.getJSON(url, function (data) {
                if ($('#histogram').css('display') !== 'none') { return; }

                var pages = data.query.pages;
                var page = pages[Object.keys(pages)[0]];
                var extract = page.extract;
                $('#wiki-text').html(extract);
            });
        }

        function clearWiki() {
            $('#city').empty();
            $('#country').empty();
            $('#wiki-text').empty();
        }

        function updateYearDisplay() {
            $('#year').html($.format('{0}AD', [d3.format('f')(_currentTime)]));
        }
    });
});