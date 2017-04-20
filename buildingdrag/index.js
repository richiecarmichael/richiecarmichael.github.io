/* ------------------------------------------------------------

   Copyright 2017 Esri

   Licensed under the Apache License, Version 2.0 (the 'License');
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at:
   http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an 'AS IS' BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

--------------------------------------------------------------- */

require([
    "esri/Map",
    "esri/views/SceneView",
    "esri/views/3d/input/handlers/MouseWheelZoom",
    "esri/views/3d/input/handlers/DoubleClickZoom",
    "esri/views/3d/input/handlers/DragPan",
    "esri/views/3d/input/handlers/DragRotate",
    "esri/symbols/PointSymbol3D",
    "esri/symbols/ObjectSymbol3DLayer",
    "esri/layers/GraphicsLayer",
    "esri/Graphic",
    "esri/geometry/Point",
    "esri/geometry/SpatialReference",
    "esri/geometry/ScreenPoint",
    "dojo/on",
    "dojo/domReady!"
], function (
    Map,
    SceneView,
    MouseWheelZoom,
    DoubleClickZoom,
    DragPan,
    DragRotate,
    PointSymbol3D,
    ObjectSymbol3DLayer,
    GraphicsLayer,
    Graphic,
    Point,
    SpatialReference,
    ScreenPoint,
    on
) {
        // The height of all floors (in meters).
        var FLOOR_HEIGHT = 10;

        // The desired framerate. Used to ignore superfluous drag events.
        var FRAMERATE = 60;

        // Sample data. Three buildings of varying size and location.
        var DATA = [
            {
                x: -8754144,
                y: 4269503,
                name: "building1",
                floors: 5,
                width: 65,
                depth: 50
            }, {
                x: -8754057,
                y: 4269507,
                name: "building2",
                floors: 3,
                width: 60,
                depth: 100
            }, {
                x: -8754160,
                y: 4269570,
                name: "building3",
                floors: 7,
                width: 30,
                depth: 20
            }
        ];
        var _data = [];
        var _drag = null;
        var _last = Date.now();

        // Create an item for each floor for each building.
        // Ultimately each item in the array will be used to create a graphic.
        DATA.forEach(function (e) {
            for (var i = 0; i < e.floors; i++) {
                _data.push({
                    x: e.x,
                    y: e.y,
                    z: i * FLOOR_HEIGHT,
                    w: e.width,
                    d: e.depth,
                    name: e.name
                });
            }
        });

        // Create the SceneView and Map. Initialize the camera to face the three buildings.
        var _view = new SceneView({
            container: "map",
            camera: {
                heading: 0,
                position: {
                    x: -8754106,
                    y: 4268774,
                    z: 574,
                    spatialReference: {
                        wkid: 102100
                    }
                },
                tilt: 46
            },
            map: new Map({
                basemap: "dark-gray",
                layers: [
                    new GraphicsLayer({
                        id: "buildings",
                        elevationInfo: {
                            // Buildings will float on the ground.
                            mode: "relative-to-ground"
                        }
                    })
                ]
            })
        });
        _view.then(function () {
            // As soon as the view is created, load the building floors.
            loadAll();
        });

        // Define function to be called by the sceneview drag event.
        var _ondrag = function (e) {
            switch (e.action) {
                case "start":
                    var s = new ScreenPoint({
                        x: e.x,
                        y: e.y
                    });
                    _view.hitTest(s).then(function (p) {
                        // Find the picked buidling floor. Exit if nothing found.
                        if (!p || !p.results || p.results.length === 0) { return; }
                        var graphic = p.results[0].graphic;
                        if (!graphic) { return; }
                        if (!graphic.geometry) { return; }

                        // Store the name of the building.
                        // Tag all floors from the same building.
                        _drag = {
                            name: graphic.attributes.name,
                            dx: 0,
                            dy: 0
                        };
                        _data.forEach(function (d) {
                            d.selected = d.name === graphic.attributes.name;
                        });

                        // Disable sceneview navigation.
                        if (_view.inputManager.viewEvents.inputManager.hasHandlers("navigation")) {
                            _view.inputManager.viewEvents.inputManager.uninstallHandlers("navigation");
                        }

                        // Show selected floors.
                        updateSelection();
                    });
                    break;
                case "update":
                    // Ignore this drag event if desired framerate already achieved.
                    if (!_drag) { return; }
                    var now = Date.now();
                    if (now - _last < 1000 / FRAMERATE) { return; }
                    _last = now;

                    // Use internal method to convert mouse drag origin and current mouse location
                    // to map coordinates. Store map distance delta.
                    var h = e.native.target.height;
                    var s1 = _view._stage.pick([e.origin.x, h - e.origin.y], [], false);
                    var s2 = _view._stage.pick([e.x, h - e.y], [], false);
                    var r1 = _view._computeMapPointFromIntersectionResult.call(_view, s1.minResult);
                    var r2 = _view._computeMapPointFromIntersectionResult.call(_view, s2.minResult);
                    if (!r1 || !r2) { return; }
                    _drag.dx = r2.x - r1.x;
                    _drag.dy = r2.y - r1.y;

                    // Update selected building floors. This will apply the deltas created above.
                    updateSelection();
                    break;
                case "end":
                    if (!_drag) { return; }

                    // Permanently update the location of dragged building floors.
                    _data.filter(function (e) {
                        return e.name === _drag.name;
                    }).forEach(function (d) {
                        d.x += _drag.dx;
                        d.y += _drag.dy;
                    });
                    _drag = null;

                    // Restore sceneview interaction to default mouse/pointer behaviour.
                    _view.inputManager.viewEvents.inputManager.installHandlers("navigation", [
                        new MouseWheelZoom.MouseWheelZoom(_view),
                        new DoubleClickZoom.DoubleClickZoom(_view),
                        new DragPan.DragPan(_view, "primary"),
                        new DragRotate.DragRotate(_view, "secondary")
                    ]);

                    // Reassociate this drag function with the sceneview drag event.
                    _view.on("drag", _ondrag);

                    // Recreate all building floor graphics.
                    loadAll();
                    break;
            }
        };

        // Define function to call when the drag event is fired.
        _view.on("drag", _ondrag);

        // 
        function loadAll() {
            // Removal all buildings from the graphics layer and then re-add them.
            _view.map.findLayerById("buildings").removeAll();
            _view.map.findLayerById("buildings").addMany(
                _data.map(function (e) {
                    // Map the array of floor items to graphics.
                    return new Graphic({
                        geometry: new Point({
                            x: e.x,
                            y: e.y,
                            z: e.z,
                            spatialReference: SpatialReference.WebMercator
                        }),
                        attributes: {
                            // The building name is associated with each building floor.
                            name: e.name
                        },
                        symbol: new PointSymbol3D({
                            symbolLayers: [new ObjectSymbol3DLayer({
                                anchor: "bottom",
                                width: e.w,
                                depth: e.d,
                                height: FLOOR_HEIGHT,
                                resource: {
                                    primitive: "cube"
                                },
                                material: {
                                    // All buildings are rendered as a semi-transparent blue boxes.
                                    color: [0, 0, 255, 0.7]
                                }
                            })]
                        })
                    })
                })
            );
        }

        // Called on the drag update to refresh the location of a dragged building (i.e. floors).
        function updateSelection() {
            // Remove building floors that are named in the drag object.
            _view.map.findLayerById("buildings").removeMany(
                _view.map.findLayerById("buildings").graphics.filter(function (e) {
                    return e.attributes.name === _drag.name
                }).toArray()
            );

            // Re-add building floors that are named in the drag object.
            _view.map.findLayerById("buildings").addMany(
                _data.filter(function (e) {
                    return e.name === _drag.name;
                }).map(function (e) {
                    return new Graphic({
                        // Apply the horizontal deltas to dragged building floors.
                        geometry: new Point({
                            x: e.x + _drag.dx,
                            y: e.y + _drag.dy,
                            z: e.z,
                            spatialReference: SpatialReference.WebMercator
                        }),
                        attributes: {
                            // Don't forget to re-associated the building name to the floor.
                            name: e.name
                        },
                        symbol: new PointSymbol3D({
                            symbolLayers: [new ObjectSymbol3DLayer({
                                anchor: "bottom",
                                width: e.w,
                                depth: e.d,
                                height: FLOOR_HEIGHT,
                                resource: {
                                    primitive: "cube"
                                },
                                material: {
                                    // Dragged buildings will be colored a semi-transparent cyan.
                                    color: [0, 255, 255, 0.7]
                                }
                            })]
                        })
                    })
                })
            );
        }
    });