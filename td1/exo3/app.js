const NICE = [43.700, 7.268];
const MARSEILLE = [43.2965, 5.3698];

const map = L.map('map').setView(NICE, 11);

// Docs: https://docs.stadiamaps.com/themes/stamen/
const layers = {
  'osm': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }),
  'stamen-toner': L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: 'Toner © Stamen Design, Stadia Maps — Map data © OpenStreetMap'
  }),
  'stamen-terrain': L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.jpg', {
    maxZoom: 18,
    attribution: 'Terrain © Stamen Design, Stadia Maps — Map data © OpenStreetMap'
  }),
  'stamen-watercolor': L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg', {
    maxZoom: 16,
    attribution: 'Watercolor © Stamen Design, Stadia Maps — Map data © OpenStreetMap'
  }),
  'carto-light': L.tileLayer('https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: 'Carto Light — © OpenStreetMap, © Carto'
  }),
  'carto-dark': L.tileLayer('https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: 'Carto Dark — © OpenStreetMap, © Carto'
  }),
};

layers['osm'].addTo(map);

// Markers and line between Nice & Marseille
const niceMarker = L.marker(NICE).addTo(map).bindPopup('Nice');
const marseilleMarker = L.marker(MARSEILLE).addTo(map).bindPopup('Marseille');
const nmLine = L.polyline([NICE, MARSEILLE], {color: '#111827'}).addTo(map).bindPopup('Nice ⇄ Marseille');

// User marker + accuracy circle
let userMarker = null;
let accCircle = null;

function updateUser(pos){
  const { latitude, longitude, accuracy } = pos.coords;
  const latlng = [latitude, longitude];

  if(!userMarker){
    userMarker = L.marker(latlng).addTo(map).bindPopup('Vous');
  }else{
    userMarker.setLatLng(latlng);
  }

  if(!accCircle){
    accCircle = L.circle(latlng, { radius: accuracy, color:'#2563eb', fillOpacity:.1 }).addTo(map);
  }else{
    accCircle.setLatLng(latlng).setRadius(accuracy);
  }

  // distance Marseille <-> vous
  const d = haversineKm(MARSEILLE, latlng).toFixed(2);
  document.getElementById('dist').textContent = `Distance Marseille ⇄ Vous : ${d} km`;
}

if('geolocation' in navigator){
  navigator.geolocation.getCurrentPosition(
    (pos)=>{ updateUser(pos); map.setView([pos.coords.latitude, pos.coords.longitude], 13); },
    console.warn,
    { enableHighAccuracy:true, timeout:10000, maximumAge:5000 }
  );
  navigator.geolocation.watchPosition(updateUser, console.warn, { enableHighAccuracy:true, maximumAge:5000 });
}

// Basemap switcher
const basemapStatus = document.getElementById('basemap-status');
let currentBasemap = layers['osm'];

async function setBasemap(key){
  if(!layers[key]) return;
  basemapStatus.textContent = 'Fond: chargement…';
  basemapStatus.style.color = '#d97706';
  const newLayer = layers[key];
  let loaded = false;
  return new Promise(resolve => {
    const onLoad = ()=>{
      loaded = true;
      if(currentBasemap) map.removeLayer(currentBasemap);
      currentBasemap = newLayer;
      basemapStatus.textContent = 'Fond: ' + key;
      basemapStatus.style.color = '#15803d';
      cleanup();
      resolve();
    };
    const onError = ()=>{
      if(!loaded){
        basemapStatus.textContent = 'Fond: échec ('+key+'), retour OSM';
        basemapStatus.style.color = '#dc2626';
        cleanup();
        if(newLayer !== layers['osm']) setBasemap('osm');
        resolve();
      }
    };
    function cleanup(){ newLayer.off('load', onLoad); newLayer.off('tileerror', onError); }
    newLayer.on('load', onLoad);  // premier tile load
    newLayer.on('tileerror', onError);
    setTimeout(()=>{ if(!loaded) onError(); }, 4000);
    // Ajouter temporairement pour déclencher chargement.
    newLayer.addTo(map);
  });
}

document.getElementById('basemap').addEventListener('change', (e)=> setBasemap(e.target.value));

// Load local sample GeoJSON
document.getElementById('btn-geojson-sample').addEventListener('click', async ()=>{
  try {
    const resp = await fetch('samples/sample.geojson', { cache:'no-store' });
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if(data.type !== 'FeatureCollection') throw new Error('Format inattendu');
    console.log('Sample GeoJSON chargé :', data.features.length, 'features');
    const layer = L.geoJSON(data, {
      pointToLayer: (feature, latlng)=> L.circleMarker(latlng, { radius:4, color:'#16a34a', weight:1, fillColor:'#16a34a', fillOpacity:.85 })
    }).addTo(map);
    try { map.fitBounds(layer.getBounds(), { padding:[50,50] }); } catch {}
  } catch(e){
    alert('Erreur chargement sample.geojson : ' + e.message);
  }
});

document.getElementById('btn-geojson-load').addEventListener('click', async ()=>{
  const url = (document.getElementById('geojson-url').value || '').trim();
  if(!url) return;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    const layer = L.geoJSON(data, { style:{ color:'#dc2626', weight:2 } }).addTo(map);
    try { map.fitBounds(layer.getBounds(), { padding:[20,20] }); } catch {}
  } catch (e){
    alert('Impossible de charger ce GeoJSON : ' + e.message);
  }
});

const dataLayers = [];

function addDataLayer(layer){
  dataLayers.push(layer);
  return layer;
}

function clearDataLayers(){
  while(dataLayers.length){
    const l = dataLayers.pop();
    try { map.removeLayer(l); } catch {}
  }
}

async function loadCommunes06(){
  // Communes du 06
  const url = 'https://geo.api.gouv.fr/communes?codeDepartement=06&format=geojson';
  const resp = await fetch(url);
  if(!resp.ok) throw new Error('HTTP ' + resp.status);
  const featureCollection = await resp.json(); // FeatureCollection

  function colorFromInsee(code){
    let h = 0; for(let i=0;i<code.length;i++){ h = (h*31 + code.charCodeAt(i)) & 0xffff; }
    const hue = h % 360;
    return `hsl(${hue} 70% 55%)`;
  }
  const layer = addDataLayer(L.geoJSON(featureCollection, {
    style: f => ({ color: '#ffffff', weight:1, fillOpacity:.35, fillColor: colorFromInsee(f.properties.code) }),
    onEachFeature: (feature, l) => {
      const p = feature.properties;
      l.bindPopup(`<strong>${p.nom}</strong><br>Code INSEE : ${p.code}`);
      l.on('mouseover', ()=> l.setStyle({ weight:3, color:'#000' }));
      l.on('mouseout', ()=> l.setStyle({ weight:1, color:'#ffffff' }));
    }
  }).addTo(map));
  try { map.fitBounds(layer.getBounds(), { padding:[40,40] }); } catch {}
  console.log('Communes 06 chargées, features =', featureCollection.features.length);
  datasetStatus.textContent = 'Données: Communes 06 ('+featureCollection.features.length+' features)';
  datasetStatus.style.color = '#15803d';
}

// Calcul centroïde simple (approx)
function simpleCentroid(geometry){
  if(!geometry) return null;
  const type = geometry.type;
  let points = [];
  if(type === 'Polygon'){
    points = geometry.coordinates[0];
  } else if(type === 'MultiPolygon'){
    // prendre l'anneau externe le plus grand (approx)
    let maxLen = 0; let sel = null;
    for(const poly of geometry.coordinates){
      const ring = poly[0];
      if(ring.length > maxLen){ maxLen = ring.length; sel = ring; }
    }
    points = sel || [];
  } else {
    return null;
  }
  if(!points.length) return null;
  let sx=0, sy=0; let n=0;
  for(const [x,y] of points){ sx += x; sy += y; n++; }
  return [sy/n, sx/n]; // Leaflet ordonne [lat, lng]
}

const datasetStatus = document.getElementById('dataset-status');

document.getElementById('btn-communes-load').addEventListener('click', async () => {
  datasetStatus.textContent = 'Communes: chargement…';
  datasetStatus.style.color = '#d97706';
  try {
    await loadCommunes06();
  } catch(e){
    datasetStatus.textContent = 'Communes: erreur';
    datasetStatus.style.color = '#dc2626';
    alert('Erreur chargement communes : ' + e.message);
  }
});

document.getElementById('btn-communes-clear').addEventListener('click', () => {
  clearDataLayers();
  datasetStatus.textContent = 'Communes: effacées';
  datasetStatus.style.color = '#6b7280';
});

// Initial basemap
basemapStatus.textContent = 'Fond: osm';

// Haversine distance (km)
function haversineKm(a, b){
  const toRad = (x)=> x * Math.PI / 180;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s1 = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
  return R * c;
}

// ================= Itinéraires multi-fournisseurs =================
const routeStatus = document.getElementById('route-status');
const routeProviderSelect = document.getElementById('route-provider');
const routeStartInput = document.getElementById('route-start');
const routeEndInput = document.getElementById('route-end');
let currentRouteLayer = null;

function clearRoute(){
  if(currentRouteLayer){
    try { map.removeLayer(currentRouteLayer); } catch {}
    currentRouteLayer = null;
  }
  routeStatus.textContent = 'Route: effacée';
  routeStatus.style.color = '#6b7280';
}

document.getElementById('btn-route-clear').addEventListener('click', clearRoute);

document.getElementById('btn-route').addEventListener('click', async ()=>{
  const provider = routeProviderSelect.value;
  const parse = (v)=>{
    const parts = (v||'').split(',').map(s=>s.trim());
    if(parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if(Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return [lat, lng];
  };
  const start = parse(routeStartInput.value) || NICE;
  const end = parse(routeEndInput.value) || MARSEILLE;
  clearRoute();
  routeStatus.textContent = 'Route: calcul…';
  routeStatus.style.color = '#d97706';
  try {
    if(provider === 'mapbox'){
      await drawRouteMapbox(start, end);
    } else if(provider === 'google'){
      await drawRouteGoogleStub(start, end);
    }
  } catch(e){
    routeStatus.textContent = 'Route: erreur';
    routeStatus.style.color = '#dc2626';
    alert('Erreur itinéraire: ' + e.message);
    return;
  }
});

async function drawRouteMapbox(start, end){
  const token = 'pk.eyJ1IjoiY3YwNiIsImEiOiJjajg2MmpzYjcwbWdnMzNsc2NzM2l4eW0yIn0.TfDJipR5II7orUZaC848YA';
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[1]},${start[0]};${end[1]},${end[0]}?geometries=geojson&overview=full&language=fr&access_token=${token}`;
  const resp = await fetch(url);
  if(!resp.ok) throw new Error('HTTP '+resp.status);
  const data = await resp.json();
  if(!data.routes || !data.routes.length) throw new Error('Aucune route');
  const route = data.routes[0];
  currentRouteLayer = L.geoJSON({ type:'Feature', properties:{}, geometry: route.geometry }, { style:{ color:'#0e7490', weight:5, opacity:.85 } }).addTo(map);
  try { map.fitBounds(currentRouteLayer.getBounds(), { padding:[40,40] }); } catch {}
  const km = (route.distance/1000).toFixed(1);
  const dur = (route.duration/60).toFixed(1);
  routeStatus.textContent = `Route: Mapbox ${km} km / ${dur} min`;
  routeStatus.style.color = '#15803d';
}


async function drawRouteGoogleStub(start, end){
  const line = [start, end];
  currentRouteLayer = L.polyline(line, { color:'#dc2626', dashArray:'6 8', weight:4 }).addTo(map);
  try { map.fitBounds(currentRouteLayer.getBounds(), { padding:[40,40] }); } catch {}
  routeStatus.textContent = 'Route: Google (stub) – droite géodésique';
  routeStatus.style.color = '#f59e0b';
}

if(routeStartInput) routeStartInput.value = NICE.join(',');
if(routeEndInput) routeEndInput.value = MARSEILLE.join(',');
