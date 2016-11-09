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

    return declare([], {
        constructor: function (view) {
            this.view = view;
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
        },
        dispose: function (content) { },
        _createLights: function () {
            // Add ambient light
            this.scene.add(new THREE.AmbientLight(0x404040, 1));

            // Add directional light
            var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
            directionalLight.position.set(1, 0, 0);
            this.scene.add(directionalLight);
        },
        _createObjects: function () {
            // Geographic pole
            var g1 = new THREE.CylinderBufferGeometry(100000, 100000, RADIUS * 6, 8, 1);
            g1.rotateX(Math.PI / 2);
            var m1 = new THREE.MeshPhongMaterial({
                color: new THREE.Color(0xffffff)
            });
            this.scene.add(new THREE.Mesh(g1, m1));

            // Magnetic Pole
            var g2 = new THREE.CylinderBufferGeometry(100000, 100000, RADIUS * 6, 8, 1);
            g2.rotateX(Math.PI / 2);
            g2.rotateY(9.63 * Math.PI / 180);
            g2.rotateZ(-72.62 * Math.PI / 180);
            var m2 = new THREE.MeshPhongMaterial({
                color: new THREE.Color(0xff0000)
            });
            this.scene.add(new THREE.Mesh(g2, m2));

            // Aurora - material
            var m3 = new THREE.MeshBasicMaterial({
                side: THREE.DoubleSide,
                transparent: true,
                map: new THREE.TextureLoader().load('img/aurora-blur.png')
            });

            // Aurora - geometry (outer)
            var height = RADIUS * 1.2;
            var g3 = new THREE.ConeBufferGeometry(
                RADIUS / 2,  // radius
                height,      // height
                100,         // radius segments
                1,           // height segments
                true         // open ended
            );
            g3.translate(0, -height / 2, 0); 
            g3.rotateZ(Math.PI / 2);  // Move to 0°,0°

            // Aurora - geometry (inner)
            var g4 = new THREE.ConeBufferGeometry(
                RADIUS / 3,  // radius
                height,      // height
                100,         // radius segments
                1,           // height segments
                true         // open ended
            );
            g4.translate(0, -height / 2, 0);
            g4.rotateZ(Math.PI / 2);  // Move to 0°,0°

            // Aurora - north
            var north1 = g3.clone();
            north1.rotateY(-80.37 * Math.PI / 180); // Apply lattitude
            north1.rotateZ(-72.62 * Math.PI / 180); // Apply longitude
            this.scene.add(new THREE.Mesh(north1, m3));

            var north2 = g4.clone();
            north2.rotateY(-80.37 * Math.PI / 180); // Apply lattitude
            north2.rotateZ(-72.62 * Math.PI / 180); // Apply longitude
            this.scene.add(new THREE.Mesh(north2, m3));

            // Aurora - north
            var south1 = g3.clone();
            south1.rotateY(80.37 * Math.PI / 180); // Apply lattitude
            south1.rotateZ(107.4 * Math.PI / 180); // Apply longitude
            this.scene.add(new THREE.Mesh(south1, m3));

            var south2 = g4.clone();
            south2.rotateY(80.37 * Math.PI / 180); // Apply lattitude
            south2.rotateZ(107.4 * Math.PI / 180); // Apply longitude
            this.scene.add(new THREE.Mesh(south2, m3));
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
        _updateLights: function (context) { },
        _updateObjects: function (context) { }
    });
});