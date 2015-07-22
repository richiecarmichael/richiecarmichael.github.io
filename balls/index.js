/* -----------------------------------------------------------------------------------
   Developed by the Applications Prototype Lab
   (c) 2015 Esri | http://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

require([
    'esri/Map',
    'esri/Camera',
    'esri/core/Scheduler',
    'esri/views/SceneView',
    'esri/geometry/Point',
    'esri/geometry/SpatialReference',
    'dojo/on',
    'dojo/domReady!'
],
function (
    Map,
    Camera,
    Scheduler,
    SceneView,
    Point,
    SpatialReference,
    on
    ) {
    $(document).ready(function () {
        // Enforce strict mode
        'use strict';

        // Cannon physics engine constants
        var FPS = 60;
        var MAXSUBSTEPS = 3;
        var ALTITUDE_THRESHOLD = 50000;

        // Twgl variables
        var _gl = null;
        var _programInfo = null;
        var _ball = null;

        // Cannon variables
        var _world = null;
        var _material = null;
        
        // Create map and view
        var _camera = null;
        var _map = new Map({
            basemap: 'satellite'
        });
        var _view = new SceneView({
            container: 'map',
            map: _map
        });
        _view.then(function () {
            showDelayedBanner('Welcome to Boxes, Balls & Barrels!', 1000);
            showDelayedBanner('Please zoom in or select an entry from the "Quick Links" dropdown', 3000);

            // Get a reference to the internal camera
            _camera = _view._stage.getCamera();

            _view.watch('camera', function () {
                if (_view.camera.position.z > ALTITUDE_THRESHOLD) {
                    showDelayedBanner('Please zoom in or select an entry from the "Quick Links" dropdown', 3000);
                } else {
                    showDelayedBanner('Tap on the terrain to initiate a drop', 3000);
                }
            });
        });
        on(_view, 'tap', function (e) {
            // Exit if invalid or missing map point
            if (!e || !e.mapPoint) { return; }

            // Too high
            if (_view.camera.position.z > ALTITUDE_THRESHOLD) { return;}

            // 
            createPhysicsEnvironment(
                e.mapPoint,
                $('#slider-gravity').slider('getValue'),
                $('#slider-elevation-size').slider('getValue'),
                $('#slider-elevation-resolution').slider('getValue')
            );

            // function createWebglEnvironment(point, shape, size, gap, rows, columns, levels, height)
            createWebglEnvironment(
                e.mapPoint,
                $('#buttonShape > button.active').attr('data-value'),
                $('#buttonColor > button.active').attr('data-value'),
                $('#slider-size').slider('getValue'),
                $('#slider-gap').slider('getValue'),
                $('#slider-rows').slider('getValue'),
                $('#slider-columns').slider('getValue'),
                $('#slider-levels').slider('getValue'),
                $('#slider-height').slider('getValue')
            );
        });

        // Enable bootstrap tooltips
        $('[data-toggle="tooltip"]').tooltip();

        // Create bootstrap sliders
        $('#slider-size').slider({
            id: 'slider-size-internal',
            ticks: [1, 2, 5, 10, 20, 50],
            ticks_positions: [0, 20, 40, 60, 80, 100],
            ticks_labels: ['1', '2', '5', '10', '20', '50'],
            orientation: 'horizontal',
            range: false,
            value: 5
        });
        $('#slider-height').slider({
            id: 'slider-height-internal',
            ticks: [0, 10, 20, 50, 100, 200],
            ticks_positions: [0, 20, 40, 60, 80, 100],
            ticks_labels: ['0', '10', '20', '50', '100', '200'],
            orientation: 'horizontal',
            range: false,
            value: 50
        });
        $('#slider-rows').slider({
            id: 'slider-rows-internal',
            ticks: [1, 2, 4, 6, 8, 10],
            ticks_positions: [0, 20, 40, 60, 80, 100],
            ticks_labels: ['1', '2', '4', '6', '8', '10'],
            ticks_snap_bounds: 10,
            orientation: 'horizontal',
            range: false,
            value: 4
        });
        $('#slider-columns').slider({
            id: 'slider-columns-internal',
            ticks: [1, 2, 4, 6, 8, 10],
            ticks_positions: [0, 20, 40, 60, 80, 100],
            ticks_labels: ['1', '2', '4', '6', '8', '10'],
            ticks_snap_bounds: 10,
            orientation: 'horizontal',
            range: false,
            value: 4
        });
        $('#slider-levels').slider({
            id: 'slider-levels-internal',
            ticks: [1, 2, 4, 6, 8, 10],
            ticks_positions: [0, 20, 40, 60, 80, 100],
            ticks_labels: ['1', '2', '4', '6', '8', '10'],
            ticks_snap_bounds: 10,
            orientation: 'horizontal',
            range: false,
            value: 4
        });
        $('#slider-gap').slider({
            id: 'slider-gap-internal',
            ticks: [0, 1, 2, 5, 10, 20],
            ticks_positions: [0, 20, 40, 60, 80, 100],
            ticks_labels: ['0', '1', '2', '5', '10', '20'],
            orientation: 'horizontal',
            range: false,
            value: 1
        });
        $('#slider-gravity').slider({
            id: 'slider-gravity-internal',
            ticks: [1.622, 3.711, 9.807, 24.79],
            ticks_positions: [0, 33, 66, 100],
            ticks_labels: ['Moon', 'Mars', 'Earth', 'Jupiter'],
            ticks_snap_bounds: 10,
            orientation: 'horizontal',
            precision: 3,
            range: false,
            value: 9.807
        });
        $('#slider-elevation-size').slider({
            id: 'slider-elevation-size-internal',
            ticks: [250, 500, 750, 1000, 2000],
            ticks_positions: [0, 25, 50, 75, 100],
            ticks_labels: ['250', '500', '750', '1000', '2000'],
            orientation: 'horizontal',
            range: false,
            value: 1000
        });
        $('#slider-elevation-resolution').slider({
            id: 'slider-elevation-resolution-internal',
            ticks: [5, 10, 20, 50, 100],
            ticks_positions: [0, 25, 50, 75, 100],
            ticks_labels: ['5', '10', '20', '50', '100'],
            orientation: 'horizontal',
            range: false,
            value: 10
        });

        // Dropdown menu with the preset locations. Zoom to some well known locations.
        $('#dropdown-presets > li > a').click(function () {
            var json = null;
            switch ($(this).attr('data-value')) {
                case 'grand-canyon':
                    json = { 'position': { 'x': -12620333, 'y': 4263711, 'spatialReference': { 'wkid': 102100 }, 'z': 2187 }, 'heading': 291, 'tilt': 73 };
                    break;
                case 'mount-everest':
                    json = { 'position': { 'x': 9696025, 'y': 3248194, 'spatialReference': { 'wkid': 102100 }, 'z': 10974 }, 'heading': 262, 'tilt': 71 };
                    break;
                case 'mount-fuji':
                    json = { 'position': { 'x': 15444069, 'y': 4196595, 'spatialReference': { 'wkid': 102100 }, 'z': 3606 }, 'heading': 357, 'tilt': 82 };
                    break;
                case 'mount-maunganui':
                    json = { 'position': { 'x': 19611065, 'y': -4526026, 'spatialReference': { 'wkid': 102100 }, 'z': 376 }, 'heading': 155, 'tilt': 74 };
                    break;
                case 'mount-saint-helens':
                    json = { 'position': { 'x': -13597464, 'y': 5818940, 'spatialReference': { 'wkid': 102100 }, 'z': 2510 }, 'heading': 215, 'tilt': 77 };
                    break;
                case 'mount-taranaki':
                    json = { 'position': { 'x': 19390388, 'y': -4789123, 'spatialReference': { 'wkid': 102100 }, 'z': 6800 }, 'heading': 331, 'tilt': 73 };
                    break;
                case 'uluru':
                    json = { 'position': { 'x': 14589586, 'y': -2919728, 'spatialReference': { 'wkid': 102100 }, 'z': 1456 }, 'heading': 300, 'tilt': 65 };
                    break;
            }
            if (json === null) { return; }
            _view.set('camera', Camera.fromJSON(json));
        });

        // Toggle button checked status
        $('#buttonShape > button, #buttonColor > button').click(function () {
            $(this).addClass('active').siblings('.active').removeClass('active');
        });

        // Displays or updates the information banner at the bottom of the screen
        function showDelayedBanner(message, delay) {
            if (delay === 0) {
                showBanner(message);
            } else {
                setTimeout(function () { showBanner(message); }, delay);
            }
            function showBanner(message) {
                if ($('#bottom-right-banner-text').html() === message) { return; }
                var DURATION = 500;
                var marginBottom = $('#bottom-right-banner').css('margin-bottom');
                var neg = '-{0}px'.format($('#bottom-right-banner').height());
                if (marginBottom === '0px') {
                    $('#bottom-right-banner').animate({ marginBottom: neg }, DURATION, 'swing', function () {
                        $('#bottom-right-banner-text').html(message);
                        $('#bottom-right-banner').animate({ marginBottom: '0px' }, DURATION, 'swing');
                    });
                } else {
                    $('#bottom-right-banner-text').html(message);
                    $('#bottom-right-banner').animate({ marginBottom: '0px' }, DURATION, 'swing');
                }
            }
        }
        
        function createPhysicsEnvironment(point, gravity, size, separation) {
            var columns = Math.round(size / separation);
            var rows = Math.round(size / separation);

            // Create default material
            _material = new CANNON.Material();

            // Create world
            _world = new CANNON.World();
            //_world.broadphase = new CANNON.NaiveBroadphase();
            _world.gravity.set(0, 0, -gravity);
            _world.addContactMaterial(new CANNON.ContactMaterial(_material, _material, {
                friction: 0.3,   // 0.06,
                restitution: 0.3 // 0.0
            }));

            //
            var matrix = [];
            for (var i = 0; i < columns; i++) {
                var column = [];
                for (var j = 0; j < rows; j++) {
                    var x = point.x + i * separation - (separation * columns / 2);
                    var y = point.y + j * separation - (separation * rows / 2);
                    var p = new Point(x, y, 0, _map.spatialReference);
                    var z = _view.basemapTerrain.getElevation(p);
                    column.push(z);
                }
                matrix.push(column);
            }

            //
            //var verts = [];
            //for (var j = 0; j < rows; j++) {
            //    for (var i = 0; i < columns; i++) {
            //        var x = point.x + i * separation - (separation * columns / 2);
            //        var y = point.y + j * separation - (separation * rows / 2);
            //        var p = new Point(x, y, 0, _map.spatialReference);
            //        var z = _view.basemapTerrain.getElevation(p);
            //        verts.push(x, y, z);
            //    }
            //}
            //var faces = [];
            //for (var j = 0; j < rows - 1; j++) {
            //    for (var i = 0; i < columns -1; i++) {
            //        faces.push(j + 1, j + columns, j);
            //        faces.push(j + 1, j + columns + 1, j + columns);
            //    }
            //}
            
            // Create Surface
            _world.addBody(new CANNON.Body({
                mass: 0,
                material: _material,
                type: CANNON.Body.STATIC,
                shape: new CANNON.Heightfield(matrix, {
                    elementSize: separation
                }),
                //shape: new CANNON.Trimesh(verts, faces),
                position: new CANNON.Vec3(
                    point.x - (separation * columns / 2),
                    point.y - (separation * rows / 2),
                    0
                )
            }));

            // -x
            _world.addBody(new CANNON.Body({
                position: new CANNON.Vec3(point.x + 0 * separation - (separation * columns / 2), 0, 0),
                quaternion: new CANNON.Quaternion(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)),
                shape: new CANNON.Plane(),
                mass: 0,
                material: _material,
                type: CANNON.Body.STATIC
            }));

            // +x
            _world.addBody(new CANNON.Body({
                position: new CANNON.Vec3(point.x + (columns - 1) * separation - (separation * columns / 2), 0, 0),
                quaternion: new CANNON.Quaternion(0, Math.sin(-Math.PI / 4), 0, Math.cos(-Math.PI / 4)),
                shape: new CANNON.Plane(),
                mass: 0,
                material: _material,
                type: CANNON.Body.STATIC
            }));

            // -y
            _world.addBody(new CANNON.Body({
                position: new CANNON.Vec3(0, point.y + 0 * separation - (separation * rows / 2), 0),
                quaternion: new CANNON.Quaternion(Math.sin(-Math.PI / 4), 0, 0, Math.cos(-Math.PI / 4)),
                shape: new CANNON.Plane(),
                mass: 0,
                material: _material,
                type: CANNON.Body.STATIC
            }));

            // +y
            _world.addBody(new CANNON.Body({
                position: new CANNON.Vec3(0, point.y + (rows - 1) * separation - (separation * rows / 2), 0),
                quaternion: new CANNON.Quaternion(Math.sin(Math.PI / 4), 0, 0, Math.cos(Math.PI / 4)),
                shape: new CANNON.Plane(),
                mass: 0,
                material: _material,
                type: CANNON.Body.STATIC
            }));
        }

        function createWebglEnvironment(point, shape, color, size, gap, rows, columns, levels, height) {
            // Disable idle frame refreshes
            _view._stage.setRenderParams({
                idleSuspend: false
            });

            // Get webgl context
            _gl = twgl.getWebGLContext(_view.canvas);

            // Set attribute prefix in vertex shader
            twgl.setAttributePrefix('a_');

            // Create vertex and fragment shader from embedded scripts
            _programInfo = twgl.createProgramInfo(_gl, ['vs', 'fs']);

            //
            var color1 = null;
            var color2 = null;
            switch (color) {
                case 'color1':
                    color1 = [247, 180, 1, 255];
                    color2 = [1, 68, 247, 255];
                    break;
                case 'color2':
                    color1 = [255, 255, 255, 255];
                    color2 = [254, 0, 0, 255];
                    break;
                case 'color3':
                    color1 = [0, 255, 0, 255];
                    color2 = [255, 215, 0, 255];
                    break;
            }

            // Create texture
            var texture = twgl.createTexture(_gl, {
                min: _gl.NEAREST,
                mag: _gl.NEAREST,
                src: [].concat(color1, color2, color2, color1)
            });

            // Set the light source for 10,000m above drop site
            var clone = point.clone();
            clone.z += 10000;
            var light = new Float32Array(3);
            _view.coordinateSystemHelper.pointToEnginePosition(clone, light);

            // Define shader values
            var uniforms = {
                u_lightWorldPos: light,
                u_lightColor: [1, 1, 1, 1],
                u_ambient: [0.2, 0.2, 0.2, 1],
                u_specular: [1, 1, 1, 1],
                u_specularFactor: 0.5,
                u_shininess: 50,
                u_diffuse: texture
            };

            // Create vertex, normal and texture coordinates
            var bufferInfo = null;
            var cannonShape = null;
            switch (shape) {
                case 'box':
                    bufferInfo = twgl.primitives.createCubeBufferInfo(_gl, size);
                    cannonShape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
                    break;
                case 'ball':
                    bufferInfo = twgl.primitives.createSphereBufferInfo(_gl, size / 2, 24, 12);
                    cannonShape = new CANNON.Sphere(size / 2);
                    break;
                case 'barrel':
                    bufferInfo = twgl.primitives.createCylinderBufferInfo(_gl, size / 2, size, 12, 2, true, true);
                    cannonShape = new CANNON.Cylinder(size / 2, size / 2, size, 12);
                    break;
                case 'cone':
                    bufferInfo = twgl.primitives.createTruncatedConeBufferInfo(_gl, size / 2, 0, size, 12, 2, true, true);
                    cannonShape = new CANNON.Cylinder(0, size / 2, size, 12);
                    break;
            }

            // Store draw properties
            _ball = {
                bufferInfo: bufferInfo,
                uniforms: uniforms
            };

            for (var i = 0; i < columns; i++) {
                for (var j = 0; j < rows; j++) {
                    for (var k = 0; k < levels; k++) {
                        var separation = size + gap;
                        var x = point.x + (i * separation) - (columns * separation / 2);
                        var y = point.y + (j * separation) - (rows * separation / 2);
                        var z = point.z + (k * separation) + height;
                        var p = new Point(x, y, z, _map.spatialReference);

                        // Add physics object
                        var body = new CANNON.Body({
                            position: new CANNON.Vec3(x, y, z),
                            mass: 1000,
                            material: _material,
                            shape: cannonShape,
                            type: CANNON.Body.DYNAMIC,
                            linearDamping: 0.01,
                            angularDamping: 0.01,
                            allowSleep: true,
                            sleepSpeedLimit: 0.1,
                            sleepTimeLimit: 1,
                            collisionFilterGroup: 1,
                            collisionFilterMask: 1,
                            fixedRotation: false 
                        });
                        body.map = p;
                        _world.addBody(body);
                    }
                }
            }
        }
        function quaternionToRotationMatrix(q) {
            var te = new Float32Array(16);

            var x = q.x, y = q.y, z = q.z, w = q.w;
            var x2 = x + x, y2 = y + y, z2 = z + z;
            var xx = x * x2, xy = x * y2, xz = x * z2;
            var yy = y * y2, yz = y * z2, zz = z * z2;
            var wx = w * x2, wy = w * y2, wz = w * z2;

            te[0] = 1 - (yy + zz);
            te[4] = xy - wz;
            te[8] = xz + wy;

            te[1] = xy + wz;
            te[5] = 1 - (xx + zz);
            te[9] = yz - wx;

            te[2] = xz - wy;
            te[6] = yz + wx;
            te[10] = 1 - (xx + yy);

            // last column
            te[3] = 0;
            te[7] = 0;
            te[11] = 0;

            // bottom row
            te[12] = 0;
            te[13] = 0;
            te[14] = 0;
            te[15] = 1;

            return te;
        }

        // Format strings
        String.prototype.format = function () {
            var s = this;
            var i = arguments.length;
            while (i--) {
                s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
            }
            return s;
        };

        // Draw loop
        Scheduler.addFrameTask({
            postRender: function (time, deltaTime, timeFromBeginning, spendInFrame) {
                // Exit if not webgl context or no objects addded
                if (_gl === null) { return; }
                if (_world.bodies.length === 0) { return; }
                
                // Increment physics engine
                _world.step(1 / FPS, deltaTime, MAXSUBSTEPS);

                // Get view and projection matrix from Esri camera
                var view = _camera.viewMatrix;
                var projection = _camera.projectionMatrix;

                // Calculate derived matrices
                var viewProjection = twgl.m4.multiply(view, projection);
                var viewInverse = twgl.m4.inverse(view);

                // Assign shader
                _gl.useProgram(_programInfo.program);
                _ball.uniforms.u_viewInverse = viewInverse;

                // Draw every box, ball or barrel
                $.each(_world.bodies, function () {
                    // Only draw dynamic bodies, that is, skip heightfield and walls
                    if (this.type !== CANNON.Body.DYNAMIC) { return true; }

                    // Create Esri point from x,y,z location calculated by Cannon
                    var point = new Point(
                        this.position.x,
                        this.position.y,
                        this.position.z,
                        _map.spatialReference
                    );
                   
                    // Get world transformation from web mercator to webgl
                    var world = new Float32Array(16);
                    _view.coordinateSystemHelper.pointToEngineTransformation(point, world);

                    // Apply body rotation to world transformation
                    twgl.m4.multiply(quaternionToRotationMatrix(this.quaternion), world, world);

                    // Combine rotation and translation
                    var worldInverseTranspose = twgl.m4.transpose(twgl.m4.inverse(world));
                    var worldViewProjection = twgl.m4.multiply(world, viewProjection);

                    // Update shader variables
                    _ball.uniforms.u_world = world;
                    _ball.uniforms.u_worldInverseTranspose = worldInverseTranspose;
                    _ball.uniforms.u_worldViewProjection = worldViewProjection;

                    // Assign vertice buffer and matrices to shader
                    twgl.setBuffersAndAttributes(_gl, _programInfo, _ball.bufferInfo);
                    twgl.setUniforms(_programInfo, _ball.uniforms);

                    // Draw ball
                    _gl.drawElements(_gl.TRIANGLES, _ball.bufferInfo.numElements, _gl.UNSIGNED_SHORT, 0);
                });
            }
        });
    });
});