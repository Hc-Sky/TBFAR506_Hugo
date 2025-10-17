import {
  Engine, Scene, ArcRotateCamera, Vector3,
  HemisphericLight, DirectionalLight,
  Color3, Color4, MeshBuilder, StandardMaterial, Texture,
  DeviceOrientationCamera, Tools, ActionManager, ExecuteCodeAction
} from '@babylonjs/core';
import '@babylonjs/loaders';
import L from 'leaflet';

const canvas = document.getElementById('renderCanvas');
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

let scene, camera, earth, leafletMap, countryMarkers = [];
let allCountryMeshes = [];
let selectedCountry = null;

init();
engine.runRenderLoop(() => {
  if (scene) {
    scene.render();
  }
});
window.addEventListener('resize', () => engine.resize());

function init() {
  scene = new Scene(engine);
  scene.clearColor = new Color4(0.043, 0.051, 0.071, 1.0);
  scene.useRightHandedSystem = true;

  camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 2.5, 8, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 4;
  camera.upperRadiusLimit = 15;

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.7;
  const dir = new DirectionalLight('dir', new Vector3(-1, -0.5, -0.7), scene);
  dir.intensity = 1.2;

  const USE_TEXTURE = true;
  const EARTH_TEXTURE_PATH = new URL('./assets/earth_atmos_2048.jpg', import.meta.url).href;

  earth = MeshBuilder.CreateSphere('earth', { diameter: 4, segments: 64 }, scene);
  const mat = new StandardMaterial('earthMat', scene);
  if (USE_TEXTURE) {
    try {
      mat.diffuseTexture = new Texture(EARTH_TEXTURE_PATH, scene);
      mat.diffuseTexture.vScale = -1;
    } catch (e) {
      console.warn('Echec chargement texture, fallback en couleur unie', e);
      mat.diffuseColor = new Color3(0.18, 0.42, 0.8);
    }
  } else {
    mat.diffuseColor = new Color3(0.18, 0.42, 0.8);
  }
  mat.specularColor = new Color3(0.1, 0.1, 0.1);
  earth.material = mat;
  earth.position = Vector3.Zero();

  const lonOffsetDeg = 0;
  const latOffsetDeg = 0;
  earth.rotation.y = Tools.ToRadians(lonOffsetDeg);
  earth.rotation.x = Tools.ToRadians(latOffsetDeg);

  initLeafletMap();
  setupUI();
}

function latLonToCartesian(latDeg, lonDeg, R = 2) {
  const lat = Tools.ToRadians(latDeg);
  const lon = Tools.ToRadians(lonDeg);
  const x = -R * Math.cos(lat) * Math.cos(lon);
  const y = R * Math.sin(lat);
  const z = R * Math.cos(lat) * Math.sin(lon);
  return new Vector3(x, y, z);
}

function createMarker(lat, lon, opts = {}) {
  const pos = latLonToCartesian(lat, lon, 2.02);
  const m = MeshBuilder.CreateSphere('marker', { diameter: opts.size || 0.1, segments: 12 }, scene);
  m.position = pos;
  m.parent = earth;
  const mat = new StandardMaterial('markerMat', scene);
  mat.emissiveColor = opts.emissive || new Color3(1, 0.2, 0.2);
  mat.diffuseColor = new Color3(0, 0, 0);
  m.material = mat;
  
  m.metadata = { 
    lat, 
    lon, 
    countryName: opts.name,
    originalEmissive: mat.emissiveColor.clone(),
    type: 'marker'
  };
  
  m.actionManager = new ActionManager(scene);
  m.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
      if (leafletMap && m.metadata) {
        highlightCountry(m);
        leafletMap.setView([m.metadata.lat, m.metadata.lon], 5);
        console.log(`🗺️ Carte recentrée sur: ${m.metadata.countryName || 'Position'}`);
      }
    })
  );
  
  return m;
}

function createFlag(lat, lon, flagUrl, countryName) {
  const pos = latLonToCartesian(lat, lon, 2.05);
  const plane = MeshBuilder.CreatePlane('flag', { size: 0.1 }, scene); 
  plane.position = pos;
  plane.billboardMode = 7;
  plane.parent = earth;
  
  const mat = new StandardMaterial('flagMat', scene);
  mat.diffuseTexture = new Texture(flagUrl, scene);
  mat.emissiveColor = new Color3(0.9, 0.9, 0.9);
  mat.backFaceCulling = false;
  plane.material = mat;
  
  plane.metadata = { 
    lat, 
    lon, 
    countryName,
    originalEmissive: mat.emissiveColor.clone(),
    type: 'flag'
  };
  
  plane.actionManager = new ActionManager(scene);
  plane.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
      if (leafletMap && plane.metadata) {
        highlightCountry(plane);
        leafletMap.setView([plane.metadata.lat, plane.metadata.lon], 5);
        console.log(`🗺️ Carte recentrée sur: ${plane.metadata.countryName || 'Position'}`);
      }
    })
  );
  
  return plane;
}

function highlightCountry(selectedMesh, zoomOnCountry = true) {
  if (selectedCountry && selectedCountry.metadata.countryName === selectedMesh.metadata.countryName) {
    selectedCountry = null;
    
    allCountryMeshes.forEach(mesh => {
      if (!mesh.material || !mesh.metadata) return;
      
      const mat = mesh.material;
      
      if (mesh.metadata.originalEmissive) {
        mat.emissiveColor = mesh.metadata.originalEmissive.clone();
      }
      
      mesh.scaling = new Vector3(1, 1, 1);
    });
    
    camera.setTarget(Vector3.Zero());
    
    console.log('🔓 Pays désélectionné - caméra libre');
    return;
  }
  
  selectedCountry = selectedMesh;
  
  allCountryMeshes.forEach(mesh => {
    if (!mesh.material || !mesh.metadata) return;
    
    const mat = mesh.material;
    
    if (mesh === selectedMesh || (mesh.metadata.countryName === selectedMesh.metadata.countryName)) {
      if (mesh.metadata.type === 'marker') {
        mat.emissiveColor = new Color3(1, 0.8, 0);
        mesh.scaling = new Vector3(1.5, 1.5, 1.5);
      } else if (mesh.metadata.type === 'flag') {
        mat.emissiveColor = new Color3(1.5, 1.5, 1.5);
        mesh.scaling = new Vector3(1.3, 1.3, 1.3);
      }
    } else {
      if (mesh.metadata.type === 'marker') {
        mat.emissiveColor = new Color3(0.15, 0.15, 0.15);
        mesh.scaling = new Vector3(1, 1, 1);
      } else if (mesh.metadata.type === 'flag') {
        mat.emissiveColor = new Color3(0.3, 0.3, 0.3);
        mesh.scaling = new Vector3(1, 1, 1);
      }
    }
  });
  
  if (zoomOnCountry && selectedMesh.metadata) {
    zoomToCountry(selectedMesh.metadata.lat, selectedMesh.metadata.lon);
  }
}

function zoomToCountry(lat, lon) {
  const targetPos = latLonToCartesian(lat, lon, 2);
  
  const duration = 80;
  let frame = 0;
  
  const startAlpha = camera.alpha;
  const startBeta = camera.beta;
  const startRadius = camera.radius;
  const startTarget = camera.target.clone();
  
  const targetAlpha = -Tools.ToRadians(lon);
  const targetBeta = Tools.ToRadians(90 - lat);
  const targetRadius = 4.5;
  
  const animationLoop = () => {
    frame++;
    const t = Math.min(frame / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    
    camera.alpha = startAlpha + (targetAlpha - startAlpha) * eased;
    camera.beta = startBeta + (targetBeta - startBeta) * eased;
    camera.radius = startRadius + (targetRadius - startRadius) * eased;
    
    camera.setTarget(Vector3.Lerp(startTarget, targetPos, eased));
    
    if (frame < duration) {
      requestAnimationFrame(animationLoop);
    }
  };
  
  animationLoop();
}

function resetAllCountries() {
  selectedCountry = null;
  
  allCountryMeshes.forEach(mesh => {
    if (!mesh.material || !mesh.metadata) return;
    
    const mat = mesh.material;
    
    if (mesh.metadata.originalEmissive) {
      mat.emissiveColor = mesh.metadata.originalEmissive.clone();
    }
    
    mesh.scaling = new Vector3(1, 1, 1);
  });
  
  smoothResetCamera();
}

function smoothResetCamera() {
  const duration = 80;
  let frame = 0;
  
  const startAlpha = camera.alpha;
  const startBeta = camera.beta;
  const startRadius = camera.radius;
  
  const targetAlpha = -Math.PI / 2;
  const targetBeta = Math.PI / 2.5;
  const targetRadius = 8;
  
  const animationLoop = () => {
    frame++;
    const t = Math.min(frame / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    
    camera.alpha = startAlpha + (targetAlpha - startAlpha) * eased;
    camera.beta = startBeta + (targetBeta - startBeta) * eased;
    camera.radius = startRadius + (targetRadius - startRadius) * eased;
    camera.setTarget(Vector3.Zero());
    
    if (frame < duration) {
      requestAnimationFrame(animationLoop);
    }
  };
  
  animationLoop();
}

function initLeafletMap() {
  leafletMap = L.map('map').setView([48.8566, 2.3522], 3);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(leafletMap);
  
  leafletMap.on('click', (e) => {
    const { lat, lng } = e.latlng;
    
    // Trouver le pays le plus proche sans bouger la caméra
    if (allCountryMeshes.length > 0) {
      let nearest = null;
      let minDist = Infinity;
      
      allCountryMeshes.forEach(mesh => {
        if (mesh.metadata && mesh.metadata.type === 'marker') {
          const dist = Math.sqrt(
            Math.pow(mesh.metadata.lat - lat, 2) + 
            Math.pow(mesh.metadata.lon - lng, 2)
          );
          if (dist < minDist) {
            minDist = dist;
            nearest = mesh;
          }
        }
      });
      
      if (nearest && minDist < 10) {
        highlightCountry(nearest, false);
        console.log(`🗺️ Pays sélectionné: ${nearest.metadata.countryName || 'Position'}`);
      }
    }
  });
}

function rotateEarthToLocation(lat, lon, highlightNearest = true) {
  const targetPos = latLonToCartesian(lat, lon, 2);
  
  camera.setTarget(targetPos);
  
  if (highlightNearest && allCountryMeshes.length > 0) {
    let nearest = null;
    let minDist = Infinity;
    
    allCountryMeshes.forEach(mesh => {
      if (mesh.metadata && mesh.metadata.type === 'marker') {
        const dist = Math.sqrt(
          Math.pow(mesh.metadata.lat - lat, 2) + 
          Math.pow(mesh.metadata.lon - lon, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = mesh;
        }
      }
    });
    
    if (nearest && minDist < 10) {
      highlightCountry(nearest);
    }
  }
  
  const theta = Tools.ToRadians(lon);
  const phi = Tools.ToRadians(90 - lat);
  
  const duration = 60;
  let frame = 0;
  const startAlpha = camera.alpha;
  const startBeta = camera.beta;
  const targetAlpha = -theta - Math.PI / 2;
  const targetBeta = phi;
  
  const animationLoop = () => {
    frame++;
    const t = Math.min(frame / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    
    camera.alpha = startAlpha + (targetAlpha - startAlpha) * eased;
    camera.beta = startBeta + (targetBeta - startBeta) * eased;
    
    if (frame < duration) {
      requestAnimationFrame(animationLoop);
    }
  };
  
  animationLoop();
}

function setupUI() {
  document.getElementById('btnLocate').onclick = () => {
    if (!navigator.geolocation) return alert("Pas de géoloc dispo !");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        const marker = createMarker(latitude, longitude, {
          size: 0.15,
          emissive: new Color3(1, 1, 0.4),
          name: 'Ma position'
        });
        camera.setTarget(marker.position);
        
        if (leafletMap) {
          leafletMap.setView([latitude, longitude], 8);
          L.marker([latitude, longitude])
            .addTo(leafletMap)
            .bindPopup('📍 Ma position')
            .openPopup();
        }
      },
      () => alert("Erreur géoloc"),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
    );
  };

  document.getElementById('btnCountries').onclick = async () => {
    try {
      const res = await fetch('https://restcountries.com/v3.1/all?fields=name,latlng,flags');
      const allCountries = await res.json();
      
      const validCountries = allCountries.filter(c => Array.isArray(c.latlng) && c.latlng.length === 2);
      
      countryMarkers.forEach(m => leafletMap.removeLayer(m));
      countryMarkers = [];
      allCountryMeshes = [];
      
      validCountries.forEach((c, i) => {
        const [lat, lon] = c.latlng;
        const countryName = c.name.common || c.name.official;
        
        const marker = createMarker(lat, lon, {
          size: 0.08,
          emissive: new Color3(0.4, 0.8, 1),
          name: countryName
        });
        allCountryMeshes.push(marker);
        
        const flagUrl = c.flags?.png || c.flags?.svg;
        if (flagUrl) {
          const flag = createFlag(lat, lon, flagUrl, countryName);
          allCountryMeshes.push(flag);
        }
        
        const leafletMarker = L.marker([lat, lon])
          .addTo(leafletMap)
          .bindPopup(`${flagUrl ? `<img src="${flagUrl}" width="40"/> ` : ''}${countryName}`);
        
        leafletMarker.on('click', () => {
          rotateEarthToLocation(lat, lon, false);
          highlightCountry(marker);
          console.log(`🌍 Terre repositionnée sur: ${countryName}`);
        });
        
        countryMarkers.push(leafletMarker);
      });
      
      console.log(`${validCountries.length} pays affichés`);
    } catch (e) {
      console.warn("Erreur récupération pays", e);
      alert("Erreur lors du chargement des pays");
    }
  };

  document.getElementById('btnOrientation').onclick = () => {
    if (!('DeviceOrientationEvent' in window)) return alert("Pas dispo sur PC !");
    const devCam = new DeviceOrientationCamera('devcam', camera.position.clone(), scene);
    devCam.setTarget(Vector3.Zero());
    devCam.attachControl(canvas, true);
    scene.activeCamera.detachControl(canvas);
    scene.activeCamera = devCam;
  };

  document.getElementById('btnResetCam').onclick = () => {
    resetAllCountries();
    camera.setTarget(Vector3.Zero());
    camera.alpha = -Math.PI / 2;
    camera.beta = Math.PI / 2.5;
    camera.radius = 8;
  };
  
  document.getElementById('btnToggleMap').onclick = () => {
    const mapEl = document.getElementById('map');
    mapEl.style.display = mapEl.style.display === 'none' ? 'block' : 'none';
  };
}