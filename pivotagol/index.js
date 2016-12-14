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

$(document).ready(function () {
    // Maximum number of items
    var MAX = 4000;

    // Format text
    String.prototype.format = function () {
        var s = this;
        var i = arguments.length;
        while (i--) {
            s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
        }
        return s;
    };

    $('#closeButton').addClass('hide');
    $('#closeWindowButton').addClass('hide');
    $('#agolWindow').modal();
    
    $('#withAll').keyup(TextBoxKeyUp);
    $('#withExact').keyup(TextBoxKeyUp);
    $('#withLeast').keyup(TextBoxKeyUp);
    $('#withWithout').keyup(TextBoxKeyUp);
    $('#author').keyup(TextBoxKeyUp);

    $('#typeEverything').prop('checked', true);
    $('#searchEverything').prop('checked', true);
    $('#uploadAny').prop('checked', true);

    $('#findButton').addClass('disabled');
    $('#toolbar').addClass('hide');

    $('#findButton').click(function (e) {
        LoadPivotViewer();
    });
    $('#infoButton').click(function (e) {
        $('#aboutWindow').modal();
    });
    function TextBoxKeyUp(e) {
        if ($('#withAll').val() == '' && $('#withExact').val() == '' && $('#withWithout').val() == '' && $('#author').val() == '') {
            $('#findButton').addClass('disabled');
        } else {
            $('#findButton').removeClass('disabled');
            if (e.key == 'Enter') {
                $('#agolWindow').modal('hide');
                LoadPivotViewer();
            }
        }
    };

    $.subscribe("/PivotViewer/Models/Collection/Loaded", function (e) {
        $("#brandimage").click(function () {
            window.open('https://www.esri.com');
        });
    });

    function LoadPivotViewer() {
        var search = '';

        // Type
        if ($('#typeEverything').is(':checked')) { }
        else if ($('#typeMaps').is(':checked')) {
            if (search != '') { search += 'AND'; }
            search += '(type:"web map")';
        }
        else if ($('#typeApps').is(':checked')) {
            if (search != '') { search += 'AND'; }
            search += '(type:"web mapping application")';
        }

        // Search field
        var field = '';
        if ($('#searchEverything').is(':checked')) { }
        else if ($('#searchDescription').is(':checked')) {
            field = 'description:';
        }
        else if ($('#searchSnippet').is(':checked')) {
            field = 'snippet:';
        }
        else if ($('#searchTag').is(':checked')) {
            field = 'tags:';
        }

        // Search text
        if ($('#withAll').val() != '') {
            if (search != '') { search += 'AND'; }
            if (field != '') { search += ' ' + field; }
            search += '({0})'.format($('#withAll').val());
        }
        if ($('#withExact').val() != '') {
            if (search != '') { search += 'AND'; }
            if (field != '') { search += ' ' + field; }
            search += '("{0}")'.format($('#withExact').val());
        }
        if ($('#withWithout').val() != '') {
            if (search != '') { search += 'AND'; }
            if (field != '') { search += ' ' + field; }
            search += '(NOT {0})'.format($('#withWithout').val());
        }

        // Author
        if ($('#author').val() != '') {
            if (search != '') { search += 'AND'; }
            if (field != '') { search += ' ' + field; }
            search += '(owner:{0})'.format($('#author').val());
        }

        // Uploaded
        var to = Date.now();
        var from = Date.now();
        var DAYS = 1000 * 60 * 60 * 24;
        if ($('#uploadToday').is(':checked')) {
            from -= 1 * DAYS;
        }
        else if ($('#uploadPastWeek').is(':checked')) {
            from -= 7 * DAYS;
        }
        else if ($('#uploadPastMonth').is(':checked')) {
            from -= 31 * DAYS;
        }
        else if ($('#uploadPastYear').is(':checked')) {
            from -= 365 * DAYS;
        }
        if (!$('#uploadAny').is(':checked')) {
            if (search != '') { search += 'AND'; }
            var to_ = to.valueOf().toString()
            search += '(uploaded:[{0} TO {1}])'.format(
                pad(from.valueOf().toString(), 19, '0'),
                pad(to.valueOf().toString(), 19, '0')
            );
        }

        $('#toolbar').removeClass('hide');
        $('#pivotviewer').PivotViewer({
            // Json loader.
            Loader: new AgolLoader(search),
            // Image loader.
            ImageController: new AgolImageController("content"),
            // Turning AnimateBlank on can help with performance.
            AnimateBlank: false,
            // $view$=2 tells the initial view to be the GraphView. $facet0$ selects which facet should be shown at first
            ViewerState: "$view$=1&$facet0$=Type",
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

        function pad(str, len, pad) {
            if (len + 1 >= str.length) {
                str = Array(len + 1 - str.length).join(pad) + str;
            }
            return str;
        }
    }
    
    // Json loader
    var AgolLoader = PivotViewer.Models.Loaders.ICollectionLoader.subClass({
        init: function (search) {
            this.Search = search;
        },
        LoadCollection: function (collection) {
            collection.BrandImage = "content/images/logo-esri.jpg";

            // Name, SortOrder?, Type, IsFilterVisible, IsMetaDataVisible, IsWordWheelVisible
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Owner", "", "String", true, true, true));
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Type", "", "String", true, true, true));
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Keywords", "", "String", true, true, true));
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Tags", "", "String", true, true, true));
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Created", "", "DateTime", true, true, true));
            collection.FacetCategories.push(new PivotViewer.Models.FacetCategory("Views", "", "Number", true, true, true));

            // First
            var url = "https://www.arcgis.com/sharing/rest/search?" + $.param({
                q: this.Search,
                start: 0,
                num: 100,
                f: 'json'
            });
            $.ajax({
                url: url,
                dataType: "json"
            })
            .done(function (json) {
                AddToCollection(json)
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                Debug.Error("priv.handleAjaxError", arguments);
            });

            // Process results
            function AddToCollection(json) {
                for (var i = 0; i < json.results.length; i++) {
                    var id = json.results[i].id;
                    var ow = json.results[i].owner;
                    var ti = json.results[i].title;
                    var ty = json.results[i].type;
                    var th = json.results[i].thumbnail;
                    var de = json.results[i].description;
                    var ce = json.results[i].created;
                    var kw = json.results[i].typeKeywords;
                    var tg = json.results[i].tags;
                    var vw = json.results[i].numViews;
                    var dc = (de) ? de.replace(/<(?:.|\n)*?>/gm, '') : '';
                    var cd = new Date(ce);
                    var tu = th ? 'https://www.arcgis.com/sharing/rest/content/items/{0}/info/{1}'.format(id, th) : 'content/images/default.png';
                    var hr = 'https://www.arcgis.com/home/item.html?id={0}'.format(id)
                    var item = new PivotViewer.Models.Item(
                        i,  // Image id
                        id, // Id
                        hr, // Href
                        ti  // Name
                    );
                    item.LobsterId = i;
                    item.Thumbnail = tu;
                    item.ThumbnailData = null;
                    item.ThumbnailLoading = false;
                    item.Description = dc;
                    item.AddFacetValue("Owner", new PivotViewer.Models.FacetValue(ow));
                    item.AddFacetValue("Type", new PivotViewer.Models.FacetValue(ty));
                    item.AddFacetValue("Created", new PivotViewer.Models.FacetValue(cd));
                    item.AddFacetValue("Views", new PivotViewer.Models.FacetValue(vw));
                    kw.forEach(function (element, index, array) {
                        if (index == 0) {
                            item.AddFacetValue("Keywords", new PivotViewer.Models.FacetValue(element));
                        }
                        else {
                            item.Facets.Keywords.push(new PivotViewer.Models.FacetValue(element));
                        }
                    });
                    tg.forEach(function (element, index, array) {
                        if (index == 0) {
                            item.AddFacetValue("Tags", new PivotViewer.Models.FacetValue(element));
                        }
                        else {
                            item.Facets.Tags.push(new PivotViewer.Models.FacetValue(element));
                        }
                    });
                    collection.Items.push(item);
                }

                if (collection.Items.length >= MAX) {
                    $.publish("/PivotViewer/Models/Collection/Loaded", null);
                    return;
                }

                if (json.nextStart == -1) {
                    $.publish("/PivotViewer/Models/Collection/Loaded", null);
                    return;
                }

                var url = "https://www.arcgis.com/sharing/rest/search?" + $.param({
                    q: json.query,
                    start: json.nextStart,
                    num: json.num,
                    f: 'json'
                });
                $.ajax({
                    url: url,
                    dataType: "json"
                })
                .done(function (json) {
                    AddToCollection(json)
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    Debug.Error("priv.handleAjaxError", arguments);
                });
            }
        }
    });

    // Image loader
    var AgolImageController = PivotViewer.Views.IImageController.subClass({
        init: function (baseContentPath) { },
        Setup: function (basePath) {
            $.publish("/PivotViewer/ImageController/Collection/Loaded", null);
        },
        GetImagesAtLevel: function (item, level) {
            return function (facetItem, context, x, y, width, height) {
                var color = '#FF000000'; // Black
                var t = facetItem.Facets["Type"][0].Value.toLowerCase();
                switch (t) {
                    case 'layer package':
                        color = '#0000FF';
                        break;
                    case 'web map':
                        color = '#A52A2A';
                        break;
                    case 'map service':
                        color = '#808080';
                        break;
                    case 'map package':
                        color = '#008000';
                        break;
                    case 'web mapping application':
                        color = '#FF00FF';
                        break;
                    case 'wms':
                    case 'wmts':
                    case 'kml':
                        color = '#FFA500';
                        break;
                    case 'feature service':
                    case 'feature collection':
                    case 'feature collection template':
                    case 'geodata service':
                    case 'globe service':
                    case 'geometry service':
                    case 'geocoding service':
                    case 'network analysis service':
                    case 'geoprocessing service':
                    case 'code attachment':
                    case 'code sample':
                    case 'symbol set':
                    case 'color set':
                    case 'shapefile':
                    case 'csv':
                    case 'service definition':
                    case 'application':
                    case 'desktop application template':
                    case 'document link':
                    case 'explorer layer':
                    case 'explorer map':
                    case 'featured items':
                    case 'geoprocessing package':
                    case 'geoprocessing sample':
                    case 'image':
                    case 'map document':
                    case 'microsoft excel':
                    case 'pdf':
                    case 'tile package':
                    case 'windows mobile package':
                        color = '#800080';
                        break;
                    case 'mobile application':
                        color = '#FF0000';
                        break;
                    case 'image service':
                        color = '#FFFF00';
                        break;
                    default:
                        console.log(t);
                        break;
                }
                context.beginPath();
                context.fillStyle = color;
                context.fillRect(x, y, width, height);
                if (level > 7) {
                    if (!item.ThumbnailData) {
                        if (item.ThumbnailLoading) { return; }
                        item.ThumbnailLoading = true;
                        var im = new Image();
                        im.onload = function () {
                            item.ThumbnailData = im;
                            item.ThumbnailLoading = false;
                            $.publish("/PivotViewer/Views/Tile/Update/" + item.LobsterId, null)
                        };
                        im.crossOrigin = 'anonymous';
                        im.src = item.Thumbnail;
                    }
                    else {
                        context.drawImage(item.ThumbnailData, x, y, width, height);
                    }
                }
                context.closePath();
            }
        },
        Width: 200,
        Height: 133
    });
});