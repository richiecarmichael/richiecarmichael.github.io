/* -----------------------------------------------------------------------------------
   Geojigsaw - The Developer Edition
   Develolped by the Applications Prototype Lab
   (c) 2015 Esri | http://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

require([
    'esri/map',
    'esri/layers/ArcGISDynamicMapServiceLayer',
    'esri/layers/FeatureLayer',
    'esri/layers/ImageParameters',
    'esri/geometry/Extent',
    'esri/geometry/Point',
    'esri/geometry/ScreenPoint',
    'esri/geometry/Polygon',
    'esri/renderers/SimpleRenderer',
    'esri/symbols/SimpleFillSymbol',
    'esri/tasks/query',
    'esri/tasks/StatisticDefinition',
    'esri/graphic',
    'esri/Color',
    'esri/urlUtils',
    'dojo/parser',
    'dojo/domReady!'
],
function (
    Map,
    ArcGISDynamicMapServiceLayer,
    FeatureLayer,
    ImageParameters,
    Extent,
    Point,
    ScreenPoint,
    Polygon,
    SimpleRenderer,
    SimpleFillSymbol,
    Query,
    StatisticDefinition,
    Graphic,
    Color,
    urlUtils,
    parser
    ) {
    $(document).ready(function () {
        // Enforce strict mode
        'use strict';

        parser.parse();

        // Puzzle constants
        var MARGIN = 40;     // Puzzle margins from top/side
        var _puzzle = null;

        // Create map
        var _map = new Map('map', {
            basemap: 'satellite',
            logo: false,
            showAttribution: false,
            slider: true,
            extent: new Extent({
                xmin: -15380353,
                ymin: -4473184,
                xmax: 6437832,
                ymax: 11963833,
                spatialReference: {
                    wkid: 102100
                }
            }),
            wrapAround180: true
        });
        _map.on('zoom', function (e) {
            zoomPuzzle(e.extent);
        });
        _map.on('pan', function (e) {
            zoomPuzzle(e.extent);
        });

        $('#button-start').attr('disabled', 'disabled');
        $('#button-quit').attr('disabled', 'disabled');
        $('#button-create').click(function () {
            deletePuzzle();
            createPuzzle().done(function (p) {
                _puzzle = p;
            });
            $('#button-start').removeAttr('disabled');
        });
        $('#button-start').click(function () {
            scramblePuzzle();
            $('#button-create').attr('disabled', 'disabled');
            $('#button-start').attr('disabled', 'disabled');
            $('#button-quit').removeAttr('disabled');
        });
        $('#button-quit').click(function () {
            solvePuzzle();
            endPuzzle();
            $('#button-create').removeAttr('disabled');
            $('#button-start').removeAttr('disabled');
            $('#button-quit').attr('disabled', 'disabled');
        });

        $('#slider-randomness').slider({
            range: false,
            tooltip: 'hide',
            value: 0.5,
            step: 0.1,
            ticks: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
            ticks_labels: ['30%', '40%', '50%', '60%', '70%', '80%'],
            ticks_snap_bounds: 10
        });
        $('#slider-tooth-threshold').slider({
            range: false,
            tooltip: 'hide',
            value: 0.5,
            step: 0.1,
            ticks: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
            ticks_labels: ['30%', '40%', '50%', '60%', '70%', '80%'],
            ticks_snap_bounds: 10
        });
        $('#slider-tooth-size').slider({
            range: false,
            tooltip: 'hide',
            value: 0.2,
            step: 0.05,
            ticks: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3],
            ticks_labels: ['5%', '10%', '15%', '20%', '25%', '30%'],
            ticks_snap_bounds: 10
        });
        $('#slider-puzzle-size').slider({
            range: false,
            tooltip: 'hide',
            value: 10,
            step: 1,
            ticks: [5, 10, 15, 20, 25],
            ticks_labels: ['5', '10', '15', '20', '25'],
            ticks_snap_bounds: 1
        });
        $('#slider-snap-tolerance').slider({
            range: false,
            tooltip: 'hide',
            value: 100,
            step: 1,
            ticks: [25, 50, 75, 100, 125, 150],
            ticks_labels: ['25px', '50px', '75px', '100px', '125px', '150px'],
            ticks_snap_bounds: 1
        });
        $('#checkbox-show-shading').click(function () {
            if (_puzzle === null) { return; }
            var checked = $(this).prop('checked');
            d3.selectAll('.rc-puzzle-piece').each(function () {
                d3.select(this)
                    .attr('filter', function () {
                        return checked ? 'url(#innerbevel)' : 'none';
                    });
            });
        });
        $('#checkbox-show-outline').click(function () {
            if (_puzzle === null) { return; }
            var checked = $(this).prop('checked');
            d3.selectAll('.rc-puzzle-piece').each(function () {
                d3.select(this)
                    .attr('stroke', function () {
                        return checked ? 'white' : 'none';
                    })
                    .attr('stroke-width', function () {
                        return checked ? '1' : '0';
                    });
            });
        });
        $(window).resize($.throttle(50, false, function (e) {
            resizeSvgWindow();
        }));
        resizeSvgWindow();

        function resizeSvgWindow() {
            d3.select('#puzzle')
                .select('svg')
                .attr('width', $('#map').width())
                .attr('height', $('#map').height());
        }

        // Create puzzle
        function createPuzzle() {
            var defer = new $.Deferred();

            var dimension = $('#slider-puzzle-size').slider('getValue');
            var randomness = $('#slider-randomness').slider('getValue');
            var tooth_threshod = $('#slider-tooth-threshold').slider('getValue');
            var tooth_size = $('#slider-tooth-size').slider('getValue');
            var basemap = _map.getBasemap();
            var level = _map.getLevel();

            // Get extent of puzzel in screen coordinates
            var side = Math.min(_map.width, _map.height) - (2 * MARGIN);
            var xmin = _map.width / 2 - side / 2;
            var ymin = _map.height / 2 - side / 2;
            var xmax = _map.width / 2 + side / 2;
            var ymax = _map.height / 2 + side / 2;

            // Download map image for puzzle
            var ids = _map.basemapLayerIds;
            var bml = _map.getLayer(ids[0]);
            var ll = _map.toMap(new ScreenPoint(xmin, ymax));
            var ur = _map.toMap(new ScreenPoint(xmax, ymin));
            var ext = new Extent(
                ll.x,
                ll.y,
                ur.x,
                ur.y,
                _map.spatialReference
            );

            var imp = new ImageParameters();
            imp.bbox = ext;
            imp.width = xmax - xmin;
            imp.height = ymax - ymin;
            imp.format = 'jpg';
            imp.imageSpatialReference = _map.spatialReference;

            var lay = new ArcGISDynamicMapServiceLayer(
                bml.url, {
                    useMapImage: true
                }
            );
            lay.exportMapImage(imp, function (e) {
                // Add paper background
                d3.select('#puzzle')
                    .select('svg')
                    .select('defs')
                    .append('pattern')
                        .attr('id', 'paper')
                        .attr('width', e.width)
                        .attr('height', e.height)
                        .attr('patternTransform', 'translate({0},{1})'.format(xmin, ymin))
                        .attr('patternUnits', 'userSpaceOnUse')
                        .append('image')
                        .attr('width', e.width)
                        .attr('height', e.height)
                        .attr('preserveAspectRatio', 'none')
                        .attr('xlink:href', 'img/paper.jpg');

                d3.select('#puzzle')
                    .select('svg')
                    .select('g')
                    .append('rect')
                    .attr('class', 'rc-puzzle-void')
                    .attr('x', xmin)
                    .attr('y', ymin)
                    .attr('width', xmax - xmin)
                    .attr('height', ymax - ymin)
                    .attr('pointer-events', 'none')
                    .attr('filter', 'url(#innershadow)')
                    .attr('fill', 'url(#paper)');

                // Create voroni vertices from random points
                var v = [];
                for (var i = 0; i < dimension; i++) {
                    for (var j = 0; j < dimension; j++) {
                        v.push([
                            (i + 0.5) * (side / dimension) + xmin + (Math.random() - 0.5) * (side / dimension) * randomness,
                            (j + 0.5) * (side / dimension) + ymin + (Math.random() - 0.5) * (side / dimension) * randomness
                        ]);
                    }
                }
                var vs = d3.geom.voronoi().clipExtent([
                    [xmin, ymin],
                    [xmax, ymax]
                ])(v);

                // Add individual textures
                d3.select('#puzzle')
                    .select('svg')
                    .select('defs')
                    .append('pattern')
                        .attr('id', 'basemap')
                        .attr('width', e.width)
                        .attr('height', e.height)
                        .attr('patternTransform', 'translate({0},{1})'.format(
                            xmin,
                            ymin
                        ))
                        .attr('patternUnits', 'userSpaceOnUse')
                        .append('image')
                        .attr('width', e.width)
                        .attr('height', e.height)
                        .attr('preserveAspectRatio', 'none')
                        .attr('xlink:href', e.href);

                // Create paths
                var done = [];
                $.each(vs, function (i) {
                    // Add paths
                    d3.select('#puzzle')
                        .select('svg')
                        .select('g')
                        .append('path')
                        .data([i])
                        .attr('class', 'rc-puzzle-piece')
                        .attr('an', '0')
                        .attr('dx', '0')
                        .attr('dy', '0')
                        .attr('pointer-events', 'none')
                        .attr('fill', 'url(#basemap)'.format(i))
                        .attr('filter', function () {
                            return $('#checkbox-show-shading').prop('checked') ? 'url(#innerbevel)' : 'none';
                        })
                        .attr('stroke', function () {
                            return $('#checkbox-show-outline').prop('checked') ? 'white' : 'none';
                        })
                        .attr('stroke-width', function () {
                            return $('#checkbox-show-outline').prop('checked') ? '1' : '0';
                        })
                        .attr('d', function (lines) {
                            var threshold = tooth_threshod * side / dimension;
                            var size = tooth_size * side / dimension;
                            var s = 'M';
                            $.each(lines, function (i, v) {
                                if (i !== 0) {
                                    s += ' L ';
                                }
                                var x1 = i === 0 ? lines[lines.length - 1][0] : lines[i - 1][0];
                                var y1 = i === 0 ? lines[lines.length - 1][1] : lines[i - 1][1];
                                var x2 = lines[i][0];
                                var y2 = lines[i][1];
                                if (!(x1.toFixed() === xmin.toFixed() && x2.toFixed() === xmin.toFixed()) &&
                                    !(y1.toFixed() === ymin.toFixed() && y2.toFixed() === ymin.toFixed()) &&
                                    !(x1.toFixed() === xmax.toFixed() && x2.toFixed() === xmax.toFixed()) &&
                                    !(y1.toFixed() === ymax.toFixed() && y2.toFixed() === ymax.toFixed())) {
                                    // Not on border
                                    var v1 = Vector.create([x1, y1]);
                                    var v2 = Vector.create([x2, y2]);
                                    var l = v2.subtract(v1);
                                    var modulus = l.modulus();
                                    if (modulus > threshold) {
                                        var completed = false;
                                        $.each(done, function () {
                                            if (x1 === this.x2 &&
                                                y1 === this.y2 &&
                                                x2 === this.x1 &&
                                                y2 === this.y1) {
                                                completed = true;
                                                return false;
                                            }
                                        });

                                        var unit = l.toUnitVector();
                                        var q = modulus / 2 - size / 2;
                                        var r = completed ? -1 : 1;
                                        var a = v1.add(unit.multiply(q));
                                        var b = a.add(unit.multiply(size).rotate(-r * Math.PI / 2, Vector.create([0, 0])));
                                        var c = b.add(unit.multiply(size));
                                        var d = c.add(unit.multiply(size).rotate(r * Math.PI / 2, Vector.create([0, 0])));

                                        s += '{0} {1} C {2} {3} {4} {5} {6} {7} L '.format(
                                            a.e(1).toFixed(0).toString(),
                                            a.e(2).toFixed(0).toString(),
                                            b.e(1).toFixed(0).toString(),
                                            b.e(2).toFixed(0).toString(),
                                            c.e(1).toFixed(0).toString(),
                                            c.e(2).toFixed(0).toString(),
                                            d.e(1).toFixed(0).toString(),
                                            d.e(2).toFixed(0).toString()
                                        );

                                        if (!completed) {
                                            done.push({
                                                x1: x1,
                                                y1: y1,
                                                x2: x2,
                                                y2: y2
                                            });
                                        }
                                    }
                                }

                                s += '{0} {1}'.format(
                                    v[0].toFixed(0).toString(),
                                    v[1].toFixed(0).toString()
                                );
                            });
                            s += 'Z';
                            return s;
                        }(this))
                        .on('mouseenter', function (d) {
                            d3.selectAll('.rc-puzzle-piece').sort(function (a, b) {
                                if (a === d) {
                                    return 1;
                                } else {
                                    if (b === d) {
                                        return -1;
                                    } else {
                                        return 0;
                                    }
                                }
                            });
                            d3.select(this).attr('filter', function () {
                                return $('#checkbox-show-shading').prop('checked') ? 'url(#innerbevel_dropshadow)' : 'url(#dropshadow)';
                            });
                        })
                        .on('mouseout', function () {
                            d3.select(this).attr('filter', function () {
                                return $('#checkbox-show-shading').prop('checked') ? 'url(#innerbevel)' : 'none';
                            });
                        })
                        .on('touchstart', function () {
                            d3.event.sourceEvent.stopPropagation();
                        })
                        .on('touchmove', function () {
                            d3.event.sourceEvent.stopPropagation();
                        })
                        .on('touchend', function () {
                            d3.event.sourceEvent.stopPropagation();
                        })
                        .call(d3.behavior.drag()
                            .on('dragstart', function () {
                                _puzzle.moves++;
                                d3.event.sourceEvent.stopPropagation();
                                d3.event.sourceEvent.preventDefault();
                            })
                            .on('drag', function (d) {
                                var dx = Number(d3.select(this).attr('dx'));
                                var dy = Number(d3.select(this).attr('dy'));
                                var an = Number(d3.select(this).attr('an'));
                                var cx = Number(d3.select(this).attr('cx'));
                                var cy = Number(d3.select(this).attr('cy'));
                                var dx_ = dx + d3.event.dx;
                                var dy_ = dy + d3.event.dy;
                                var an_ = an;
                                var dxy = Math.sqrt(dx_ * dx_ + dy_ * dy_);
                                var s1 = (_puzzle.mapExtent.xmax - _puzzle.mapExtent.xmin) / (_puzzle.screenOrigin.xmax - _puzzle.screenOrigin.xmin);
                                var s2 = (_map.extent.xmax - _map.extent.xmin) / _map.width;
                                var scale = s1 / s2;
                                var snap_tolerance = $('#slider-snap-tolerance').slider('getValue');
                                if (dxy < snap_tolerance * scale) {
                                    dx_ = 0;
                                    dy_ = 0;
                                    an_ = 0;

                                    if (d3.select(this).classed('rc-solved')) {
                                        return;
                                    }

                                    d3.selectAll('.rc-puzzle-piece').sort(function (a, b) {
                                        if (a === d) {
                                            return -1;
                                        } else {
                                            if (b === d) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        }
                                    });

                                    d3.select(this)
                                        .classed('rc-solved', true)
                                        .attr('pointer-events', 'none')
                                        .attr('opacity', 0.8)
                                        .attr('filter', function () {
                                            return $('#checkbox-show-shading').prop('checked') ? 'url(#innerbevel)' : 'none';
                                        })
                                        .transition()
                                        .duration(300)
                                        .ease('exp-out')
                                        .attr('dx', dx_)
                                        .attr('dy', dy_)
                                        .attr('an', an_)
                                        .attrTween('transform', function () {
                                            return function (t) {
                                                return 'translate({0},{1}) rotate({2},{3},{4})'.format(
                                                    t * (dx_ - dx) + dx,
                                                    t * (dy_ - dy) + dy,
                                                    t * (an_ - an) + an,
                                                    cx,
                                                    cy
                                                );
                                            };
                                        });
                                    

                                    // Puzzle complete?
                                    var pieces = d3.selectAll('.rc-puzzle-piece').size();
                                    var solved = d3.selectAll('.rc-solved').size();
                                    if (pieces === solved) {
                                        endPuzzle();
                                    }
                                } else {
                                    d3.select(this)
                                        .attr('dx', dx_)
                                        .attr('dy', dy_)
                                        .attr('transform', 'translate({0},{1}) rotate({2},{3},{4})'.format(
                                            dx_,
                                            dy_,
                                            an_,
                                            cx,
                                            cy
                                        )
                                    );
                                }
                            })
                            .on('dragend', function () { })
                        );
                });

                d3.selectAll('.rc-puzzle-piece').each(function () {
                    var box = d3.select(this).node().getBBox();
                    var cx = box.x + box.width / 2;
                    var cy = box.y + box.height / 2;
                    d3.select(this)
                        .attr('cx', cx)
                        .attr('cy', cy);
                });

                defer.resolve({
                    dimension: dimension, // Dimensions
                    screenOrigin: {       // Origin of puzzle in screen coordinates
                        xmin: xmin,
                        ymin: ymin,
                        xmax: xmax,
                        ymax: ymax
                    },
                    mapExtent: ext,       // Extent of the puzzle in map coordinates
                    moves: 0              // Number of moves
                });
                done = null;
            });
            return defer.promise();
        }

        // Randomize puzzle piece location
        function scramblePuzzle() {
            d3.selectAll('.rc-puzzle-piece').each(function () {
                var dx = Number(d3.select(this).attr('dx'));
                var dy = Number(d3.select(this).attr('dy'));
                var an = Number(d3.select(this).attr('an'));
                var cx = Number(d3.select(this).attr('cx'));
                var cy = Number(d3.select(this).attr('cy'));
                var dx_ = Math.random() * _map.width - cx - dx;
                var dy_ = Math.random() * _map.height - cy - dy;
                var an_ = $('#checkbox-rotate').prop('checked') ? Math.random() * 180 - 90 : 0;

                d3.select(this)
                    .attr('pointer-events', 'all')
                    .transition()
                    .delay(function () {
                        return Math.random() * 500 + 100;
                    })
                    .duration(1000)
                    .ease('exp-out')
                    .attr('dx', dx_)
                    .attr('dy', dy_)
                    .attr('an', an_)
                    .attrTween('transform', function () {
                        return function (t) {
                            return 'translate({0},{1}) rotate({2},{3},{4})'.format(
                                t * (dx_ - dx) + dx,
                                t * (dy_ - dy) + dy,
                                t * (an_ - an) + an,
                                cx,
                                cy
                            );
                        };
                    });
            });
        }

        // Magically solve the entire puzzle
        function solvePuzzle() {
            d3.selectAll('.rc-puzzle-piece').each(function () {
                var dx = Number(d3.select(this).attr('dx'));
                var dy = Number(d3.select(this).attr('dy'));
                var an = Number(d3.select(this).attr('an'));
                var cx = Number(d3.select(this).attr('cx'));
                var cy = Number(d3.select(this).attr('cy'));
                var dx_ = 0;
                var dy_ = 0;
                var an_ = 0;
                d3.select(this)
                    .attr('pointer-events', 'none')
                    .attr('opacity', 1)
                    .transition()
                    .delay(function () {
                        return Math.random() * 500 + 100;
                    })
                    .duration(1000)
                    .ease('exp-in')
                    .attr('dx', dx_)
                    .attr('dy', dy_)
                    .attr('an', an_)
                    .attrTween('transform', function () {
                        return function (t) {
                            return 'translate({0},{1}) rotate({2},{3},{4})'.format(
                                t * (dx_ - dx) + dx,
                                t * (dy_ - dy) + dy,
                                t * (an_ - an) + an,
                                cx,
                                cy
                            );
                        };
                    });
            });
        }

        // Handle puzzle transformation when map navigated
        function zoomPuzzle(extent) {
            if (_puzzle === null) {
                return;
            }
            var s1 = (_puzzle.mapExtent.xmax - _puzzle.mapExtent.xmin) / (_puzzle.screenOrigin.xmax - _puzzle.screenOrigin.xmin);
            var s2 = (extent.xmax - extent.xmin) / _map.width;
            var scale = s1 / s2;
            var xoff = _map.width * (_puzzle.mapExtent.xmin - extent.xmin) / (extent.xmax - extent.xmin) - (_puzzle.screenOrigin.xmin * scale);
            var yoff = _map.height * (extent.ymax - _puzzle.mapExtent.ymax) / (extent.ymax - extent.ymin) - (_puzzle.screenOrigin.ymin * scale);
            d3.select('#puzzle')
                .select('svg')
                .select('g')
                .attr('transform', 'translate({0},{1}) scale({2},{3})'.format(
                    xoff.toFixed(0),
                    yoff.toFixed(0),
                    scale,
                    scale
                )
            );
        }

        // Stop/Quit puzzle
        function endPuzzle() {
            // Restore opacity
            d3.selectAll('.rc-puzzle-piece').attr('opacity', '1');
            
            // Update buttons
            $('#button-create').removeAttr('disabled');
            $('#button-start').removeAttr('disabled');
            $('#button-quit').attr('disabled', 'disabled');
        }

        // Remove SVG puzzle
        function deletePuzzle() {
            d3.select('#puzzle').select('g').selectAll('path').remove();
            d3.select('#puzzle').select('g').selectAll('rect').remove();
            d3.select('#puzzle').select('g').attr('transform', null);
            d3.select('#puzzle').select('defs').selectAll('pattern').remove();
            _puzzle = null;
        }

        // String substitution function
        String.prototype.format = function () {
            var s = this;
            var i = arguments.length;
            while (i--) {
                s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
            }
            return s;
        };
    });
});