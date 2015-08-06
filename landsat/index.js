/* -----------------------------------------------------------------------------------
   Map Lens
   Developed by the Applications Prototype Lab
   (c) 2015 Esri | http://www.esri.com/legal/software-license
----------------------------------------------------------------------------------- */

require([
    'esri/map',
    'esri/layers/ArcGISImageServiceLayer',
    'esri/layers/RasterFunction',
    'esri/geometry/Extent',
    'esri/geometry/ScreenPoint',
    'esri/urlUtils',
    'dojo/domReady!'
],
function (
    Map,
    ArcGISImageServiceLayer,
    RasterFunction,
    Extent,
    ScreenPoint,
    urlUtils
    ) {
    $(document).ready(function () {
        'use strict';

        // Constants
        var SVGNS = 'http://www.w3.org/2000/svg';
        var PROXY = 'http://maps.esri.com/rc/landsat/proxy.ashx';
        var SIZE = 250;
        var RANDOMNESS = 300;
        var PREVIEW = 'http://landsat.arcgis.com/arcgis/rest/services/Landsat8_Views/ImageServer';

        // Six landsat image services hosted by Esri. A button will be addded to the screen for each service.
        var IMAGES = [
            {
                id: 1975,
                name: '1975',
                url: 'http://imagery.arcgisonline.com/arcgis/rest/services/LandsatGLS/GLS1975_Enhanced/ImageServer',
                color: 'red'
            },
            {
                id: 1990,
                name: '1990',
                url: 'http://imagery.arcgisonline.com/arcgis/rest/services/LandsatGLS/GLS1990_Enhanced/ImageServer',
                color: 'gold'
            },
            {
                id: 2000,
                name: '2000',
                url: 'http://imagery.arcgisonline.com/arcgis/rest/services/LandsatGLS/GLS2000_Enhanced/ImageServer',
                color: 'green'
            },
            {
                id: 2005,
                name: '2005',
                url: 'http://imagery.arcgisonline.com/arcgis/rest/services/LandsatGLS/GLS2005_Enhanced/ImageServer',
                color: 'gray'
            },
            {
                id: 2010,
                name: '2010',
                url: 'http://imagery.arcgisonline.com/arcgis/rest/services/LandsatGLS/GLS2010_Enhanced/ImageServer',
                color: 'purple'
            },
            {
                id: 2015,
                name: 'Today',
                url: 'http://landsat.arcgis.com/arcgis/rest/services/Landsat8_PanSharpened/ImageServer',
                color: 'cyan'
            }
        ];

        // Below is a list of present area's of interest. This list was inspired by:
        // http://earthobservatory.nasa.gov/Features/WorldOfChange/
        var BOOKMARKS = [
            {
                name: 'Palm Jebel Ali',
                box: [6108081, 2864714, 6137013, 2888257]
            },
            {
                name: 'Las Vegas',
                box: [-12845948, 4302382, -12788085, 4347098]
            },
            {
                name: 'Water Level in Lake Powell',
                box: [-12443536, 4405304, -12327810, 4499474]
            },
            {
                name: 'Mount Saint Helens',
                box: [-13608687, 5807163, -13594222, 5818342]
            },
            {
                name: 'Growing Deltas in Atchafalaya Bay',
                box: [-10200228, 3412905, -10142366, 3459990]
            },
            {
                name: 'Columbia Glacier, Alaska',
                box: [-16428273, 8609915, -16312547, 8704086]
            },
            {
                name: 'Cape Cod',
                box: [-7796340, 5100238, -7781875, 5112009]
            },
            {
                name: 'Shrinking Aral Sea',
                box: [6391083, 5442255, 6853985, 5818936]
            },
            {
                name: 'Yellow River Delta',
                box: [13231089, 4522106, 13288952, 4569192]
            }
        ];

        // Disable pan and zoom inertia
        esriConfig.defaults.map.panDuration = 0;
        esriConfig.defaults.map.zoomDuration = 1;

        // Create basic map with gray basemap
        var _map = new Map('map', {
            basemap: 'osm',
            logo: false,
            extent: new Extent({
                // At startup, zoom to the 'Palm Jebel Ali' in Dubai.
                xmin: BOOKMARKS[0].box[0],
                ymin: BOOKMARKS[0].box[1],
                xmax: BOOKMARKS[0].box[2],
                ymax: BOOKMARKS[0].box[3],
                spatialReference: {
                    wkid: 102100
                }
            })
        });

        // Inidicate usage of proxy for the following hosted map services
        $.each([PREVIEW, IMAGES[5].url], function () {
            urlUtils.addProxyRule({
                urlPrefix: this,
                proxyUrl: PROXY
            });
        });

        var preview = new ArcGISImageServiceLayer(PREVIEW);
        preview.setRenderingRule(new RasterFunction({
            rasterFunction: 'Agriculture with DRA'
        }));

        // Add bookmark images
        $.each(BOOKMARKS, function () {
            //<div class='rc-thumbnail'>
            //    <div class='rc-full-relative'>
            //        <div class='rc-thumbnail-image'></div>
            //        <div class='rc-thumbnail-caption'>
            //            <div class='rc-thumbnail-caption-text'>Growing Deltas in Atchafalaya Bay</div>
            //        </div>
            //    </div>
            //</div>
            var extent = new Extent({
                xmin: this.box[0],
                ymin: this.box[1],
                xmax: this.box[2],
                ymax: this.box[3],
                spatialReference: {
                    wkid: 102100
                }
            });

            $('#bottom-left').append(
                $(document.createElement('div'))
                    .addClass('rc-thumbnail')
                    .mouseenter(function () {
                        $(this).find('.rc-thumbnail-image').animate({
                            'opacity': '1.1'
                        }, {
                            step: function (e) {
                                $(this).css({
                                    'transform': 'scale(' + e +')',
                                });
                            },
                            duration: 200
                        });
                        $(this).find('.rc-thumbnail-caption').animate({
                            'margin-bottom': '0px'
                        }, 200);
                    })
                    .mouseleave(function () {
                        $(this).find('.rc-thumbnail-image').animate({
                            'opacity': '1'
                        }, {
                            step: function (e) {
                                $(this).css({
                                    'transform': 'scale(' + e + ')',
                                });
                            },
                            duration: 200
                        });
                        $(this).find('.rc-thumbnail-caption').animate({
                            'margin-bottom': '-50px'
                        }, 200);
                    })
                    .click(function () {
                        _map.setExtent(extent);
                    })
                    .append(
                        $(document.createElement('div'))
                            .addClass('rc-full-relative')
                            .append(
                                $(document.createElement('div'))
                                    .addClass('rc-thumbnail-image')
                                    .attr('test',1)
                                    .css('background-image', function () {
                                        var w = 250;
                                        var h = 250;
                                        var that = this;
                                        preview.getImageUrl(extent, w, h, function (e) {
                                            $(that).css({
                                                'background-image': 'url(' + e + ')'
                                            });
                                        });
                                    }),
                                $(document.createElement('div'))
                                    .addClass('rc-thumbnail-caption')
                                    .append(
                                        $(document.createElement('div'))
                                            .addClass('rc-thumbnail-caption-text')
                                            .html(this.name)
                                    )
                            )
                    )
            );
        });

        // Add action buttons along the bottom of the screen. Buttons will add/show/hide lens for a given year.
        $.each(IMAGES, function () {
            // Keep a reference to the image object
            var that = this;

            // Add button
            $('#panel').append(
                $(document.createElement('div'))
                    .addClass('rc-button')
                    .attr('data-id', this.id)
                    .click(function () {
                        // When a button is clicked add a new lens window or hide/show existing lens.
                        var lens = $('.rc-lens[data-id="' + that.id + '"]');
                        if ($(this).hasClass('rc-checked')) {
                            $(this).removeClass('rc-checked');
                            //lens.hide();
                            lens.css('visibility', 'hidden');
                        } else {
                            $(this).addClass('rc-checked');
                            if (lens.length) {
                                //lens.show();
                                lens.css('visibility', 'visible');
                            } else {
                                createLens(_map, that);
                            }
                        }
                    })
                    .mouseenter(function () {
                        // When mouse enters button, highlight corresponding lens window (if any)
                        $('.rc-lens[data-id="' + that.id + '"]').bringToFont();
                        $('.rc-lens[data-id="' + that.id + '"] > .rc-frame').css({
                            'border-style': 'solid'
                        });
                    })
                    .mouseleave(function () {
                        // Remove lens window highlighting when the mouse departs from button.
                        $('.rc-lens[data-id="' + that.id + '"] > .rc-frame').css({
                            'border-style': 'none'
                        });
                    })
                    .append(
                        // Add colored coded SVG-based triangle in the corner of the button.
                        $(document.createElement('div'))
                            .addClass('rc-full-relative')
                            .append(
                                $(document.createElementNS(SVGNS, 'svg'))
                                    .addClass('rc-full-absolute')
                                    .attr({
                                        width: 25,
                                        height: 25
                                    })
                                    .append(
                                        $(document.createElementNS(SVGNS, 'polygon'))
                                            .attr({
                                                points: '0,0 25,0 0,25',
                                                fill: this.color
                                            })
                                    ),
                                    $(document.createElement('div'))
                                        .addClass('rc-button-text')
                                        .html(this.name)
                            )
                    )
            );
        });

        // Equivalent to "bring to front", this jquery extension will promote an element above all siblings in terms of z-index.
        jQuery.fn.extend({
            bringToFont: function (selector) {
                var max = Math.max.apply(null, $(this).siblings(selector).map(function () {
                    return $(this).zIndex();
                }));
                $(this).zIndex(++max);
                return this;
            }
        });

        // This function create and manages the lens window 
        function createLens(map, image) {
            // Initialize image service layer
            var ail = new ArcGISImageServiceLayer(image.url);

            // Calculate initial location
            var x = map.width / 2 - SIZE / 2 + (Math.random() - 0.5) * RANDOMNESS;
            var y = map.height / 2 - SIZE / 2 + (Math.random() - 0.5) * RANDOMNESS;

            // The lens will react to the following map events
            map.on('pan-start', function () {
                hide();
            });
            map.on('pan-end', function () {
                refresh();
            });
            map.on('zoom-start', function () {
                hide();
            });
            map.on('zoom-end', function () {
                refresh();
            });

            // Add a new draggable/resizeable window to the same div hosting the Esri map
            $('#' + map.id).parent().append(
                $(document.createElement('div'))
                    .attr('data-id', image.id)
                    .addClass('ui-widget-content ui-resizable rc-lens')
                    .uniqueId()
                    .css({
                        'width': SIZE + 'px',
                        'height': SIZE + 'px',
                        'position': 'absolute',
                        'zIndex': '1',
                        'border': 'none',
                        'box-shadow': '2px 2px 10px 0px rgba(50, 50, 50, 0.5)',
                        'background-color': 'rgba(255, 255, 255, 0.5)'
                    })
                    .draggable({
                        containment: 'window',
                        scroll: false,
                        start: function () {
                            hide();
                        },
                        stop: function () {
                            refresh();
                        }
                    })
                    .resizable({
                        minHeight: 100,
                        minWidth: 100,
                        maxHeight: 500,
                        maxWidth: 500,
                        start: function () {
                            hide();
                        },
                        stop: function () {
                            refresh();
                        }
                    })
                    .css({
                        'left': x,
                        'top': y
                    })
                    .mouseenter(function () {
                        $(this).bringToFont();
                    })
                    .append(
                        // Append a thin frame that appears when the user mouse's over the lens
                        $(document.createElement('div'))
                            .addClass('rc-full-absolute rc-frame')
                            .css({
                                'border-style': 'none',
                                'border-width': '1px',
                                'border-color': image.color
                            })
                            .mouseenter(function () {
                                $(this).css({
                                    'border-style': 'solid'
                                });
                            })
                            .mouseleave(function () {
                                $(this).css({
                                    'border-style': 'none'
                                });
                            }),
                        // Append a color coded triange so that the user can associate a lens with the year on the button
                        $(document.createElementNS(SVGNS, 'svg'))
                            .addClass('rc-full-absolute')
                            .attr({
                                width: 25,
                                height: 25
                            })
                            .append(
                                $(document.createElementNS(SVGNS, 'polygon'))
                                .attr({
                                    points: '0,0 25,0 0,25',
                                    fill: image.color
                                })
                            )
                    )
            );

            // Force new lens to top
            $('.rc-lens[data-id="' + image.id + '"]').bringToFont();

            // Immediately refresh content for the new lens
            refresh();

            // Hide is called at the start of drag and panning operations. Hide the current map image.
            function hide() {
                $('.rc-lens[data-id="' + image.id + '"]').css({
                    'background-image': 'none'
                });
            }

            // Request a new map image for the lens
            function refresh() {
                var l = $('.rc-lens[data-id="' + image.id + '"]');
                //if (l.is(':hidden')) {
                //    return;
                //};
                var p = l.position();
                //var left = l.css('left');
                //var top = l.css('top');
                var w = l.width();
                var h = l.height();
                var ll = map.toMap(new ScreenPoint(p.left, p.top + h));
                var ur = map.toMap(new ScreenPoint(p.left + w, p.top));
                var ex = new Extent(ll.x, ll.y, ur.x, ur.y, map.spatialReference);
                ail.getImageUrl(ex, w, h, function (e) {
                    l.css({
                        'background-image': 'url(' + e + ')',
                        'background-size': 'cover',
                        'background-repeat': 'no-repeat',
                        'width': w + 'px',
                        'height': h + 'px'
                    });
                });
            }
        }
    });
});