let watchId = null;

const el = (id) => document.getElementById(id);
const fmt = (n, d=6) => (n==null || Number.isNaN(n)) ? 'N/A' : Number(n).toFixed(d);

function setStatus(msg, error=false){
  el('status').innerHTML = error ? `<span class="err">${msg}</span>` : msg;
}

function show(pos, source){
  const { latitude, longitude, altitude, accuracy, speed } = pos.coords;
  el('lat').textContent = fmt(latitude, 6);
  el('lng').textContent = fmt(longitude, 6);
  el('alt').textContent = altitude == null ? 'N/A' : `${fmt(altitude, 1)} m`;
  el('acc').textContent = accuracy == null ? 'N/A' : `${fmt(accuracy, 1)} m`;
  let spdms = (speed == null || Number.isNaN(speed)) ? null : speed;
  let spdkmh = spdms == null ? 'N/A' : (spdms * 3.6).toFixed(1) + ' km/h';
  el('spd').textContent = spdkmh;
  el('ts').textContent = new Date(pos.timestamp).toLocaleString();
  el('source').textContent = source;
}

function onError(err){
  setStatus(`Erreur (${err.code}) : ${err.message}`, true);
}

function getOptions(){
  return {
    enableHighAccuracy: el('opt-hea').checked,
    maximumAge: 5000,
    timeout: 10000
  };
}

el('btn-once').addEventListener('click', () => {
  if(!('geolocation' in navigator)){
    setStatus('Geolocation non supportée par ce navigateur.', true);
    return;
  }
  setStatus('Mesure en cours…');
  navigator.geolocation.getCurrentPosition(
    (pos) => { show(pos, 'getCurrentPosition'); setStatus('OK'); },
    onError,
    getOptions()
  );
});

el('btn-start').addEventListener('click', () => {
  if(!('geolocation' in navigator)){
    setStatus('Geolocation non supportée par ce navigateur.', true);
    return;
  }
  if(watchId !== null){
    setStatus('Suivi déjà en cours.');
    return;
  }
  setStatus('Suivi démarré… bougez un peu pour voir la vitesse.');
  watchId = navigator.geolocation.watchPosition(
    (pos) => { show(pos, 'watchPosition'); },
    onError,
    getOptions()
  );
});

el('btn-stop').addEventListener('click', () => {
  if(watchId !== null){
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    setStatus('Suivi arrêté.');
  }
});
