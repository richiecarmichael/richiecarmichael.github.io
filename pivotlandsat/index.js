/* ------------------------------------------------------------

   Copyright 2016 Esri

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at:
   http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

--------------------------------------------------------------- */

require([
        'esri/renderers/SimpleRenderer',
        'esri/symbols/SimpleFillSymbol',
        'esri/symbols/SimpleLineSymbol',
        'esri/layers/ArcGISImageServiceLayer',
        'esri/layers/GraphicsLayer',
        'esri/layers/ImageServiceParameters',
        'esri/geometry/Extent',
        'esri/graphic',
        'esri/tasks/query',
        'esri/tasks/QueryTask',
        'esri/toolbars/draw',
        'esri/Color',
        'esri/map',
        'dojo/domReady!'
], function (
        SimpleRenderer,
        SimpleFillSymbol,
        SimpleLineSymbol,
        ArcGISImageServiceLayer,
        GraphicsLayer,
        ImageServiceParameters,
        Extent,
        Graphic,
        Query,
        QueryTask,
        Draw,
        Color,
        Map) {
    $(document).ready(function () {
        String.prototype.format = function () {
            var s = this;
            var i = arguments.length;
            while (i--) {
                s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
            }
            return s;
        };

        // Constants
        var MAX = 4000;

        // -------------------------
        // ESRI NATURECOLOR LANDSAT
        // -------------------------
        //var URL = "http://imagery.arcgisonline.com/arcgis/rest/services/LandsatGLS/NaturalColor/ImageServer";
        //var FIELD_DATE = 'AcquisitionDate';
        //var FIELD_NAME = 'Name';
        //var FIELD_SENSOR = 'SensorName';
        //var FIELD_SUNAZIMUTH = 'SunAzimuth';
        //var FIELD_SUNELEVATION = 'SunElevation';
        //var FIELD_CLOUDCOVER = 'CloudCover';

        // -------------------------
        // USGS LANDSAT ARCHIVE 
        // -------------------------
        var URL = "https://landsatlook.usgs.gov/arcgis/rest/services/LandsatLook/ImageServer";
        var FIELD_DATE = 'acquisitionDate';
        var FIELD_NAME = 'Name';
        var FIELD_SENSOR = 'sensor';
        var FIELD_SUNAZIMUTH = 'sunAzimuth';
        var FIELD_SUNELEVATION = 'sunElevation';
        var FIELD_CLOUDCOVER = 'cloudCover';

        // Clear images
        $('#buttonClear').click(function (e) {
            map.getLayer('footprints').clear();
            updateUserInterface();
        });

        // Back button
        $('#buttonBack').hide();
        $('#buttonBack').click(function (e) {
            map.getLayer('footprints').clear();
            updateUserInterface();

            $('#pivotviewer').remove();
            $('#page').animate({
                left: '100%'
            },
            300,
            'swing',
            function () {
                $('#buttonBack').hide();
            });
        });

        // Start pivot
        $('#buttonPivot').click(function (e) {
            $('#page').animate({
                left: '0%'
            },
            300,
            'swing',
            function () {
                $('#buttonBack').show();
                $(document.createElement('div')).attr('id', 'pivotviewer').appendTo('#page');
                loadPivotViewer();
            });
        });

        // Create map
        var map = new Map('map', {
            basemap: 'topo'
        });
        map.on('load', function () {
            var id = map.layerIds[0];
            var layer = map.getLayer(id);
            var extent = layer.fullExtent;
            var ratioMap = map.height / map.width;
            var ratioLay = extent.getHeight() / extent.getWidth();
            map.setExtent(new Extent(
                (ratioMap < ratioLay) ? extent.xmin : extent.getCenter().x - 0.5 * extent.getHeight() / ratioMap,
                (ratioMap < ratioLay) ? extent.getCenter().y - 0.5 * ratioMap * extent.getWidth() : extent.ymin,
                (ratioMap < ratioLay) ? extent.xmax : extent.getCenter().x + 0.5 * extent.getHeight() / ratioMap,
                (ratioMap < ratioLay) ? extent.getCenter().y + 0.5 * ratioMap * extent.getWidth() : extent.ymax,
                map.spatialReference
            ));
            updateUserInterface();
        })

        //
        updateUserInterface();

        // Add image layer
        var isp = new ImageServiceParameters();
        isp.format = "jpgpng";
        map.addLayer(new ArcGISImageServiceLayer(URL, {
            id: 'landsat',
            imageServiceParameters: isp
        }));

        // Add graphics layer
        map.addLayer(new GraphicsLayer({
            id: 'footprints'
        }));
        map.getLayer('footprints').setRenderer(
            new SimpleRenderer(
                new SimpleFillSymbol(
                    SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(
                        SimpleLineSymbol.STYLE_SOLID,
                        Color.fromArray([255, 0, 0, 1]),
                        0.5
                    ),
                    Color.fromArray([255, 0, 0, 0.01])
                )
            )
        );

        // About button
        var CLOSE = 'close';
        var ABOUT = 'about';
        $('#buttonAbout').html(ABOUT);
        $('#buttonAbout').click(function (e) {
            switch ($('#buttonAbout').html()) {
                case ABOUT:
                    $('#about').animate({
                        marginTop: '0px'
                    },
                    300,
                    'swing',
                    function () {
                        $('#buttonAbout').html(CLOSE);
                    });
                    break;
                case CLOSE:
                    $('#about').animate({
                        marginTop: '-540px'
                    },
                    300,
                    'swing',
                    function () {
                        $('#buttonAbout').html(ABOUT);
                    });
                    break;
            }

        });

        // Select images
        $('#buttonDraw').click(function (e) {
            var draw = new Draw(map, {
                showTooltips: false,
                drawTime: 90
            });
            draw.activate(Draw.EXTENT);
            draw.on("draw-end", function (a) {
                draw.deactivate();
                var query = new Query();
                query.returnGeometry = true;
                query.outFields = [FIELD_DATE, FIELD_NAME, FIELD_SENSOR, FIELD_SUNAZIMUTH, FIELD_SUNELEVATION, FIELD_CLOUDCOVER];
                query.outSpatialReference = map.spatialReference;
                query.where = "Category = 1";
                query.geometry = a.geometry;
                var queryTask = new QueryTask(URL);
                queryTask.on("complete", function (o) {
                    if (o.featureSet.features.length == 0) {
                        $('#description').html('Nothing found. Please try again.');
                        return;
                    }
                    $('#imagecount').html(
                        '{0} raster scenes found. Click clear to start over or pivot to view and sort scenes.'.format(o.featureSet.features.length)
                    );
                    $.each(o.featureSet.features, function (i, v) {
                        map.getLayer('footprints').add(v);
                    });
                    updateUserInterface();
                });
                queryTask.execute(query);
            });
        });

        // Update buttons
        function updateUserInterface() {
            if (!map.loaded) {
                $('#container1').hide();
                $('#container2').hide();
                return;
            }
            var count = map.getLayer('footprints').graphics.length;
            if (count == 0) {
                $('#container1').show();
                $('#container2').hide();
            }
            else {
                $('#container1').hide();
                $('#container2').show();
            }
        }

        // Create image wrapper
        function createImageUrl(g, id, size) {
            var url = URL + '/{0}/image'.format(id.toString());
            url += '?bbox={0},{1},{2},{3}'.format(
                g.geometry.getExtent().xmin.toString(),
                g.geometry.getExtent().ymin.toString(),
                g.geometry.getExtent().xmax.toString(),
                g.geometry.getExtent().ymax.toString()
            );
            url += '&size={0},{1}'.format(size.toString(), size.toString());
            url += '&format={0}'.format('jpg');
            url += '&noData={0},{1},{2}'.format('255', '255', '255');
            url += '&interpolation={0}'.format('RSP_NearestNeighbor');
            url += '&imageSR={0}'.format(g.geometry.spatialReference.wkid.toString());
            url += '&bboxSR={0}'.format(g.geometry.spatialReference.wkid.toString());
            url += '&f={0}'.format('image');
            return {
                url: url,
                requested: false,
                image: null
            };
        }

        // Load pivot viewer
        function loadPivotViewer() {
            var graphics = map.getLayer('footprints').graphics;

            // Json loader
            var ImageLoader = PivotViewer.Models.Loaders.ICollectionLoader.subClass({
                init: function (graphics) {
                    this.graphics = graphics;
                },
                LoadCollection: function (collection) {
                    // Esri logo
                    collection.BrandImage = 'content/images/esri-white.jpg';

                    //--------------------------------------------------------------------------------
                    // Name, SortOrder?, Type, IsFilterVisible, IsMetaDataVisible, IsWordWheelVisible
                    //
                    // IsFilterVisible: If false, not present in filter panel or sorting dropdown
                    // IsMetaDataVisible: If false, not visible in details panel
                    // IsWordWheelVisible: Unknown
                    collection.FacetCategories.push(new PivotViewer.Models.FacetCategory('Id', '', 'String', false, true, true));
                    collection.FacetCategories.push(new PivotViewer.Models.FacetCategory('AcquisitionDate', '', 'DateTime', true, true, true));
                    collection.FacetCategories.push(new PivotViewer.Models.FacetCategory('Name', '', 'String', true, false, true));
                    collection.FacetCategories.push(new PivotViewer.Models.FacetCategory('SensorName', '', 'String', true, true, true));
                    collection.FacetCategories.push(new PivotViewer.Models.FacetCategory('SunAzimuth', '', 'Number', true, true, true));
                    collection.FacetCategories.push(new PivotViewer.Models.FacetCategory('SunElevation', '', 'Number', true, true, true));
                    collection.FacetCategories.push(new PivotViewer.Models.FacetCategory('CloudCover', '', 'Number', true, true, true));

                    var field_oid = map.getLayer('landsat').objectIdField;

                    $.each(this.graphics, function (i, g) {
                        var id = g.attributes[field_oid];
                        var ad = g.attributes[FIELD_DATE];
                        var na = g.attributes[FIELD_NAME];
                        var sn = g.attributes[FIELD_SENSOR];
                        var sa = g.attributes[FIELD_SUNAZIMUTH];
                        var se = g.attributes[FIELD_SUNELEVATION];
                        var cc = g.attributes[FIELD_CLOUDCOVER];

                        var hr = URL + '/{0}'.format(id.toString());
                        var ad2 = (ad == null) ? new Date(1970, 1, 1) : new Date(ad);
                        var na2 = (na == null) ? '' : na;
                        var sn2 = (sn == null) ? '' : sn;
                        var sa2 = (sa == null) ? 0 : sa;
                        var se2 = (se == null) ? 0 : se;
                        var cc2 = (cc == null) ? 0 : cc;
                       
                        var item = new PivotViewer.Models.Item(
                            i,  // Lobster id
                            id, // Id
                            hr, // Href
                            na  // Name
                        );
                        item.LobsterId = i;
                        item.Description = createImageUrl(g, id, 2000).url;
                        item.AddFacetValue('Id', new PivotViewer.Models.FacetValue(id));
                        item.AddFacetValue('AcquisitionDate', new PivotViewer.Models.FacetValue(ad2));
                        item.AddFacetValue('Name', new PivotViewer.Models.FacetValue(na2));
                        item.AddFacetValue('SensorName', new PivotViewer.Models.FacetValue(sn2));
                        item.AddFacetValue('SunAzimuth', new PivotViewer.Models.FacetValue(sa2));
                        item.AddFacetValue('SunElevation', new PivotViewer.Models.FacetValue(se2));
                        item.AddFacetValue('CloudCover', new PivotViewer.Models.FacetValue(cc2));
                        item.images = [
                            createImageUrl(g, id, 200),
                            createImageUrl(g, id, 1000)
                        ];
                        collection.Items.push(item);

                        if (i >= MAX) { return false; }
                    });

                    $.publish("/PivotViewer/Models/Collection/Loaded", null);
                }
            });

            // Image loader
            var ImageController = PivotViewer.Views.IImageController.subClass({
                init: function (baseContentPath) { },
                Setup: function (basePath) {
                    $.publish("/PivotViewer/ImageController/Collection/Loaded", null);
                },
                GetImagesAtLevel: function (item, level) {
                    return function (facetItem, context, x, y, width, height) {
                        var date = facetItem.Facets["AcquisitionDate"][0].Value;
                        var year = date.getFullYear();
                        var color = '#000000'; // Black
                        if (year < 1980) {
                            color = '#0000FF';
                        }
                        else if (year < 1990) {
                            color = '#A52A2A';
                        }
                        else if (year < 2000) {
                            color = '#808080';
                        }
                        else if (year < 2010) {
                            color = '#FF00FF';
                        }
                        else if (year < 2020) {
                            color = '#FFA500';
                        }

                        // Draw fill
                        context.beginPath();
                        context.fillStyle = color;
                        context.fillRect(x, y, width, height);
                        context.closePath();

                        // Draw text
                        context.font = "32px Verdana";
                        var yearString1 = year.toString();
                        var measure = context.measureText(yearString1);
                        var tw = measure.width;
                        if (tw < (0.7 * width)) {
                            var tx = x + width / 2;
                            var ty = y + height / 2;
                            context.fillStyle = 'rgba(255, 255, 255, 0.30)';
                            context.textBaseline = "middle";
                            context.textAlign = "center";
                            context.fillText(yearString1, tx, ty);
                        }

                        // Draw image
                        var im = null;
                        if (width < 200) { }
                        else if (width < 500) {
                            // 500px image
                            drawScaledImage(item.images[0]);
                        }
                        else {
                            // 1000px image
                            drawScaledImage(item.images[0]);
                            drawScaledImage(item.images[1]);
                        }

                        function drawScaledImage(im) {
                            if (!im.image) {
                                if (!im.requested) {
                                    im.requested = true;
                                    var image = new Image();
                                    image.onload = function () {
                                        im.image = image;
                                        im.requested = false;
                                        $.publish("/PivotViewer/Views/Tile/Update/" + item.LobsterId, null)
                                    };
                                    image.crossOrigin = 'anonymous';
                                    image.src = im.url;
                                }
                            }
                            else {
                                context.drawImage(im.image, x, y, width, height);
                            }
                        }
                    }
                },
                Width: 100,
                Height: 100
            });

            //
            $('#pivotviewer').PivotViewer({
                // Json loader.
                Loader: new ImageLoader(graphics),
                // Image loader.
                ImageController: new ImageController("content"),
                // Turning AnimateBlank on can help with performance.
                AnimateBlank: false,
                // $view$=2 tells the initial view to be the GraphView. $facet0$ selects which facet should be shown at first
                ViewerState: "$view$=1&$facet0$=AcquisitionDate",
                // A "long-click" can allow items to be 'selected'. If you don't want this functionality, set this property to falsee.
                AllowItemsCheck: true,
                // To turn off the ability to copy data to the clipboard, set this property to false.
                CopyToClipboard: false,
                // To remove the feedback button, set this to false.
                DisplayFeedback: false,
                // The Helper level defines when images should all be loaded independently, rather than using 'collages' as generated in many Deep Zoom collections.
                ZoomHelperMaxLevel: 7,
                // The date format can be set here too.
                DateFormat: "dd/mm/yy"
            });
        }
    });
});
