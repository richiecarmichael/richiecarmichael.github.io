<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-4.png" -->

<h1 style="font-size: 60px;">Interactive Client-Side Mapping<br>with the ArcGIS API for JavaScript</h1>
<p style="font-size: 30px;">Undral Batsukh [<a href="mailto:ubatshukh@esri.com">ubatshukh@esri.com</a>] | Richie Carmichael [<a href="https://github.com/kiwiRichie">@kiwiRichie</a>]</p>
<p style="font-size: 30px;"><code><a href="https://git.io/JvB8u">https://git.io/JvB8u</a> (<a href="?print-pdf">printer friendly</a>)</code></p>

---

<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-2.png" -->
### Agenda

- Client-side Layers (U)
  - [FeatureLayer](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html), [CSVLayer](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-CSVLayer.html), [GeoJSONLayer](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-GeoJSONLayer.html) and more...
- [Query](https://developers.arcgis.com/javascript/latest/api-reference/esri-tasks-support-Query.html) (U)
  - How to search time and space?
  - How and why to search locally?
- [Filters](https://developers.arcgis.com/javascript/latest/api-reference/esri-views-layers-support-FeatureFilter.html) and [Effects](https://developers.arcgis.com/javascript/latest/api-reference/esri-views-layers-support-FeatureEffect.html) (R)
- [Geometry Engine](https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-geometryEngine.html), [Projection Engine](https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-projection.html) and [Geodesic Utils](https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-support-geodesicUtils.html) (R)
  - What are they and why do we care?

---

<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-2.png" -->

### Client-side Layers 

---

<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-2.png" -->
### Query

---

<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-2.png" -->
### Filters

_Client-side spatial/aspatial/temporal filtering._

```js
// Only show earthquakes that occured between 2000 and 2006.
featureLayerView.filter = new FeatureFilter({
  timeExtent: new TimeExtent({
    start: new Date(2000, 0, 1),
    end: new Date(2007, 0, 1)
  })
});
```
```js
// Only show buildings within 10 miles of the mouse cursor.
mapView.on("pointer-move", function(e) {
  buildingLayerView.filter = {
    geometry: mapView.toMap({e.x, e.y}),
    distance: 10,
    units: "miles"
  }
});
```

---

<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-2.png" -->
### [Effects](https://developers.arcgis.com/javascript/latest/api-reference/esri-views-layers-support-FeatureEffect.html)

_Visual effects applied to included/excluded features._

```js
// Show quakes less than 7 magnitude as faint shadows.
featureLayerView.effect = new FeatureEffect({
  filter: {
    where: "magnitude >= 7"
  }
  excludedEffect: "grayscale(100%) opacity(0.5)"
});
```
[Plenary Demo](https://ycabon.github.io/2019-devsummit-plenary/3_filter_effect.html)

---

<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-2.png" -->
### Supported Effects (w/ default values)

```css
// brightness(0.4);
// contrast(200%);
// grayscale(50%);
// hue-rotate(90deg);
// invert(75%);
// opacity(25%);
// saturate(30%);
// sepia(60%);
```
[CSS reference](https://developer.mozilla.org/en-US/docs/Web/CSS/filter)

---

### Filter/Effects Demonstration - TODO
based on: http://tui/GitHub/richiecarmichael.github.io/quake-map/index.html

---

<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-4.png" -->
### Demonstration - [Century of Quakes](demos/century-of-earthquakes.html)

<img src="image/century-of-earthquakes.gif" style="border:0;background:none;box-shadow:none;width:800px;">

---

<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-2.png" -->
### Geometry Engine

---

<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-2.png" -->
### Projection Engine

---

<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-2.png" -->
### Geodesic Utils

---

<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-rating.png" -->

---

<!-- .slide: data-background="../../reveal.js/img/2020/devsummit/bg-3.png" -->
<img src="../../reveal.js/img/esri-science-logo-white.png" style="border:0px; background:none;box-shadow:none;">



<!-- *** LAST YEAR ***

---

### Client-side query

- `(CSV|GeoJSON)Layer`
- `(CSV|GeoJSON|Feature|Scene)LayerView`
  - `queryFeatures()`
  - `queryFeatureCount()`
  - `queryObjectIds()`
  - `queryExtent()`

[Age Pyramid](https://developers.arcgis.com/javascript/latest/sample-code/featurelayerview-query-geometry/live/index.html), 
[Homicides](https://developers.arcgis.com/javascript/latest/sample-code/featurelayerview-query-distance/live/index.html), 
[3D buildings](https://developers.arcgis.com/javascript/latest/sample-code/layers-scenelayerview-query-stats/live/index.html)

---

### Client-side query

- Features aren't always as they seem!
  - Quantized/generalized geometries in FeatureLayer
  - Very small features may not be present even if technically within the view's extent

[Query neighbors](https://ekenes.github.io/esri-ts-samples/query/neighbor-comparison/touches.html)

---

#### Client-side layers

```js
const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/"
const geoJSONLayer = new GeoJSONLayer({
  url: url + "summary/all_month.geojson",
  copyright: "USGS Earthquakes"
});
const csvLayer = new CSVLayer({
  url: url + "summary/2.5_week.csv",
  copyright: "USGS Earthquakes"
});
```
```js
const featureLayer = new FeatureLayer({
  source: [
    new Graphic({ attributes: { myOid: 1 }, geometry: { ... } })
    new Graphic({ attributes: { myOid: 2 }, geometry: { ... } })
    new Graphic({ attributes: { myOid: 3 }, geometry: { ... } })
  ],
  fields: [
    new Field({
      name: "myOid",
      type: "oid"
    })
  ]
});
```

---

#### Client-side vs. Server-side

```js
// Query all data on the server.
var query = new Query({
  where: "magnitude >= 5"
});
```
```js
// Query all data on the server.
featureLayer.queryFeatureCount(query).then(function(count){
  console.log(`${count} quakes found.`);  // 54820 quakes found.
});
```
```js
// Query only data downloaded to the browser.
featureLayerView.queryFeatureCount(query).then(function(count){
  console.log(`${count} quakes found.`);  // 9235 quakes found.
});
```

---

-->
