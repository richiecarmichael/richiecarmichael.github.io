require({
    packages: [{
        name: 'app',
        location: document.location.pathname + '/..'
    }]
}, [
    'esri/Map',
    'esri/Camera',
    'esri/views/SceneView',
    'esri/views/3d/externalRenderers',
    'app/js/wave',
    'dojo/domReady!'
],
function (
    Map,
    Camera,
    SceneView,
    ExternalRenderers,
    Wave
    ) {
    // Enforce strict mode
    'use strict';

    //
    var LAT = 0;
    var LONG = 0;
    var ALT = 100000000;
    var _wave = null;

    // Create map and view
    var _view = new SceneView({
        map: new Map({
            basemap: 'satellite'
        }),
        container: 'map',
        ui: {
            components: []
        },
        environment: {
            lighting: {
                directShadowsEnabled: false,
                ambientOcclusionEnabled: false,
                cameraTrackingEnabled: false
            },
            atmosphereEnabled: true,
            atmosphere: {
                quality: 'high'
            },
            starsEnabled: true
        },
        constraints: {
            altitude: {
                min: ALT,
                max: ALT
            }
        }
    });
    _view.then(function () {
        // Set initial camera position
        _view.set('camera', Camera.fromJSON({
            'position': {
                'x': LONG,
                'y': LAT,
                'spatialReference': {
                    'wkid': 4326
                },
                'z': ALT
            }
        }));

        // Increase far clipping plane
        _view.constraints.clipDistance.far *= 2;

        // Load wave layer
        loadWaves();
    });

    //
    function loadWaves() {
        // Remove old renderer
        if (_wave) {
            ExternalRenderers.remove(_view, _wave);
        }

        // Create external renderer
        _wave = new Wave(_view, LONG, LAT, ALT);

        // Add renderer
        ExternalRenderers.add(
            _view,
            _wave
        );
    }
});
