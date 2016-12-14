// Configuration
var _config = {
    basemap: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer',
    rivers: 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/Hydro2014/FeatureServer/0',
    levels: [
        // Level 0
        null,
        // Level 1
        null,
        // Level 2
        null,
        // Level 3
        {
            url: 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/Hydro2014/FeatureServer/1',
            buffer: '20000',
            polyline_count: 250,
            segment_count_min: 5,
            segment_count_max: 25,
            segment_length: 0.1,
            hash_size: 5,
            search_radius: 5
        },
        // Level 4
        {
            url: 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/Hydro2014/FeatureServer/1',
            buffer: '20000',
            polyline_count: 400,
            segment_count_min: 5,
            segment_count_max: 25,
            segment_length: 0.2,
            hash_size: 10,
            search_radius: 10
        },
        // Level 5
        {
            url: 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/Hydro2014/FeatureServer/1',
            buffer: '10000',
            polyline_count: 1000,
            segment_count_min: 10,
            segment_count_max: 25,
            segment_length: 1,
            hash_size: 10,
            search_radius: 10
        },
        // Level 6
        {
            url: 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/Hydro2014/FeatureServer/2',
            buffer: '3000',
            polyline_count: 1000,
            segment_count_min: 5,
            segment_count_max: 25,
            segment_length: 1,
            hash_size: 10,
            search_radius: 20
        },
        // Level 7
        {
            url: 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/Hydro2014/FeatureServer/3',
            buffer: '1500',
            polyline_count: 1000,
            segment_count_min: 5,
            segment_count_max: 25,
            segment_length: 1,
            hash_size: 10,
            search_radius: 20
        },
        // Level 8
        null,
        // Level 9
        null,
        // Level 10
        null
    ]
};