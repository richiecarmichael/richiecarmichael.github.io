/* ------------------------------------------------------------
   Developed by the Applications Prototype Lab
   (c) 2016 Esri | https://www.esri.com/legal/software-license  
--------------------------------------------------------------- */

require([
    'esri/map',
    'esri/Color',
    'esri/SpatialReference',
    'esri/layers/FeatureLayer',
    'esri/layers/ArcGISImageServiceLayer',
    'esri/layers/TimeInfo',
    'esri/layers/MosaicRule',
    'esri/layers/RasterFunction',
    'esri/layers/ImageServiceParameters',
    'esri/tasks/ImageServiceIdentifyTask',
    'esri/tasks/ImageServiceIdentifyParameters',
    'esri/tasks/QueryTask',
    'esri/tasks/query',
    'esri/tasks/Geoprocessor',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/renderers/SimpleRenderer',
    'esri/geometry/Point',
    'esri/geometry/Extent',
    'esri/geometry/webMercatorUtils',
    'esri/TimeExtent',
    'esri/dijit/TimeSlider',
    'esri/dijit/PopupTemplate',
    'dojo/promise/all',
    'dojo/parser',
    'dojo/domReady!'
],
function (
    Map,
    Color,
    SpatialReference,
    FeatureLayer,
    ArcGISImageServiceLayer,
    TimeInfo,
    MosaicRule,
    RasterFunction,
    ImageServiceParameters,
    ImageServiceIdentifyTask,
    ImageServiceIdentifyParameters,
    QueryTask,
    Query,
    Geoprocessor,
    SimpleMarkerSymbol,
    SimpleLineSymbol,
    SimpleRenderer,
    Point,
    Extent,
    webMercatorUtils,
    TimeExtent,
    TimeSlider,
    PopupTemplate,
    all,
    parser
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

        // URL and other contants
        var EVENTS   = 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/events/FeatureServer/0';
        var MODEL    = 'https://maps.esri.com/apl1/rest/services/HeatWave/LHWByTempVsRH/ImageServer';
        var HUMIDITY = 'https://maps.esri.com/apl22/rest/services/Heatwaves/NetCDFReturnValues/GPServer/NetCDFReturnValues';
        var DATE_MIN = 1950;
        var DATE_MAX = 2100;

        // Slider time extent
        var TIMEEXTENT = new TimeExtent(
            new Date(Date.UTC(DATE_MIN, 0, 1)),
            new Date(Date.UTC(DATE_MAX, 0, 1))
        );

        // Map spatial extent
        var MAPEXTENT = new Extent({
            xmin: -150,
            ymin: -20,
            xmax: 90,
            ymax: 60,
            spatialReference: new SpatialReference({
                wkid: 4326
            })
        });

        // Ensure that digits are loaded.
        parser.parse();

        // Create historic heatwave events layer.
        var _events = new FeatureLayer(EVENTS, {
            infoTemplate: new PopupTemplate({
                title: 'Documented Heat Event',
                fieldInfos: [
                    { label: 'City', fieldName: "City", visible: true },
                    { label: 'State', fieldName: "State_Province_Region", visible: true },
                    { label: 'Country', fieldName: "Country", visible: true },
                    { label: 'Entered', fieldName: "EnteredBy", visible: true },
                    { label: 'Verified', fieldName: "VerifiedBy", visible: true },
                    { label: 'StartYear', fieldName: "StartYear", visible: true },
                    { label: 'EndYear', fieldName: "EndYear", visible: true },
                    { label: 'Metric', fieldName: "MetricMortalityValue", visible: true },
                    { label: 'Mortality', fieldName: "MortalityValue", visible: true },
                    { label: 'Reference', fieldName: "Reference", visible: true },
                    { label: 'Affected', fieldName: "CommentsOnAffected", visible: true },
                    { label: 'Condition', fieldName: "CommentsOnClimateConditions", visible: true },
                    { label: 'Notes', fieldName: "OtherNotes", visible: true }
                ]
            }),
            outFields: [
                'City',                         // "Dallas"
                'State_Province_Region',        // "Texas"
                'Country',                      // "United States"
                'EnteredBy',                    // "Farrah Powell"
                'VerifiedBy',                   // "Camilo Mora"
                'StartYear',                    // "1964"
                'EndYear',                      // "1991"
                'MetricMortalityValue',         // "Deaths/day"
                'MortalityValue',               // "3"
                'Reference',                    // "Kalkstein and Greene 1997 An evaluation of..."
                'CommentsOnAffected',           // "Majority of heat related deaths occurred..."
                'CommentsOnClimateConditions',  // "days with 3pm temp >/= 30 deg C"
                'OtherNotes'                    // "climate-related mortality; very warm air masses..."
            ],
            showAttribution: false,
            useMapTime: true,
            visible: true
        });
        _events.setRenderer(new SimpleRenderer(new SimpleMarkerSymbol(
            SimpleMarkerSymbol.STYLE_CIRCLE,
            10,
            new SimpleLineSymbol(
                SimpleLineSymbol.STYLE_SOLID,
                new Color([255, 255, 255]),
                2
            ),
            new Color([0, 255, 255])
        )));

        // Define image service parameters.
        var _isp = new ImageServiceParameters();
        _isp.interpolation = ImageServiceParameters.INTERPOLATION_BILINEAR;
        var _model = new ArcGISImageServiceLayer(MODEL, {
            imageServiceParameters: _isp,
            opacity: 1
        });
        updateModelRenderer();

        // Load time slider
        var _timeSlider = new TimeSlider({}, 'timeSlider');
        _timeSlider.on('time-extent-change', function () {
            var year = _timeSlider.getCurrentTimeExtent().startTime.getUTCFullYear();
            // Hide events layer if year is less than equal to 2013
            var visible = year <= 2013;
            if (_events.visible !== visible) {
                _events.setVisibility(visible);
            }
            updateMenu();
        });
        _timeSlider.setLoop(true);
        _timeSlider.setThumbCount(1);
        _timeSlider.createTimeStopsByTimeInterval(
            TIMEEXTENT,
            1,
            TimeInfo.UNIT_YEARS
        );
        _timeSlider.setThumbIndexes([50]);
        _timeSlider.singleThumbAsTimeInstant(true);
        _timeSlider.setTickCount(4);
        _timeSlider.setLabels(['1950', '2000', '2050', '2100']);
        _timeSlider.startup();

        // Create map and add basemap
        var _map = new Map('map', {
            basemap: 'gray',
            logo: true,
            showAttribution: false,
            slider: true,
            extent: MAPEXTENT
        });
        _map.addLayers([
            _events,
            _model
        ]);
        _map.on('load', function () {
            _map.setTimeSlider(_timeSlider);
        });
        _map.on('click', function (e) {
            // Clear chart
            if (e.graphic) { return; }
            $('#modalChart svg').remove();
            $('#modalChart .progress').show();
            $('#modalChart').data(e.mapPoint).modal('show');
        });

        $('#modalChart').on('shown.bs.modal', function (e) {
            // Update chart title
            var mappoint = $('#modalChart').data();
            var experiment = $('.rc-model li.active a').attr('data-value');
            var wgs = webMercatorUtils.webMercatorToGeographic(mappoint);
            var model = null;
            switch (experiment) {
                case 'rcp26':
                    model = 'RCP26 (strong mitigation)';
                    break;
                case 'rcp45':
                    model = 'RCP45 (moderate mitigation)';
                    break;
                case 'rcp85':
                    model = 'RCP85 (business-as-usual)';
                    break;
            }
            $('#modalChart .modal-title').html(
                $.format('{0} at {1}&deg;{2} {3}&deg;{4} using {5}', [
                    'Heatwaves',
                    Math.abs(wgs.y.toFixed()),
                    (wgs.y > 0) ? 'N' : 'S',
                    Math.abs(wgs.x.toFixed()),
                    (wgs.x > 0) ? 'E' : 'W',
                    model
                ])
            );
            
            // Initialize charts
            chart1(wgs);
            chart2(wgs, experiment);
        });

        // Show help and about dialogs.
        $('#buttonHelp').click(function () {
            $('#modalHelp').modal('show');
        });
        $('#buttonAbout').click(function () {
            $('#modalAbout').modal('show');
        });
        
        // Dropdown menus.
        $('.dropdown-menu li a').click(function () {
            // Exit if item already selected.
            if ($(this).parent().hasClass('active')) { return; }

            // Toggle enabled state for clicked item and siblings.
            $(this).parent().addClass('active').siblings().removeClass('active');

            // Update model image service properties
            updateModelRenderer();

            // 
            if ($(this).parent().parent().hasClass('rc-year')) {
                // Update map time. This will trigger a refresh.
                var year = Number($('.rc-year li.active a').html());
                _timeSlider.setThumbIndexes([year - DATE_MIN]);
            }
            else {
                // Refresh image service
                _model.refresh();
            }

            updateMenu();
        });
        $('.rc-year').parent().on('show.bs.dropdown', function () {
            var year = _timeSlider.getCurrentTimeExtent().startTime.getUTCFullYear();
            $('.rc-year a').each(function () {
                var add = Number($(this).html()) === year;
                $(this).parent().toggleClass('active', add);
            });
        });
        $('.modal a').attr('target', '_blank');

        // Update the caption text whenever teh carousel advances.
        $('#carousel').on('slid.bs.carousel', function () {
            var index = $('#carousel .item.active').index();
            var len = $('#carousel .item').length;
            var next = index === len - 1 ? 0 : index + 1;
            var next2 = $($('#carousel-captions').children()[next]);
            next2.addClass('active').siblings().removeClass('active');
        });

        // Determine margins
        var margin = {
            left: 60,
            top: 20,
            right: 50,
            bottom: 45
        };
        
        // Add the chart showing predicted headly heat events.
        function chart1(mappoint) {
            //
            var currentYear = _timeSlider.getCurrentTimeExtent().startTime.getUTCFullYear();
            var currentDays = null;

            // Build identify parameters
            var parameters = new ImageServiceIdentifyParameters();
            parameters.geometry = mappoint;
            parameters.returnCatalogItems = true;
            parameters.returnGeometry = false;
            parameters.mosaicRule = _model.mosaicRule;

            var data = [];
            var min = 0;
            var max = 100;

            var isit = new ImageServiceIdentifyTask(MODEL);
            isit.execute(parameters, function (results) {
                // Hide progress bar.
                $('#chart1 .progress').hide();

                // Loops for each 
                for (var i = 0; i < results.catalogItems.features.length; i++) {
                    var year = results.catalogItems.features[i].attributes.Year;
                    var val = results.properties.Values[i];
                    if (val === 'NoData') { continue; }
                    min = Math.min(min, val);
                    max = Math.max(max, val);
                    data.push({
                        year: Number(year),
                        value: Number(val)
                    });
                }

                // Find current "days" for current year.
                $.each(data, function () {
                    if (this.year === currentYear) {
                        currentDays = Math.round(this.value);
                        return false;
                    }
                });

                // Get chart area.
                var width = $('#chart1').width();
                var height = $('#chart1').height();

                // Create SVG element.
                var svg = d3.select('#chart1')
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height);

                var x = d3.scale.linear()
                    .domain([DATE_MIN, DATE_MAX])
                    .range([0, width - margin.left - margin.right]);

                var y = d3.scale.linear()
                    .domain([min, max])
                    .range([height - margin.top - margin.bottom, 0]);

                var xaxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom')
                    .tickFormat(d3.format('g'));

                var yaxis = d3.svg.axis()
                    .scale(y)
                    .orient('left')
                    .tickFormat(d3.format('g'));

                // Add x-axis, label and ticks
                svg.append('g')
                    .attr('transform', $.format('translate({0},{1})', [
                        margin.left,
                        height - margin.bottom
                    ]))
                    .classed({
                        'rc-axis': true
                    })
                    .call(xaxis);

                // Add x-axis title.
                svg.append('g')
                    .attr('transform', $.format('translate({0},{1})', [
                        margin.left + (width - margin.left - margin.right) / 2,
                        height - 5 
                    ]))
                    .classed({
                        'rc-axis': true
                    })
                    .append('text')
                    .style('text-anchor', 'middle')
                    .text('Time');

                // Add y-axis, label and ticks
                svg.append('g')
                    .attr('transform', $.format('translate({0},{1})', [
                        margin.left,
                        margin.top
                    ]))
                    .classed({
                        'rc-axis': true
                    })
                    .call(yaxis);

                // Add y-axis title
                svg.append('g')
                    .attr('transform', $.format('translate({0},{1}) rotate(-90)', [
                        20,
                        margin.top + (height - margin.top - margin.bottom) / 2
                    ]))
                    .classed({
                        'rc-axis': true
                    })
                    .append('text')
                    .style('text-anchor', 'middle')
                    .text('Yearly number of deadly days');

                // Show "no data found" if necessary.
                if (results.value === 'NoData') {
                    svg.append('g')
                        .attr('transform', $.format('translate({0},{1})', [
                            margin.left + (width - margin.left - margin.right) / 2,
                            margin.top + (height - margin.top - margin.bottom) / 2
                        ]))
                        .classed({
                            'rc-axis': true
                        })
                        .append('text')
                        .style('text-anchor', 'middle')
                        .text('No data found');
                    return;
                }

                // Line definition
                var line = d3.svg.line()
                   .x(function (d) {
                       return x(d.year);
                   })
                   .y(function (d) {
                       return y(d.value);
                    });

                // Group that will contain series path and circles
                svg.append('g')
                    .attr('transform', $.format('translate({0},{1})', [
                        margin.left,
                        margin.top
                    ]))
                    .classed({
                        'rc-lines': true
                    })
                    .selectAll('path')
                    .data([data])
                    .enter()
                    .append('path')
                    .attr({
                        d: function (d) {
                            return line(d);
                        }
                    });

                // Draw points
                svg.append('g')
                    .attr('transform', $.format('translate({0},{1})', [
                        margin.left,
                        margin.top
                    ]))
                    .classed({
                        'rc-dots': true
                    })
                    .selectAll('circle')
                    .data(data)
                    .enter()
                    .append('circle')
                    .attr({
                        cx: function (d) {
                            return x(d.year);
                        },
                        cy: function (d) {
                            return y(d.value);
                        },
                        r: 5
                    });

                // Add current year vertical line.
                svg.append('g')
                    .attr('transform', $.format('translate({0},{1})', [
                        margin.left,
                        margin.top
                    ]))
                    .classed({
                        'rc-year': true
                    })
                    .append('line')
                    .attr({
                        x1: x(currentYear),
                        y1: y(min),
                        x2: x(currentYear),
                        y2: y(max)
                    });

                // Add "Selected Year" text
                svg.append('g')
                    .attr('transform', $.format('translate({0},{1})', [
                        margin.left + x(currentYear),
                        margin.top - 3
                    ]))
                    .classed({
                        'rc-year': true
                    })
                    .append('text')
                    .style('text-anchor', 'middle')
                    .text('Selected Year');

                // Add horizontal days dashed line.
                svg.append('g')
                    .attr('transform', $.format('translate({0},{1})', [
                        margin.left,
                        margin.top
                    ]))
                    .classed({
                        'rc-days': true
                    })
                    .append('line')
                    .attr({
                        x1: x(DATE_MIN),
                        y1: y(currentDays),
                        x2: x(currentYear),
                        y2: y(currentDays)
                    });

                // Add horizontal days dashed text.
                svg.append('g')
                    .attr('transform', $.format('translate({0},{1})', [
                        margin.left + (x(currentYear) - x(DATE_MIN)) / 2,
                        margin.top + y(currentDays) - 3
                    ]))
                    .classed({
                        'rc-days': true
                    })
                    .append('text')
                    .style('text-anchor', 'middle')
                    .text(currentDays + ' days');
            });
        }
        
        //
        function chart2(mappoint, experiment) {
            //
            var year = _timeSlider.getCurrentTimeExtent().startTime.getUTCFullYear();
            var lat = mappoint.y;
            var lon = mappoint.x < 0 ? mappoint.x + 360 : mappoint.x;
            var exp = Number(experiment.substring(3));

            // GP parameters
            var parameters = {
                Year: year,
                Experiment: exp,
                Latitude: lat,
                Longitude: lon
            };

            // Initialize GP
            var gp = new Geoprocessor(HUMIDITY);

            // Submit job.
            gp.submitJob(parameters, function (e) {
                // Error occurred.
                if (e.jobStatus !== 'esriJobSucceeded') { return; }

                all([
                    gp.getResultData(e.jobId, 'RHS'),
                    gp.getResultData(e.jobId, 'TAS')
                ]).then(function (results) {
                    // results will be an Array
                    var rhs = results[0].value.features;
                    var tas = results[1].value.features;
                    var data = [];
                    var minTemp = 0;
                    var maxTemp = 50;
                    for (var i = 0; i < rhs.length; i++) {
                        var r = rhs[i].attributes.rhs;
                        var t = tas[i].attributes.tas - 273;
                        data.push({
                            rhs: r,
                            tas: t
                        });
                        minTemp = Math.min(minTemp, t);
                        maxTemp = Math.max(maxTemp, t);
                    }

                    // Hide progress element.
                    $('#chart2 .progress').hide();

                    // Get chart size
                    var width = $('#chart2').width();
                    var height = $('#chart2').height();

                    // Create SVG element.
                    var svg = d3.select('#chart2')
                        .append('svg')
                        .attr('width', width)
                        .attr('height', height);

                    var x = d3.scale.linear()
                        .domain([minTemp, maxTemp])
                        .range([0, width - margin.left - margin.right]);

                    var y = d3.scale.linear()
                        .domain([0, 100])
                        .range([height - margin.top - margin.bottom, 0]);

                    var xaxis = d3.svg.axis()
                        .scale(x)
                        .orient('bottom')
                        .tickFormat(d3.format('g'));

                    var yaxis = d3.svg.axis()
                        .scale(y)
                        .orient('left')
                        .tickFormat(d3.format('g'));

                    // Add x-axis, label and ticks
                    svg.append('g')
                        .attr('transform', $.format('translate({0},{1})', [
                            margin.left,
                            height - margin.bottom
                        ]))
                        .classed({
                            'rc-axis': true
                        })
                        .call(xaxis);

                    // Add x-axis title.
                    svg.append('g')
                        .attr('transform', $.format('translate({0},{1})', [
                            width / 2,
                            height - 5
                        ]))
                        .classed({
                            'rc-axis': true
                        })
                        .append('text')
                        .style('text-anchor', 'middle')
                        .text('Temperature of each day in ' + year);

                    // Add y-axis, label and ticks
                    svg.append('g')
                        .attr('transform', $.format('translate({0},{1})', [
                            margin.left,
                            margin.top
                        ]))
                        .classed({
                            'rc-axis': true
                        })
                        .call(yaxis);

                    // Add y-axis title
                    svg.append('g')
                        .attr('transform', $.format('translate({0},{1}) rotate(-90)', [
                            20,
                            margin.top + (height - margin.top - margin.bottom) / 2
                        ]))
                        .classed({
                            'rc-axis': true
                        })
                        .append('text')
                        .style('text-anchor', 'middle')
                        .text('Humidity of each day in ' + year);

                    // Deadly threshold [humidity (y), temperature (x)]
                    var THRESHOLD = [
                        [26.63316583, 96.48241206],
                        [26.88442211, 88.94472362],
                        [27.38693467, 81.40703518],
                        [28.14070352, 73.86934673],
                        [29.14572864, 66.33165829],
                        [30.15075377, 58.79396985],
                        [31.65829146, 51.25628141],
                        [33.16582915, 43.71859296],
                        [35.17587940, 36.18090452],
                        [37.43718593, 28.64321608],
                        [40.20100503, 21.10552764],
                        [43.21608040, 13.56783920],
                        [46.98492462, 6.030150754],
                        [50, 0]
                    ];

                    // Deadly polygon
                    var deadly = THRESHOLD.slice(0);
                    deadly.push([50, 100]);

                    // Deadly days
                    var inside = data.filter(function (f) {
                        return isInside(
                            deadly, [f.tas, f.rhs]
                        );
                    });

                    // Not deadly days
                    var outside = data.filter(function (f) {
                        return !isInside(
                            deadly, [f.tas, f.rhs]
                        );
                    });

                    // Draw not deadly days
                    svg.append('g')
                        .attr('transform', $.format('translate({0},{1})', [
                            margin.left,
                            margin.top
                        ]))
                        .classed({
                            'rc-not-deadly': true
                        })
                        .selectAll('circle')
                        .data(outside)
                        .enter()
                        .append('circle')
                        .attr({
                            cx: function (d) {
                                return x(d.tas);
                            },
                            cy: function (d) {
                                return y(d.rhs);
                            },
                            r: 5
                        });

                    // Draw deadly days
                    svg.append('g')
                        .attr('transform', $.format('translate({0},{1})', [
                            margin.left,
                            margin.top
                        ]))
                        .classed({
                            'rc-deadly': true
                        })
                        .selectAll('circle')
                        .data(inside)
                        .enter()
                        .append('circle')
                        .attr({
                            cx: function (d) {
                                return x(d.tas);
                            },
                            cy: function (d) {
                                return y(d.rhs);
                            },
                            r: 5
                        });

                    // Line definition
                    var line = d3.svg.line()
                        .x(function (d) {
                            return x(d[0]);
                        })
                        .y(function (d) {
                            return y(d[1]);
                        });

                    // Draw deadly threshold line.
                    svg.append('g')
                        .attr('transform', $.format('translate({0},{1})', [
                            margin.left,
                            margin.top
                        ]))
                        .classed({
                            'rc-threshold': true
                        })
                        .selectAll('path')
                        .data([THRESHOLD])
                        .enter()
                        .append('path')
                        .attr({
                            d: function (d) {
                                return line(d);
                            }
                        });

                    // Add "deadly threshold" text.
                    svg.append('g')
                        .attr('transform', $.format('translate({0},{1})', [
                            margin.left + x(THRESHOLD[0][0]),
                            margin.top + y(THRESHOLD[0][1]) - 5
                        ]))
                        .classed({
                            'rc-threshold': true
                        })
                        .append('text')
                        .style('text-anchor', 'middle')
                        .text('Deadly Threshold');
                });
            });
        }

        // Point in polygon test
        function isInside(polygon, point) {
            var n = polygon.length,
                p = polygon[n - 1],
                x = point[0],
                y = point[1],
                x0 = p[0],
                y0 = p[1],
                x1,
                y1,
                inside = false;

            for (var i = 0; i < n; ++i) {
                p = polygon[i], x1 = p[0], y1 = p[1];
                if (((y1 > y) !== (y0 > y)) && (x < (x0 - x1) * (y - y1) / (y0 - y1) + x1)) {
                    inside = !inside;
                }
                x0 = x1, y0 = y1;
            }

            return inside;
        }

        // Return a new raster function.
        function updateModelRenderer() {
            // Get parameters from UI.
            var variable = 'NomValueAbove95';
            var experiment = $('.rc-model li.active a').attr('data-value');
            var fxn = 'LethalHeatDays_0_365_Mask';

            // Create mosaic rule.
            var mosaicRule = new MosaicRule();
            mosaicRule.sortField = 'Year';
            mosaicRule.where = $.format("Variable = '{0}' AND ( Experiment = '{1}' OR Experiment = 'historical' )", [
                variable,
                experiment
            ]);
            _model.setMosaicRule(mosaicRule, true);

            // Create raster function.
            var rasterFunction = new RasterFunction();
            rasterFunction.functionName = fxn;
            _model.setRenderingRule(rasterFunction, true);
        }

        // Update the menu text after menuitems have been selected.
        function updateMenu() {
            var model = $('.rc-model li.active a').html();
            var year = _timeSlider.getCurrentTimeExtent().startTime.getUTCFullYear();
            $('.rc-model').siblings('a').find('.rc-itemValue').html(model);
            $('.rc-year').siblings('a').find('.rc-itemValue').html(year);
        }
    });
});
