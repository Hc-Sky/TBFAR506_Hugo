import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { DeviceOrientationCamera } from '@babylonjs/core/Cameras/deviceOrientationCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { BoxParticleEmitter } from '@babylonjs/core/Particles/EmitterTypes/boxParticleEmitter';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { PhysicsImpostor } from '@babylonjs/core/Physics/physicsImpostor';
import { CannonJSPlugin } from '@babylonjs/core/Physics/Plugins/cannonJSPlugin';
import '@babylonjs/core/Physics/physicsEngineComponent';
import * as CANNON from 'cannon-es';

const canvas = document.getElementById('renderCanvas');
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

let scene = null;
let camera = null;
let sphere = null;
let ground = null;
let gravityEnabled = false;
let deviceCameraActive = false;
let deviceEventsAttached = false;
let rainSystem = null;
let rainEnabled = true;
let energyRings = [];
let ringBaseRotations = [];
let shardParent = null;
let pillarNodes = [];
let pillarBaseScales = [];
let elapsedTime = 0;

const orientationState = { alpha: 0, beta: 0, gamma: 0 };
const motionState = { ax: 0, ay: 0, az: 0 };
const sphereBasePosition = new Vector3(0, 2, 0);

scene = createScene();
engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener('resize', () => engine.resize());

setupUI();

function createScene() {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.043, 0.051, 0.071, 1.0);

  camera = new ArcRotateCamera('cam', Math.PI / 4, Math.PI / 3, 12, new Vector3(0, 1, 0), scene);
  camera.attachControl(canvas, true);

  new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  const dir = new DirectionalLight('dir', new Vector3(-0.5, -1, 0.5), scene);
  dir.position = new Vector3(5, 10, -5);

  ground = MeshBuilder.CreateGround('ground', { width: 40, height: 40 }, scene);
  const gmat = new StandardMaterial('gmat', scene);
  gmat.diffuseColor = new Color3(0.05, 0.07, 0.12);
  gmat.specularColor = new Color3(0.08, 0.1, 0.2);
  gmat.emissiveColor = new Color3(0.01, 0.02, 0.05);
  ground.material = gmat;

  sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2 }, scene);
  sphere.position.copyFrom(sphereBasePosition);
  const smat = new StandardMaterial('smat', scene);
  smat.diffuseTexture = new Texture('https://playground.babylonjs.com/textures/amiga.jpg', scene);
  smat.diffuseColor = new Color3(0.12, 0.2, 0.36);
  smat.emissiveColor = new Color3(0.25, 0.55, 1);
  smat.specularColor = new Color3(0.4, 0.6, 1);
  smat.alpha = 0.95;
  sphere.material = smat;

  createStylizedAssets(scene);
  rainSystem = createRainSystem(scene);
  scene.onBeforeRenderObservable.add(updateDynamicAnimation);

  return scene;
}

function createStylizedAssets(targetScene) {
  energyRings = [];
  ringBaseRotations = [];
  pillarNodes = [];
  pillarBaseScales = [];

  const glow = new GlowLayer('glow', targetScene);
  glow.intensity = 0.6;

  const dais = MeshBuilder.CreateCylinder('dais', { diameter: 6.5, height: 0.3, tessellation: 64 }, targetScene);
  dais.position.y = 0.15;
  const daisMat = new StandardMaterial('daisMat', targetScene);
  daisMat.diffuseColor = new Color3(0.04, 0.07, 0.12);
  daisMat.specularColor = new Color3(0.1, 0.18, 0.32);
  daisMat.emissiveColor = new Color3(0.01, 0.03, 0.08);
  dais.material = daisMat;

  const halo = MeshBuilder.CreateDisc('halo', { radius: 5, tessellation: 64 }, targetScene);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.31;
  const haloMat = new StandardMaterial('haloMat', targetScene);
  haloMat.emissiveColor = new Color3(0.18, 0.5, 0.9);
  haloMat.alpha = 0.18;
  haloMat.backFaceCulling = false;
  halo.material = haloMat;

  const ringMaterial = new StandardMaterial('ringMat', targetScene);
  ringMaterial.emissiveColor = new Color3(0.2, 0.6, 1);
  ringMaterial.diffuseColor = new Color3(0.04, 0.1, 0.18);
  ringMaterial.alpha = 0.62;
  ringMaterial.backFaceCulling = false;

  const ringSettings = [
    { diameter: 3.2, thickness: 0.12, tiltX: Math.PI / 2.2, tiltZ: -Math.PI / 6 },
    { diameter: 3.8, thickness: 0.14, tiltX: Math.PI / 2, tiltZ: Math.PI / 6 },
    { diameter: 4.6, thickness: 0.1, tiltX: Math.PI / 1.8, tiltZ: Math.PI / 3 }
  ];

  ringSettings.forEach((config, idx) => {
    const ring = MeshBuilder.CreateTorus(`ring${idx}`, {
      diameter: config.diameter,
      thickness: config.thickness,
      tessellation: 72
    }, targetScene);
    ring.position = new Vector3(0, sphereBasePosition.y, 0);
    ring.rotation.x = config.tiltX;
    ring.rotation.z = config.tiltZ;
    ring.rotation.y = idx * 0.4;
    ring.material = ringMaterial;
    energyRings.push(ring);
    ringBaseRotations.push(ring.rotation.clone());
  });

  shardParent = new TransformNode('shardsParent', targetScene);
  shardParent.position = new Vector3(0, sphereBasePosition.y + 0.4, 0);
  const shardMat = new StandardMaterial('shardMat', targetScene);
  shardMat.diffuseColor = new Color3(0.12, 0.35, 0.7);
  shardMat.emissiveColor = new Color3(0.3, 0.8, 1);
  shardMat.alpha = 0.85;

  const shardTemplate = MeshBuilder.CreateBox('shardTemplate', { size: 0.35 }, targetScene);
  shardTemplate.isVisible = false;
  shardTemplate.material = shardMat;

  const shardCount = 60;
  for (let i = 0; i < shardCount; i += 1) {
    const shard = shardTemplate.createInstance(`shard${i}`);
    shard.parent = shardParent;
    const radius = 3 + Math.random() * 2.5;
    const angle = (i / shardCount) * Math.PI * 2;
    shard.position = new Vector3(
      Math.cos(angle) * radius,
      sphereBasePosition.y + (Math.random() - 0.5) * 1.6,
      Math.sin(angle) * radius
    );
    shard.scaling = new Vector3(
      0.35 + Math.random() * 0.25,
      0.8 + Math.random() * 0.5,
      0.18 + Math.random() * 0.18
    );
    shard.rotation = new Vector3(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
  }

  const pillarMat = new StandardMaterial('pillarMat', targetScene);
  pillarMat.diffuseColor = new Color3(0.07, 0.1, 0.2);
  pillarMat.specularColor = new Color3(0.2, 0.4, 0.6);
  pillarMat.emissiveColor = new Color3(0.015, 0.04, 0.1);

  const pillarCount = 12;
  const pillarRadius = 13.5;
  for (let i = 0; i < pillarCount; i += 1) {
    const pillar = MeshBuilder.CreateCylinder(`pillar${i}`, {
      height: 4.2,
      diameterTop: 0.35,
      diameterBottom: 0.55,
      tessellation: 16
    }, targetScene);
    pillar.material = pillarMat;
    const angle = (i / pillarCount) * Math.PI * 2;
    const baseScale = 1 + Math.sin(i * 0.5) * 0.2;
    pillar.scaling.y = baseScale;
    pillar.position = new Vector3(
      Math.cos(angle) * pillarRadius,
      (4.2 * pillar.scaling.y) / 2,
      Math.sin(angle) * pillarRadius
    );
    pillar.rotation.y = angle + Math.PI / 2;
    pillarNodes.push(pillar);
    pillarBaseScales.push(baseScale);
  }
}

function setupUI() {
  const gravityBtn = document.getElementById('toggleGravity');
  const deviceBtn = document.getElementById('useDeviceCam');
  const rainBtn = document.getElementById('toggleRain');

  if (gravityBtn) {
    gravityBtn.addEventListener('click', () => {
      gravityEnabled = !gravityEnabled;
      togglePhysics(gravityEnabled);
      gravityBtn.textContent = gravityEnabled ? 'Désactiver la gravité' : 'Activer la gravité (demo)';
    });
  }

  if (deviceBtn) {
    deviceBtn.addEventListener('click', async () => {
      const granted = await requestDevicePermissions();
      if (!granted) {
        alert("Autorisez l'accès aux capteurs pour activer la caméra orientation.");
        return;
      }
      enableDeviceCamera(deviceBtn);
    });
  }

  if (rainBtn) {
    rainBtn.textContent = 'Désactiver la pluie';
    rainBtn.addEventListener('click', () => {
      rainEnabled = !rainEnabled;
      toggleRain(rainEnabled);
      rainBtn.textContent = rainEnabled ? 'Désactiver la pluie' : 'Activer la pluie';
    });
  }
}

async function requestDevicePermissions() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') {
        return false;
      }
    }
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      await DeviceMotionEvent.requestPermission().catch(() => {});
    }
    return true;
  } catch (err) {
    console.warn('Permissions capteurs refusées ou indisponibles', err);
    return false;
  }
}

function enableDeviceCamera(button) {
  if (deviceCameraActive) {
    return;
  }

  try {
    const devCam = new DeviceOrientationCamera('devcam', camera.position.clone(), scene);
    devCam.setTarget(Vector3.Zero());
    devCam.attachControl(canvas, true);

    camera.detachControl(canvas);
    scene.activeCamera = devCam;
    deviceCameraActive = true;
    attachDeviceEvents();

    if (button) {
      button.textContent = 'Gyroscope actif';
      button.disabled = true;
    }
  } catch (e) {
    console.warn('DeviceOrientationCamera non disponible dans ce contexte', e);
  }
}

function togglePhysics(enable) {
  if (enable) {
    const plugin = new CannonJSPlugin(true, 10, CANNON);
    scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);

    sphere.physicsImpostor = new PhysicsImpostor(
      sphere,
      PhysicsImpostor.SphereImpostor,
      { mass: 1, restitution: 0.8 },
      scene
    );

    ground.physicsImpostor = new PhysicsImpostor(
      ground,
      PhysicsImpostor.BoxImpostor,
      { mass: 0, restitution: 0.6 },
      scene
    );
  } else {
    if (sphere.physicsImpostor) {
      sphere.physicsImpostor.dispose();
      sphere.physicsImpostor = null;
    }
    if (ground.physicsImpostor) {
      ground.physicsImpostor.dispose();
      ground.physicsImpostor = null;
    }
    scene.disablePhysicsEngine();
  }
}

function attachDeviceEvents() {
  if (deviceEventsAttached) {
    return;
  }

  window.addEventListener('deviceorientation', handleOrientation, true);
  window.addEventListener('devicemotion', handleMotion, true);
  deviceEventsAttached = true;
}

function handleOrientation(event) {
  orientationState.alpha = event.alpha ?? orientationState.alpha;
  orientationState.beta = event.beta ?? orientationState.beta;
  orientationState.gamma = event.gamma ?? orientationState.gamma;
}

function handleMotion(event) {
  const accel = event.accelerationIncludingGravity;
  if (!accel) {
    return;
  }
  motionState.ax = accel.x ?? motionState.ax;
  motionState.ay = accel.y ?? motionState.ay;
  motionState.az = accel.z ?? motionState.az;
}

function updateDynamicAnimation() {
  if (!sphere) {
    return;
  }

  const deltaSeconds = scene.getEngine().getDeltaTime() * 0.001;
  elapsedTime += deltaSeconds;

  if (deviceCameraActive) {
    const targetX = (orientationState.beta * Math.PI) / 180 * 0.5;
    const targetY = (orientationState.gamma * Math.PI) / 180 * 0.5;
    const targetZ = (orientationState.alpha * Math.PI) / 180 * 0.15;

    sphere.rotation.x += (targetX - sphere.rotation.x) * 0.12;
    sphere.rotation.y += (targetY - sphere.rotation.y) * 0.12;
    sphere.rotation.z += (targetZ - sphere.rotation.z) * 0.12;

    const normalizedX = Math.max(-1, Math.min(1, motionState.ax / 9.81));
    const normalizedY = Math.max(-1, Math.min(1, motionState.ay / 9.81));

    if (!gravityEnabled) {
      const sphereTargetX = sphereBasePosition.x + normalizedX * 1.2;
      const sphereTargetY = sphereBasePosition.y - normalizedY * 1.1;
      sphere.position.x += (sphereTargetX - sphere.position.x) * 0.08;
      sphere.position.y += (sphereTargetY - sphere.position.y) * 0.08;
    }

    energyRings.forEach((ring, idx) => {
      const base = ringBaseRotations[idx];
      ring.rotation.x += ((base.x + targetY * 0.35) - ring.rotation.x) * 0.1;
      ring.rotation.z += ((base.z + targetX * 0.35) - ring.rotation.z) * 0.1;
      ring.rotation.y += 0.02 + idx * 0.006;
    });

    if (shardParent) {
      shardParent.rotation.y += 0.025 + targetY * 0.02;
      shardParent.rotation.x += (targetX * 0.15 - shardParent.rotation.x) * 0.08;
    }
  } else {
    sphere.rotation.y += 0.012;
    sphere.rotation.x = Math.sin(elapsedTime * 0.9) * 0.25;
    sphere.rotation.z = Math.cos(elapsedTime * 0.72) * 0.18;

    energyRings.forEach((ring, idx) => {
      const base = ringBaseRotations[idx];
      ring.rotation.y += 0.018 + idx * 0.004;
      ring.rotation.x = base.x + Math.sin(elapsedTime * 1.1 + idx) * 0.12;
      ring.rotation.z = base.z + Math.cos(elapsedTime * 0.9 + idx) * 0.12;
    });

    if (shardParent) {
      shardParent.rotation.y += 0.02;
      shardParent.rotation.x = Math.sin(elapsedTime * 0.6) * 0.18;
    }
  }

  if (shardParent) {
    const shimmer = 0.6 + Math.sin(elapsedTime * 4) * 0.4;
    shardParent.scaling.y = 1 + shimmer * 0.05;
  }

  pillarNodes.forEach((pillar, idx) => {
    const pulse = Math.sin(elapsedTime * 1.8 + idx) * 0.2;
    const baseScale = pillarBaseScales[idx] ?? 1;
    pillar.scaling.y = baseScale + pulse;
    pillar.position.y = (pillar.scaling.y * 4.2) / 2;
  });
}

function createRainSystem(targetScene) {
  const particles = new ParticleSystem('rain', 2000, targetScene);
  particles.particleTexture = new Texture('https://assets.babylonjs.com/textures/flare.png', targetScene);

  particles.emitter = new Vector3(0, 12, 0);
  const emitter = new BoxParticleEmitter();
  emitter.minEmitBox = new Vector3(-20, 0, -20);
  emitter.maxEmitBox = new Vector3(20, 0, 20);
  emitter.direction1 = new Vector3(-0.1, -1, 0.1);
  emitter.direction2 = new Vector3(0.1, -1, -0.1);
  particles.particleEmitterType = emitter;

  particles.emitRate = 1500;
  particles.minEmitPower = 25;
  particles.maxEmitPower = 30;
  particles.updateSpeed = 0.01;
  particles.minLifeTime = 0.5;
  particles.maxLifeTime = 1.5;
  particles.gravity = new Vector3(0, -20, 0);
  particles.color1 = new Color4(0.75, 0.85, 1, 0.6);
  particles.color2 = new Color4(0.55, 0.65, 0.9, 0.4);
  particles.colorDead = new Color4(0.75, 0.85, 1, 0);
  particles.minSize = 0.1;
  particles.maxSize = 0.25;
  particles.start();
  return particles;
}

function toggleRain(enable) {
  if (!rainSystem) {
    return;
  }

  if (enable) {
    rainSystem.start();
  } else {
    rainSystem.stop();
  }
}
