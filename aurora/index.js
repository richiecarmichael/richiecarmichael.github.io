/*    
    Copyright 2016 Esri

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

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
    'app/aurora',
    'dojo/domReady!'
],
function (
    Map,
    Camera,
    SceneView,
    ExternalRenderers,
    Aurora
    ) {
    // Enforce strict mode
    'use strict';

    //
    var _long = 0;

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
                min: 0,
                max: 10000000000
            },
            clipDistance: {
                mode: 'manual',
                near: 100000,
                far: 10000000000
            }
        }
    });
    _view.then(function () {
        // Add renderer
        ExternalRenderers.add(
            _view,
            new Aurora()
        );

        // Rotate the Earth
        window.setInterval(function () {
            _long -= 0.1;
            if (_long <= -180) {
                _long = 180;
            }
            var lat = $('#buttons > .btn.active').attr('data-lattitude');
            var alt = $('#buttons > .btn.active').attr('data-altitude');
            var til = $('#buttons > .btn.active').attr('data-tilt');
            _view.set('camera', Camera.fromJSON({
                tilt : til,
                position: {
                    x: _long,
                    y: Number(lat),
                    spatialReference: {
                        wkid: 4326
                    },
                    z: Number(alt)
                }
            }));
        }, 15);
    });

    // Adjust view when one of the three buttons is clicked.
    $('#buttons > .btn').click(function () {
        // Button is already clicked.
        if ($(this).hasClass('active')) { return; }

        // Toggle active (or checked) state.
        $(this).addClass('active').siblings().removeClass('active');
    });
});
