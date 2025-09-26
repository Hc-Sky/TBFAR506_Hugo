import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer;
let cube, importedModel, starfield;
let fogOn = false;
let hasMotionControls = false;

const orientationState = { alpha: 0, beta: 0, gamma: 0 };
const motionState = { ax: 0, ay: 0, az: 0 };
const cubeBasePosition = new THREE.Vector3(-1.5, 0, 0);
const modelBasePosition = new THREE.Vector3(1.8, -0.6, 0);

init();
animate();

function init() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d12);

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
  camera.position.set(0, 1.5, 8);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  addLights();
  cube = createTexturedCube();
  scene.add(cube);

  loadGLTFModel();
  starfield = createStarfield();
  scene.add(starfield);

  setupUI();
  bindResize();
}

function addLights() {
  const amb = new THREE.AmbientLight(0xffffff, 0.6);
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(4, 8, 6);
  scene.add(amb, dir);
}

function createTexturedCube() {
  const texLoader = new THREE.TextureLoader();
  const tex = texLoader.load('https://threejs.org/examples/textures/uv_grid_opengl.jpg');
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshStandardMaterial({ map: tex });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), mat);
  mesh.position.copy(cubeBasePosition);
  return mesh;
}

function loadGLTFModel() {
  const loader = new GLTFLoader();
  const modelUrl = 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf';

  loader.load(
    modelUrl,
    (gltf) => {
      importedModel = gltf.scene;
  importedModel.scale.setScalar(1.5);
  importedModel.position.copy(modelBasePosition);
      importedModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(importedModel);
    },
    undefined,
    (err) => {
      console.error('Failed to load GLTF model', err);
    }
  );
}

function createStarfield() {
  const starCount = 600;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    positions[i3] = THREE.MathUtils.randFloatSpread(120);
    positions[i3 + 1] = THREE.MathUtils.randFloatSpread(120);
    positions[i3 + 2] = THREE.MathUtils.randFloatSpread(120);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x88aaff,
    size: 0.6,
    transparent: true,
    opacity: 0.7,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'starfield';
  return points;
}

function setupUI() {
  const fogButton = document.getElementById('toggleFog');
  const motionButton = document.getElementById('enableMotion');

  if (fogButton) {
    fogButton.addEventListener('click', () => {
      fogOn = !fogOn;
      scene.fog = fogOn ? new THREE.FogExp2(0x0b0d12, 0.02) : null;
    });
  }

  if (motionButton) {
    motionButton.addEventListener('click', enableDeviceMotion, { once: false });
  }
}

async function enableDeviceMotion() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permissionState = await DeviceOrientationEvent.requestPermission();
      if (permissionState !== 'granted') {
        alert('Autorisez l\'accès au gyroscope pour animer la scène.');
        return;
      }
    }

    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      await DeviceMotionEvent.requestPermission().catch(() => {});
    }
  } catch (err) {
    console.warn('Permission gyroscope refusée ou indisponible', err);
    return;
  }

  window.addEventListener('deviceorientation', handleOrientation, true);
  window.addEventListener('devicemotion', handleMotion, true);
  hasMotionControls = true;

  const motionButton = document.getElementById('enableMotion');
  if (motionButton) {
    motionButton.disabled = true;
    motionButton.textContent = 'Gyroscope actif';
  }
}

function handleOrientation(event) {
  orientationState.alpha = event.alpha ?? orientationState.alpha;
  orientationState.beta = event.beta ?? orientationState.beta;
  orientationState.gamma = event.gamma ?? orientationState.gamma;
}

function handleMotion(event) {
  const accel = event.accelerationIncludingGravity;
  if (!accel) return;
  motionState.ax = accel.x ?? motionState.ax;
  motionState.ay = accel.y ?? motionState.ay;
  motionState.az = accel.z ?? motionState.az;
}

function bindResize() {
  window.addEventListener('resize', () => {
    const { innerWidth, innerHeight } = window;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function animate() {
  requestAnimationFrame(animate);

  if (hasMotionControls) {
    applyMotionToObjects();
  } else {
    cube.rotation.y += 0.01;
    cube.rotation.x += 0.005;
    if (importedModel) {
      importedModel.rotation.y += 0.005;
    }
  }

  if (starfield) {
    starfield.rotation.y += 0.0005;
  }

  renderer.render(scene, camera);
}

function applyMotionToObjects() {
  const targetX = THREE.MathUtils.degToRad(orientationState.beta) * 0.5;
  const targetY = THREE.MathUtils.degToRad(orientationState.gamma) * 0.5;
  const targetZ = THREE.MathUtils.degToRad(orientationState.alpha) * 0.1;

  cube.rotation.x += (targetX - cube.rotation.x) * 0.1;
  cube.rotation.y += (targetY - cube.rotation.y) * 0.1;
  cube.rotation.z += (targetZ - cube.rotation.z) * 0.1;

  if (importedModel) {
    importedModel.rotation.x += (targetX - importedModel.rotation.x) * 0.08;
    importedModel.rotation.y += (targetY - importedModel.rotation.y) * 0.08;
    importedModel.rotation.z += (targetZ - importedModel.rotation.z) * 0.08;
  }

  const normalizedX = THREE.MathUtils.clamp(motionState.ax / 9.81, -1, 1);
  const normalizedY = THREE.MathUtils.clamp(motionState.ay / 9.81, -1, 1);

  const cubeTargetX = cubeBasePosition.x + normalizedX;
  const cubeTargetY = cubeBasePosition.y - normalizedY;
  cube.position.x += (cubeTargetX - cube.position.x) * 0.05;
  cube.position.y += (cubeTargetY - cube.position.y) * 0.05;

  if (importedModel) {
    const modelTargetX = modelBasePosition.x + normalizedX * 0.8;
    const modelTargetY = modelBasePosition.y - normalizedY * 0.8;
    importedModel.position.x += (modelTargetX - importedModel.position.x) * 0.05;
    importedModel.position.y += (modelTargetY - importedModel.position.y) * 0.05;
  }
}
