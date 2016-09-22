define([
    'esri/Camera',
    'esri/core/declare',
    'esri/views/3d/externalRenderers'
], function (
    Camera,
    declare,
    externalRenderers
) {
    // Enforce strict mode
    'use strict';

    // Constants
    var THREE = window.THREE;
    var RADIUS = 6378137;
    var CORE = 1216000;

    var TORUS_TUBE = 300000;
    var TORUS_RADIAL_SEGMENTS = 6;
    var TORUS_TUBE_SEGMENTS = 100;
    var TORUS_COLOR = 0x2194CE;

    var SLICES = 7;
    var LEVELS = [
        { radius: RADIUS * 0.65, color: 0x2194CE, opacity: 0.7 },
        { radius: RADIUS * 1.25, color: 0x2194CE, opacity: 0.5 },
        { radius: RADIUS * 2, color: 0x2194CE, opacity: 0.3 },
        { radius: RADIUS * 3, color: 0x2194CE, opacity: 0.1 }
    ];

    return declare([], {
        constructor: function (view, long, lat, alt) {
            this.view = view;
            this.long = long;
            this.lat = lat;
            this.alt = alt;
        },
        setup: function (context) {
            // Create the THREE.js webgl renderer
            this.renderer = new THREE.WebGLRenderer({
                context: context.gl
            });

            // Make sure it does not clear anything before rendering
            this.renderer.autoClear = false;
            this.renderer.autoClearDepth = false;
            this.renderer.autoClearColor = false;
            this.renderer.autoClearStencil = false;
            
            //
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera();

            // Create lights that will resemble the sun light lighting that we do internally
            this._createLights();

            // Create objects and add them to the scene
            this._createObjects();

            // Set starting geometries
            this._updateObjects();
        },
        render: function (context) {
            // Make sure to reset the internal THREE.js state
            this.renderer.resetGLState();

            // Update the THREE.js camera so it's synchronized to our camera
            this._updateCamera(context);

            // Update the THREE.js lights so it's synchronized to our light
            this._updateLights(context);

            // Advance current geometry
            this._updateObjects(context);

            // Render the scene
            this.renderer.render(this.scene, this.camera);

            // Immediately request a new redraw
            externalRenderers.requestRender(this.view);
        },
        dispose: function (content) { },
        _createLights: function () {
            // Create both a directional light, as well as an ambient light
            this.directionalLight = new THREE.DirectionalLight();
            this.scene.add(this.directionalLight);

            this.ambientLight = new THREE.AmbientLight();
            this.scene.add(this.ambientLight);
        },
        _createObjects: function () {
            //
            var scope = this;

            // Geographic pole
            var g1 = new THREE.CylinderBufferGeometry(200000, 200000, RADIUS * 8, 8, 1);
            g1.rotateX(Math.PI / 2);
            var m1 = new THREE.MeshPhongMaterial({
                color: new THREE.Color(0xffffff),
                shininess: 70,
                transparent: true,
                opacity: 1
            });
            scope.scene.add(new THREE.Mesh(g1, m1));

            // Magnetic Pole
            var g = new THREE.CylinderBufferGeometry(200000, 200000, RADIUS * 8, 8, 1);
            g.rotateX(Math.PI / 2);
            g.rotateY((90 - 80.31) * Math.PI / 180);
            g.rotateZ(-72.62 * Math.PI / 180);
            var m = new THREE.MeshPhongMaterial({
                color: new THREE.Color(0xff0000),
                shininess: 70,
                transparent: true,
                opacity: 1
            });
            scope.scene.add(new THREE.Mesh(g, m));
            
            // Add magnetic waves
            LEVELS.forEach(function (level) {
                for (var i = 0; i < SLICES; i++) {
                    var rotation = (i / SLICES) * (2 * Math.PI);
                    var material = new THREE.MeshPhongMaterial({
                        color: level.color,
                        shininess: 70,
                        transparent: true,
                        opacity: level.opacity
                    });

                    var geometry = new THREE.TorusBufferGeometry(
                        level.radius,
                        TORUS_TUBE,
                        TORUS_RADIAL_SEGMENTS,
                        TORUS_TUBE_SEGMENTS
                    );
                    
                    var offset = Math.sqrt(Math.pow(level.radius, 2) - Math.pow(CORE, 2));

                    geometry.translate(0, offset, 0);
                    geometry.rotateY(Math.PI / 2);
                    geometry.rotateZ(rotation);
                    geometry.rotateY((90 - 80.31) * Math.PI / 180);
                    geometry.rotateZ(-72.62 * Math.PI / 180);

                    var torus = new THREE.Mesh(geometry, material);

                    scope.scene.add(torus);
                }
            });
        },
        _updateCamera: function (context) {
            // Get Esri's camera
            var c = context.camera;

            // Update three.js camera
            this.camera.projectionMatrix.fromArray(c.projectionMatrix);
            this.camera.position.set(c.eye[0], c.eye[1], c.eye[2]);
            this.camera.up.set(c.up[0], c.up[1], c.up[2]);
            this.camera.lookAt(new THREE.Vector3(c.center[0], c.center[1], c.center[2]));
        },
        _updateLights: function (context) {
            // Get Esri's current sun settings
            var direction = context.sunLight.direction;
            var diffuse = context.sunLight.diffuse;

            // Update the directional light color, intensity and position
            this.directionalLight.color.setRGB(diffuse.color[0], diffuse.color[1], diffuse.color[2]);
            this.directionalLight.intensity = diffuse.intensity;
            this.directionalLight.position.set(direction[0], direction[1], direction[2]);

            // Update the ambient light color and intensity
            var ambient = context.sunLight.ambient;
            this.ambientLight.color.setRGB(ambient.color[0], ambient.color[1], ambient.color[2]);
            this.ambientLight.intensity = ambient.intensity;
        },
        _updateObjects: function (context) {
            this.long += 0.1;
            if (this.long >= 180) {
                this.long = -180;
            }
            this.view.set('camera', Camera.fromJSON({
                'position': {
                    'x': this.long,
                    'y': this.lat,
                    'spatialReference': {
                        'wkid': 4326
                    },
                    'z': this.alt
                }
            }));
        }
    });
});