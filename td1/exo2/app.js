const NICE = [43.700, 7.268];
const BERMUDA = [
  [25.7617, -80.1918], // Miami
  [32.3078, -64.7505], // Bermuda
  [18.4655, -66.1057]  // Puerto Rico
];

const map = L.map('map').setView([43.7, 7.25], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const niceMarker = L.marker(NICE).addTo(map).bindPopup('Nice – centre ville');
let userMarker = null;
let userAccuracyCircle = null;

function updateUser(pos){
  const { latitude, longitude, accuracy } = pos.coords;
  const latlng = [latitude, longitude];

  if(!userMarker){
    userMarker = L.marker(latlng).addTo(map).bindPopup('Vous êtes ici');
  }else{
    userMarker.setLatLng(latlng);
  }

  if(!userAccuracyCircle){
    userAccuracyCircle = L.circle(latlng, { radius: accuracy, color:'#2563eb', fillOpacity: .1 }).addTo(map);
  }else{
    userAccuracyCircle.setLatLng(latlng).setRadius(accuracy);
  }
}

if('geolocation' in navigator){
  navigator.geolocation.getCurrentPosition(
    (pos)=>{
      updateUser(pos);
      map.setView([pos.coords.latitude, pos.coords.longitude], 15);
    },
    (err)=>{ console.warn('Geolocation error', err); },
    { enableHighAccuracy:true, timeout:10000, maximumAge:5000 }
  );

  navigator.geolocation.watchPosition(updateUser, console.warn, { enableHighAccuracy:true, maximumAge:5000 });
}

// Bermuda Triangle polygon (en rouge)
L.polygon(BERMUDA, { color: 'red' }).addTo(map).bindPopup('Triangle des Bermudes');
