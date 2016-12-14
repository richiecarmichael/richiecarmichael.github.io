/* ------------------------------------------------------------
   Developed by the Applications Prototype Lab
   (c) 2016 Esri | https://www.esri.com/legal/software-license  
--------------------------------------------------------------- */

require([
    'esri/map',
    'esri/Color',
    'esri/SpatialReference',
    'esri/layers/FeatureLayer',
    'esri/layers/GraphicsLayer',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/renderers/SimpleRenderer',
    'esri/renderers/HeatmapRenderer',
    'esri/geometry/Extent',
    'esri/TimeExtent',
    'esri/layers/TimeInfo',
    'esri/dijit/TimeSlider',
    'esri/dijit/PopupTemplate',
    'dojo/parser',
    'dojo/domReady!'
],
function (
    Map,
    Color,
    SpatialReference,
    FeatureLayer,
    GraphicsLayer,
    SimpleMarkerSymbol,
    SimpleLineSymbol,
    SimpleRenderer,
    HeatmapRenderer,
    Extent,
    TimeExtent,
    TimeInfo,
    TimeSlider,
    PopupTemplate,
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
        var HISTORIC = 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/historic/FeatureServer/0';
        var RCP26    = 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/rcp26/FeatureServer/0';
        var RCP45    = 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/rcp45/FeatureServer/0';
        var RCP85    = 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/rcp85/FeatureServer/0';
        var TIMEEXTENT = new TimeExtent(
            new Date('1/1/1950 UTC'),
            new Date('1/1/2100 UTC')
        );
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

        //
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
        var _heat = new HeatmapRenderer({
            colorStops: [
              { ratio: 0.1,  color: 'rgba(0, 0, 255, 0)' },
              { ratio: 0.45,  color: 'rgba(0, 0, 255, 1)' },
              { ratio: 0.5, color: 'rgba(255, 0, 255, 1)' },
              { ratio: 0.55, color: 'rgba(255, 0, 0, 1)' },
              { ratio: 0.65, color: 'rgba(255, 255, 255, 1)' },
              { ratio: 1.0, color: 'rgba(255, 255, 255, 0)' }
            ],
            field: 'NumberLeHeatAnom'
        });
        
        var infoTemplate = new PopupTemplate({
            title: 'Analysis',
            fieldInfos: [
                { label: 'Number of Heat Anomalies', fieldName: "NumberLeHeatAnom", format: { places: 2 }, visible: true },
                { label: 'Number of Lethal Days', fieldName: "YearlyLethalDays", format: { places: 2 }, visible: true },
                { label: 'Mean Humidity Anomaly', fieldName: "MeanHAnomInt", format: { places: 2 }, visible: true },
                { label: 'Mean Degree Days', fieldName: "MeanDegreeDays", format: { places: 2 }, visible: true },
                { label: 'Mean Temperature Anomaly', fieldName: "MeanTASHAnom", format: { places: 2 }, visible: true },
                { label: 'Mean Decision Value', fieldName: "MeanDecisionValue", format: { places: 2 }, visible: true }
            ]
        });

        var outFields = [
            'NumberLeHeatAnom',
            'YearlyLethalDays',
            'MeanHAnomInt',
            'MeanDegreeDays',
            'MeanTASHAnom',
            'MeanDecisionValue'
        ];

        // Historic layer
        var _historic = new FeatureLayer(HISTORIC, {
            infoTemplate: infoTemplate,
            opacity: 0.5,
            outFields: outFields,
            showAttribution: false,
            useMapTime: true,
            visible: true
        });
        _historic.setRenderer(_heat);

        // RCP26 model
        var _rcp26 = new FeatureLayer(RCP26, {
            infoTemplate: infoTemplate,
            opacity: 0.5,
            outFields: outFields,
            showAttribution: false,
            useMapTime: true,
            where: 'y > -75 AND y < 75',
            visible: true
        });
        _rcp26.setRenderer(_heat);
        
        // Create map and add basemap
        var _map = new Map('map', {
            basemap: 'streets',
            logo: false,
            showAttribution: false,
            slider: true,
            extent: MAPEXTENT
        });
        _map.addLayers([
            _events,
            _historic,
            _rcp26
        ]);
        _map.on('extent-change', function (e) {
            if (e.levelChange) {
                updateHeatmap();
            };
        });
        _map.on('load', function () {
            // Load slider
            var timeSlider = new TimeSlider({}, 'timeSlider');
            timeSlider.setThumbCount(1);
            timeSlider.createTimeStopsByTimeInterval(
                TIMEEXTENT,
                1,
                TimeInfo.UNIT_YEARS
            );
            timeSlider.setThumbIndexes([0]);
            timeSlider.singleThumbAsTimeInstant(true);
            timeSlider.setTickCount(4);
            timeSlider.setLabels(['1950', '2000', '2050', '2100']);
            timeSlider.on('time-extent-change', function (e) {
                //updateSubTitle();
            });
            timeSlider.startup();
            _map.setTimeSlider(timeSlider);

            //
            updateHeatmap();
            //updateSubTitle();
        });

        //
        $('#buttonHelp').click(function () {
            $('#modalHelp').modal('show');
        });
        $('#buttonAbout').click(function () {
            $('#modalAbout').modal('show');
        });
        $('.dropdown-menu li a').click(function () {
            if ($(this).parent().hasClass('active')) { return;}
            $(this).parent().addClass('active').siblings().removeClass('active');
        });

        function updateHeatmap() {
            //
            var level = _map.getLevel();

            // Toggle heatmap visiblity
            _historic.setVisibility(level <= 5);
            _rcp26.setVisibility(level <= 5);

            // Update heatmap parameters
            switch (level) {
                case 0:
                case 1:
                    _heat.setBlurRadius(10);
                    _heat.setMinPixelIntensity(0);
                    _heat.setMaxPixelIntensity(250);
                    break;
                case 2:
                    _heat.setBlurRadius(10);
                    _heat.setMinPixelIntensity(0);
                    _heat.setMaxPixelIntensity(150);
                    break;
                case 3:
                    _heat.setBlurRadius(10);
                    _heat.setMinPixelIntensity(0);
                    _heat.setMaxPixelIntensity(50);
                    break;
                case 4:
                    _heat.setBlurRadius(20);
                    _heat.setMinPixelIntensity(0);
                    _heat.setMaxPixelIntensity(150);
                    break;
                case 5:
                    _heat.setBlurRadius(20);
                    _heat.setMinPixelIntensity(0);
                    _heat.setMaxPixelIntensity(50);
                    break;
            }
        }
        //function updateSubTitle() {
        //    if (!_map || !_map.timeExtent) { return;}
        //    $('#subtitle').html(
        //        $.format('{0} <span class="caret-right"></span> {1} <span class="caret-right"></span> {2}', [
        //            'rcp26',
        //            'heat anomalies',
        //            _map.timeExtent.startTime.getUTCFullYear()
        //        ])
        //    );
        //}
    });
});

