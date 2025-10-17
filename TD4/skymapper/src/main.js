import {
  Engine,
  Scene,
  ArcRotateCamera,
  DeviceOrientationCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  PointLight,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  PBRMaterial,
  Texture,
  TransformNode,
  GlowLayer,
  Animation,
  EasingFunction,
  CubicEase,
  Scalar,
  TrailMesh,
  ParticleSystem,
  DefaultRenderingPipeline,
  LensFlareSystem,
  LensFlare,
  VolumetricLightScatteringPostProcess,
  SpriteManager,
  Sprite,
  PointerEventTypes
} from 'babylonjs';
import starCatalog from './stars.json';
import starInfosCatalog from './stars_info.json';
import { playIntro } from './intro.js';

const assetUrl = (path) => new URL(path, import.meta.url).href;

const TEXTURE_URLS = {
  skyNight: assetUrl('./assets/sky_hdri_night.jpg'),
  skyDay: assetUrl('./assets/sky_hdri_day.jpg'),
  galaxy: assetUrl('./assets/galaxy.jpg'),
  atmosphere: assetUrl('./assets/textures/atmosphere.png'),
  starSprite: assetUrl('./assets/textures/star_sprite.png'),
  defaultStar: assetUrl('./assets/stars/default.jpg')
};

const PLANETS_DATA = [
  { name: 'Mercury', albedo: assetUrl('./assets/planets/mercury_color.jpg'), normal: assetUrl('./assets/planets/mercury_normal.jpg'), ra: 320, dec: 2, radius: 0.42, distance: '0.39 AU', size: 'Diameter 4 879 km', halo: '#d9cfbf', rotation: 0.0001 },
  { name: 'Venus', albedo: assetUrl('./assets/planets/venus_color.jpg'), normal: assetUrl('./assets/planets/venus_normal.jpg'), ra: 280, dec: -5, radius: 0.64, distance: '0.72 AU', size: 'Diameter 12 104 km', halo: '#f1d8b0', rotation: 0.00012 },
  { name: 'Earth', albedo: assetUrl('./assets/planets/earth_color.jpg'), normal: assetUrl('./assets/planets/earth_normal.jpg'), ra: 250, dec: 9, radius: 0.70, distance: '1.00 AU', size: 'Diameter 12 742 km', halo: '#9bd0ff', rotation: 0.0003 },
  { name: 'Mars', albedo: assetUrl('./assets/planets/mars_color.jpg'), normal: assetUrl('./assets/planets/mars_normal.jpg'), ra: 220, dec: -18, radius: 0.58, distance: '1.52 AU', size: 'Diameter 6 779 km', halo: '#ffb38d', rotation: 0.00024 },
  { name: 'Jupiter', albedo: assetUrl('./assets/planets/jupiter_color.jpg'), normal: assetUrl('./assets/planets/jupiter_normal.jpg'), ra: 150, dec: 12, radius: 1.45, distance: '5.20 AU', size: 'Diameter 139 820 km', halo: '#ffe6c4', rotation: 0.0006 },
  { name: 'Saturn', albedo: assetUrl('./assets/planets/saturn_color.jpg'), normal: assetUrl('./assets/planets/saturn_normal.jpg'), ra: 100, dec: -22, radius: 1.18, distance: '9.58 AU', size: 'Diameter 116 460 km', halo: '#ffdcaf', rotation: 0.0004 },
  { name: 'Uranus', albedo: assetUrl('./assets/planets/uranus_color.jpg'), normal: assetUrl('./assets/planets/uranus_normal.jpg'), ra: 60, dec: 14, radius: 0.95, distance: '19.2 AU', size: 'Diameter 50 724 km', halo: '#b1f5ff', rotation: 0.00035 },
  { name: 'Neptune', albedo: assetUrl('./assets/planets/neptune_color.jpg'), normal: assetUrl('./assets/planets/neptune_normal.jpg'), ra: 20, dec: -10, radius: 0.92, distance: '30.1 AU', size: 'Diameter 49 244 km', halo: '#78b4ff', rotation: 0.00032 }
];

const STAR_ILLUSTRATIONS = {
  sirius: assetUrl('./assets/stars/sirius.jpg'),
  polaris: assetUrl('./assets/stars/polaris.jpg'),
  betelgeuse: assetUrl('./assets/stars/betelgeuse.jpg'),
  rigel: assetUrl('./assets/stars/rigel.jpg'),
  vega: assetUrl('./assets/stars/vega.jpg'),
  deneb: assetUrl('./assets/stars/deneb.jpg'),
  altair: assetUrl('./assets/stars/altair.jpg'),
  antares: assetUrl('./assets/stars/antares.jpg'),
  capella: assetUrl('./assets/stars/capella.jpg'),
  procyon: assetUrl('./assets/stars/procyon.jpg'),
  default: TEXTURE_URLS.defaultStar
};

const resolveIllustrationUrl = (name, rawPath) => {
  const keyFromName = name?.toLowerCase();
  if (keyFromName && STAR_ILLUSTRATIONS[keyFromName]) {
    return STAR_ILLUSTRATIONS[keyFromName];
  }
  if (rawPath) {
    const sanitizedPath = rawPath.replace(/^(?:\.\/|\/)/, '');
    const keyFromPath = sanitizedPath.split('/').pop()?.split('.')[0]?.toLowerCase();
    if (keyFromPath && STAR_ILLUSTRATIONS[keyFromPath]) {
      return STAR_ILLUSTRATIONS[keyFromPath];
    }
    const relativePath = rawPath.startsWith('.') ? rawPath : `./${sanitizedPath}`;
    return assetUrl(relativePath);
  }
  return STAR_ILLUSTRATIONS.default;
};

const canvas = document.getElementById('ciel-canvas');
const appContainer = document.getElementById('app');
const audioAmbienceElement = document.getElementById('audio-ambiance');
const buttonOrientation = document.getElementById('btn-orientation');
const buttonConstellations = document.getElementById('btn-constellations');
const buttonMode = document.getElementById('btn-mode');
const buttonComets = document.getElementById('btn-cometes');
const buttonExploration = document.getElementById('btn-exploration');
const buttonAudio = document.getElementById('btn-audio');
const buttonLearning = document.getElementById('btn-apprentissage');
const buttonFullscreen = document.getElementById('btn-fullscreen');
const buttonDemo = document.getElementById('btn-demo');
const buttonExitFocus = document.getElementById('btn-exit-focus');
const searchForm = document.getElementById('form-recherche');
const searchInput = document.getElementById('champ-recherche');
const searchButton = document.getElementById('btn-recherche');
const suggestionsList = document.getElementById('suggestions');
const infoPanel = document.getElementById('etoile-infos');
const infoIllustration = document.getElementById('etoile-illustration');
const infoName = document.getElementById('etoile-nom');
const infoMagnitude = document.getElementById('etoile-mag');
const infoConstellation = document.getElementById('etoile-constellation');
const infoDistance = document.getElementById('etoile-distance');
const infoType = document.getElementById('etoile-type');
const buttonShowConstellation = document.getElementById('btn-voir-constellation');
const buttonCloseInfo = document.getElementById('btn-fermer-info');
const overlayMessage = document.getElementById('overlay-message');
const hudArrow = document.getElementById('hud-arrow');
const demoTextOverlay = document.getElementById('demo-overlay-text');

const SKY_RADIUS = 50;
const STARS_RADIUS = SKY_RADIUS * 0.985;
const DOME_ROTATION_MS = 120000;
const SKY_TRANSITION_MS = 2000;
const IDLE_DRIFT_DELAY_MS = 6000;
const DRIFT_ALPHA_SPEED = 0.00004;
const DRIFT_BETA_SPEED = 0.000015;
const COMET_DURATION_MS = 14000;
const COMET_INTERVAL_MS = 24000;
const EXPLORATION_MESSAGE_MS = 6500;
const MAX_SUGGESTIONS = 5;
const DEG2RAD = Math.PI / 180;
const CAMERA_DEFAULTS = {
  alpha: Math.PI / 2,
  beta: Math.PI / 2.6,
  radius: 34
};
const CAMERA_TRANSITION_FRAMES = 90; // ~1.5s smooth transition
const DEMO_ORBIT_PERIOD_MS = 60000;
const DEMO_TEXT_INTERVAL_MS = 7000;
const CONSTELLATION_FADE_MS = 1200;
const HDRI_ROTATION_SPEED = 0.00001;
const AUDIO_BASE_NIGHT = 0.7;
const AUDIO_BASE_DAY = 0.6;
const AUDIO_FOCUS_GAIN = 0.5;
const AUDIO_DEMO_GAIN = 1.0;

const inspirationMessages = [
  'Sailor, Orion lights your path tonight.',
  'Cassiopeia whispers ancient stories to patient listeners.',
  'Every star is a note in the cosmic symphony.',
  'The Milky Way flows like silver across the void.',
  'Polaris still guides those who dare to wander.',
  'Let the horizon fade; the night sky will keep you safe.'
];

const demoMessages = [
  'Orion veille sur la nuit.',
  'Sirius, la plus brillante du ciel.',
  'Cassiopeia dessine une couronne éternelle.',
  'La Voie lactée se dévoile en silence.',
  'Altair, Deneb et Véga forment un triangle de lumière.'
];

const CONSTELLATIONS = [
  { name: 'Ursa Major', segments: [['Dubhe', 'Merak', 'Phecda', 'Megrez', 'Alioth', 'Mizar', 'Alkaid']] },
  { name: 'Orion', segments: [
    ['Betelgeuse', 'Bellatrix', 'Mintaka', 'Alnilam', 'Alnitak', 'Saiph', 'Rigel'],
    ['Betelgeuse', 'Saiph'],
    ['Bellatrix', 'Rigel']
  ] },
  { name: 'Cassiopeia', segments: [['Caph', 'Schedar', 'Ruchbah', 'Segin', 'Achird']] },
  { name: 'Summer Triangle', segments: [['Vega', 'Deneb', 'Altair', 'Vega']] },
  { name: 'Aquila', segments: [['Altair', 'Tarazed', 'Alshain']] },
  { name: 'Cygnus', segments: [['Deneb', 'Sadr', 'Gienah']] },
  { name: 'Scorpius', segments: [['Antares', 'Shaula', 'Sargas']] },
  { name: 'Taurus', segments: [['Aldebaran', 'Elnath']] },
  { name: 'Leo', segments: [['Regulus', 'Algieba', 'Denebola']] },
  { name: 'Pegasus', segments: [['Markab', 'Scheat', 'Algenib', 'Enif']] },
  { name: 'Andromeda', segments: [['Alpheratz', 'Mirach', 'Almach']] }
];

const state = {
  engine: null,
  scene: null,
  glow: null,
  cameraOrbit: null,
  cameraOrientation: null,
  pipeline: null,
  domeRoot: null,
  skyNight: null,
  skyDay: null,
  galaxy: null,
  galaxyMaterial: null,
  starManager: null,
  starNodes: [],
  constellationLines: [],
  constellationAuras: new Map(),
  starMap: new Map(),
  planets: new Map(),
  hazeSystem: null,
  dustSystem: null,
  meteorSystem: null,
  comet: {
    mesh: null,
    trail: null,
    material: null,
    trailMaterial: null,
    active: false,
    travel: 0,
    wait: 6000,
    start: new Vector3(),
    end: new Vector3(),
    temp: new Vector3()
  },
  sun: {
    light: null,
    mesh: null,
    lens: null,
    volumetric: null
  },
  audio: {
    enabled: false,
    context: null,
    source: null,
    gain: null,
    filter: null,
    gainTarget: 0,
    freqTarget: 2000,
    ready: false,
    profile: 'default'
  },
  modeFocus: false,
  modeDemo: false,
  nightMode: true,
  orientationMode: false,
  constellationsVisible: false,
  explorationMode: false,
  cometsEnabled: true,
  learningMode: false,
  twinkleEnabled: true,
  starList: [],
  starInfos: {},
  suggestions: [],
  lastConstellation: null,
  lastInteraction: performance.now(),
  sceneReady: false,
  hdriActive: false,
  focus: {
    targetName: null,
    previousState: null
  },
  demo: {
    timer: 0,
    orbitSpeed: (Math.PI * 2) / DEMO_ORBIT_PERIOD_MS,
    focusTimer: 0,
    textTimer: 0,
    textDisplayTimer: 0,
    constellationTimer: 0,
    targetAlpha: null,
    targetBeta: null,
    targetRadius: null,
    activeConstellation: null,
    previousConstellations: false
  },
  exploration: {
    timer: 0,
    alphaTarget: null,
    betaTarget: null,
    messageTimer: 0
  },
  audioLerp: 0.0035
};

playIntro()
  .catch((error) => {
    console.warn('Intro animation failed to play correctly:', error);
  })
  .finally(() => {
    requestAnimationFrame(() => {
      document.getElementById('ciel-canvas')?.classList.add('canvas-visible');
    });
    initScene().catch((error) => {
      console.error('Failed to initialise SkyMapper:', error);
    });
  });

async function initScene() {
  state.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  state.scene = new Scene(state.engine);
  const { scene } = state;

  scene.clearColor = new Color3(0.02, 0.03, 0.08);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.008;
  scene.fogColor = new Color3(0.02, 0.03, 0.06);

  state.cameraOrbit = new ArcRotateCamera('camera-orbit', CAMERA_DEFAULTS.alpha, CAMERA_DEFAULTS.beta, CAMERA_DEFAULTS.radius, Vector3.Zero(), scene);
  state.cameraOrbit.lowerRadiusLimit = 8;
  state.cameraOrbit.upperRadiusLimit = 80;
  state.cameraOrbit.wheelDeltaPercentage = 0.01;
  state.cameraOrbit.useNaturalPinchZoom = true;
  state.cameraOrbit.attachControl(canvas, true);
  state.cameraOrbit.inertia = 0.8;
  scene.activeCamera = state.cameraOrbit;

  state.pipeline = new DefaultRenderingPipeline('default', true, scene, [state.cameraOrbit]);
  const pipeline = state.pipeline;
  pipeline.samples = 4;
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.exposure = 1.25;
  pipeline.imageProcessing.contrast = 1.4;
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.6;
  pipeline.bloomWeight = 0.4;
  pipeline.chromaticAberrationEnabled = true;
  pipeline.chromaticAberration.aberrationAmount = 2;
  pipeline.vignetteEnabled = true;
  pipeline.vignetteWeight = 0.9;
  pipeline.depthOfFieldEnabled = true;
  pipeline.depthOfField.focusDistance = 1800;
  pipeline.depthOfField.focalLength = 150;
  pipeline.depthOfField.fStop = 1.8;

  state.glow = new GlowLayer('glow', scene);
  state.glow.intensity = 0.6;

  installUserInteractions();
  createSunSystem();
  createLights();
  createSkyDome();
  createGalaxyBelt();
  createCosmicHaze();
  createFloatingDust();
  createComet();
  createMeteorSystem();

  try {
    const [stars, infos] = await Promise.all([loadStars(), loadStarInfos()]);
    state.starList = stars;
    state.starInfos = infos;
    createStarManager(stars.length + 20);
    stars.forEach((star) => addStar(star));
    createConstellations();
  } catch (error) {
    console.error('Failed to load star data:', error);
  }

  addPlanets();
  initHudOrientation();

  scene.onPointerObservable.add(() => {
    noteUserInteraction();
  });
  canvas.addEventListener('wheel', () => {
    noteUserInteraction();
  }, { passive: true });
  canvas.addEventListener('touchstart', () => {
    noteUserInteraction();
  }, { passive: true });
  window.addEventListener('keydown', () => {
    noteUserInteraction();
  });

  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) {
      return;
    }
    const pick = scene.pick(scene.pointerX, scene.pointerY);
    if (!pick?.hit || !pick.pickedMesh) {
      return;
    }
      const metadata = pick.pickedMesh.metadata;
    if (!metadata) {
      return;
    }
    if (metadata.type === 'star' && state.learningMode) {
      focusOnTarget(metadata.name, true, true);
      showStarInfo(metadata.name);
    }
    if (metadata.type === 'planet') {
      followPlanet(metadata.name);
      showPlanetInfo(metadata.name);
    }
  });

  scene.onBeforeRenderObservable.add(() => {
    const delta = scene.getEngine().getDeltaTime();
    state.domeRoot.rotation.y += (2 * Math.PI * delta) / DOME_ROTATION_MS;
    if (state.hdriActive) {
      state.skyNight.rotation.y += HDRI_ROTATION_SPEED * delta;
      state.skyDay.rotation.y += HDRI_ROTATION_SPEED * delta;
    }
    animateStars(delta);
    if (state.modeDemo) {
      updateDemo(delta);
    } else if (!state.modeFocus) {
      updateCameraAuto(delta);
      updateExploration(delta);
    }
    updateComet(delta);
    updateHudOrientation();
    updateMeteors(delta);
    updatePlanets(delta);
    updateAudio(delta);
    updateBackgroundColor();
  });

  state.engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener('resize', () => {
    state.engine.resize();
  });

  applyNightMode(true, true);
  state.sceneReady = true;
  state.hdriActive = true;

  if (/Mobi|Android/i.test(navigator.userAgent)) {
    document.addEventListener('touchend', () => {
      if (!document.fullscreenElement) {
        toggleFullscreen().catch(() => {});
      }
    }, { once: true, passive: true });
  }
}

function noteUserInteraction() {
  state.lastInteraction = performance.now();
  if (state.modeDemo) {
    setDemoMode(false, true);
  }
}

function installUserInteractions() {
  buttonOrientation.addEventListener('click', () => toggleOrientation());
  buttonConstellations.addEventListener('click', () => toggleConstellations());
  buttonMode.addEventListener('click', () => switchNightMode());
  buttonComets.addEventListener('click', () => toggleComets());
  buttonExploration.addEventListener('click', () => setExplorationMode(!state.explorationMode));
  buttonAudio.addEventListener('click', () => toggleAudio());
  buttonLearning.addEventListener('click', () => setLearningMode(!state.learningMode));
  buttonFullscreen.addEventListener('click', () => toggleFullscreen());
  buttonDemo?.addEventListener('click', () => setDemoMode(!state.modeDemo));
  buttonExitFocus?.addEventListener('click', () => exitFocusMode());
  if (buttonExitFocus) {
    buttonExitFocus.dataset.visible = 'false';
  }

  document.addEventListener('fullscreenchange', () => {
    buttonFullscreen.dataset.active = document.fullscreenElement ? 'true' : 'false';
  });

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      searchStar(searchInput.value);
    });
    searchButton?.addEventListener('click', (event) => {
      event.preventDefault();
      searchStar(searchInput.value);
    });
    searchInput.addEventListener('input', () => {
      const value = searchInput.value.trim();
      if (value.length < 2) {
        suggestionsList.hidden = true;
        suggestionsList.innerHTML = '';
        state.suggestions = [];
        return;
      }
      renderSuggestions(value);
    });
  }

  buttonShowConstellation?.addEventListener('click', () => {
    if (state.lastConstellation) {
      highlightConstellation(state.lastConstellation);
    }
  });

  buttonCloseInfo?.addEventListener('click', () => hideInfoPanel());
}

function createSunSystem() {
  const { scene } = state;
  state.sun.light = new DirectionalLight('sun-directional', new Vector3(-0.5, -0.8, 0.4), scene);
  state.sun.light.position = new Vector3(35, 25, -45);
  state.sun.light.intensity = 2.2;
  state.sun.mesh = MeshBuilder.CreateSphere('sun-core', { diameter: 3, segments: 24 }, scene);
  state.sun.mesh.position = state.sun.light.position.clone();
  const mat = new StandardMaterial('sun-mat', scene);
  mat.emissiveColor = new Color3(1, 0.92, 0.65);
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  state.sun.mesh.material = mat;
  state.sun.mesh.isPickable = false;
  state.glow.addIncludedOnlyMesh(state.sun.mesh);

  state.sun.lens = new LensFlareSystem('lens', state.sun.mesh, scene);
  new LensFlare(0.4, 0.0, new Color3(1, 0.9, 0.7), state.sun.lens);
  new LensFlare(0.2, 0.3, new Color3(0.7, 0.8, 1), state.sun.lens);
  new LensFlare(0.1, 0.6, new Color3(0.5, 0.7, 1), state.sun.lens);
  new LensFlare(0.05, 1, new Color3(1, 1, 1), state.sun.lens);

  state.sun.volumetric = new VolumetricLightScatteringPostProcess(
    'godrays',
    1,
    state.cameraOrbit,
    state.sun.mesh,
    100,
    Texture.BILINEAR_SAMPLINGMODE,
    state.engine,
    false
  );
}

function createLights() {
  const { scene } = state;
  const hemi = new HemisphericLight('hemisphere', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.55;
  const point = new PointLight('halo', new Vector3(0, 8, 0), scene);
  point.diffuse = new Color3(0.3, 0.5, 0.8);
  point.specular = new Color3(0.6, 0.7, 1);
  point.intensity = 0.25;
}

function createSkyDome() {
  const { scene } = state;
  state.domeRoot = new TransformNode('sky-root', scene);

  state.skyNight = MeshBuilder.CreateSphere('sky-night', { diameter: SKY_RADIUS * 2, segments: 64, sideOrientation: Mesh.BACKSIDE }, scene);
  state.skyNight.parent = state.domeRoot;
  const matNight = new StandardMaterial('sky-night-mat', scene);
  matNight.diffuseTexture = new Texture(TEXTURE_URLS.skyNight, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
  matNight.diffuseTexture.coordinatesMode = Texture.SPHERICAL_MODE;
  matNight.emissiveColor = new Color3(0.05, 0.06, 0.16);
  matNight.backFaceCulling = false;
  matNight.alpha = 1;
  matNight.disableLighting = true;
  state.skyNight.material = matNight;

  state.skyDay = MeshBuilder.CreateSphere('sky-day', { diameter: SKY_RADIUS * 2, segments: 64, sideOrientation: Mesh.BACKSIDE }, scene);
  state.skyDay.parent = state.domeRoot;
  const matDay = new StandardMaterial('sky-day-mat', scene);
  matDay.diffuseTexture = new Texture(TEXTURE_URLS.skyDay, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
  matDay.diffuseTexture.coordinatesMode = Texture.SPHERICAL_MODE;
  matDay.emissiveColor = new Color3(0.24, 0.3, 0.45);
  matDay.backFaceCulling = false;
  matDay.alpha = 0;
  matDay.disableLighting = true;
  state.skyDay.material = matDay;

  state.skyDay.isPickable = false;
  state.skyNight.isPickable = false;
}

function createGalaxyBelt() {
  const { scene } = state;
  state.galaxy = MeshBuilder.CreateSphere('galaxy-belt', { diameter: SKY_RADIUS * 2.1, segments: 64, sideOrientation: Mesh.BACKSIDE }, scene);
  state.galaxy.parent = state.domeRoot;
  const texture = new Texture(TEXTURE_URLS.galaxy, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  texture.hasAlpha = true;
  const material = new StandardMaterial('galaxy-mat', scene);
  material.emissiveTexture = texture;
  material.alpha = 0.5;
  material.diffuseColor = Color3.Black();
  material.backFaceCulling = false;
  material.disableLighting = true;
  state.galaxy.material = material;
  state.galaxy.rotation.x = Math.PI / 6;
  state.galaxy.rotation.z = Math.PI / 8;
  state.galaxyMaterial = material;
}

function createCosmicHaze() {
  const { scene } = state;
  const system = new ParticleSystem('cosmic-haze', 1200, scene);
  system.particleTexture = new Texture(TEXTURE_URLS.atmosphere, scene);
  system.emitter = new Vector3(0, 0, 0);
  system.minEmitBox = new Vector3(-20, -10, -20);
  system.maxEmitBox = new Vector3(20, 10, 20);
  system.color1 = new Color4(0.4, 0.6, 1, 0.08);
  system.color2 = new Color4(0.6, 0.4, 1, 0.05);
  system.colorDead = new Color4(0.2, 0.3, 0.6, 0);
  system.minSize = 4;
  system.maxSize = 8;
  system.minLifeTime = 6;
  system.maxLifeTime = 12;
  system.emitRate = 60;
  system.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  system.gravity = new Vector3(0, 0, 0);
  system.direction1 = new Vector3(-0.1, 0.02, 0.1);
  system.direction2 = new Vector3(0.1, 0.01, -0.1);
  system.updateSpeed = 0.01;
  system.start();
  state.hazeSystem = system;
}

function createFloatingDust() {
  const { scene } = state;
  const system = new ParticleSystem('space-dust', 900, scene);
  system.particleTexture = new Texture(TEXTURE_URLS.starSprite, scene);
  system.emitter = new Vector3(0, 0, 0);
  system.minEmitBox = new Vector3(-15, -8, -15);
  system.maxEmitBox = new Vector3(15, 8, 15);
  system.color1 = new Color4(0.7, 0.8, 1, 0.12);
  system.color2 = new Color4(0.2, 0.5, 1, 0.06);
  system.colorDead = new Color4(0.2, 0.3, 0.6, 0);
  system.minSize = 0.15;
  system.maxSize = 0.4;
  system.minLifeTime = 5;
  system.maxLifeTime = 10;
  system.emitRate = 45;
  system.gravity = new Vector3(0, 0, 0);
  system.direction1 = new Vector3(-0.05, 0.02, 0.05);
  system.direction2 = new Vector3(0.05, 0.02, -0.05);
  system.updateSpeed = 0.0075;
  system.start();
  state.dustSystem = system;
}

function createStarManager(maxCount) {
  state.starManager = new SpriteManager('stars', TEXTURE_URLS.starSprite, maxCount, { width: 256, height: 256 }, state.scene);
  state.starManager.blendMode = ParticleSystem.BLENDMODE_ADD;
}

async function loadStars() {
  return starCatalog;
}

async function loadStarInfos() {
  if (!starInfosCatalog) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(starInfosCatalog).map(([name, info]) => [
      name,
      {
        ...info,
        illustration: resolveIllustrationUrl(name, info.illustration)
      }
    ])
  );
}

function addStar(star) {
  const position = raDecToVector(star.ra, star.dec, STARS_RADIUS);
  const brightness = normalizeMagnitude(star.mag);
  const baseSize = 0.55 + brightness * 1.6;
  const baseColor = Color3.FromHexString(star.color);
  const intensity = 0.45 + brightness * 1.6;

  const sprite = new Sprite(`sprite-${star.name}`, state.starManager);
  sprite.position = position.clone();
  sprite.size = baseSize;
  sprite.color = new Color4(baseColor.r * intensity, baseColor.g * intensity, baseColor.b * intensity * 1.05, 1);
  sprite.isPickable = false;
  sprite.angle = Scalar.RandomRange(0, Math.PI * 2);
  sprite.parent = state.domeRoot;

  const pickMesh = MeshBuilder.CreateSphere(`star-${star.name}`, { diameter: 0.05, segments: 4 }, state.scene);
  pickMesh.position = position;
  pickMesh.parent = state.domeRoot;
  pickMesh.isVisible = false;
  pickMesh.metadata = {
    type: 'star',
    name: star.name,
    sprite,
    baseSize,
    baseColor,
    nightIntensity: intensity,
    dayIntensity: intensity * 0.32,
    currentIntensity: intensity,
    targetIntensity: intensity,
    phase: Math.random() * Math.PI * 2,
    amplitude: 0.07 * Scalar.RandomRange(0.8, 1.3),
    haloScale: star.mag < 1 ? 1.35 : 1
  };

  state.starNodes.push(pickMesh);
  state.starMap.set(star.name.toLowerCase(), pickMesh);
}

function createConstellations() {
  state.constellationLines = [];
  state.constellationAuras.clear();
  CONSTELLATIONS.forEach((definition) => {
    definition.segments.forEach((segment, index) => {
      const points = segment
        .map((name) => state.starMap.get(name.toLowerCase()))
        .filter(Boolean)
        .map((mesh) => mesh.position.clone());
      if (points.length < 2) {
        return;
      }
      const lines = MeshBuilder.CreateLines(`constellation-${definition.name}-${index}`, { points }, state.scene);
      lines.color = new Color3(0.2, 0.67, 1);
      lines.alpha = 0.8;
      lines.isVisible = state.constellationsVisible;
      lines.parent = state.domeRoot;
      lines.metadata = { name: definition.name };
      lines.enableEdgesRendering(0.6);
      lines.isPickable = false;

      const aura = createConstellationAura(definition.name, points);
      aura.isVisible = state.constellationsVisible;

      state.constellationLines.push(lines);
    });
  });
}

function createConstellationAura(name, points) {
  const center = points.reduce((acc, point) => acc.add(point), new Vector3()).scale(1 / points.length);
  const aura = MeshBuilder.CreateDisc(`aura-${name}`, { radius: 3.5, tessellation: 48 }, state.scene);
  aura.parent = state.domeRoot;
  aura.position = center;
  aura.billboardMode = Mesh.BILLBOARDMODE_ALL;
  aura.isPickable = false;

  const mat = new StandardMaterial(`aura-mat-${name}`, state.scene);
  mat.emissiveColor = new Color3(0.18, 0.5, 1);
  mat.alpha = 0.18;
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.backFaceCulling = false;
  mat.disableLighting = true;
  mat.emissiveTexture = new Texture(TEXTURE_URLS.atmosphere, state.scene);
  mat.emissiveTexture.hasAlpha = true;
  aura.material = mat;

  state.constellationAuras.set(name, aura);
  return aura;
}

function toggleConstellations() {
  state.constellationsVisible = !state.constellationsVisible;
  state.constellationLines.forEach((line) => {
    line.isVisible = state.constellationsVisible;
  });
  state.constellationAuras.forEach((aura) => {
    aura.isVisible = state.constellationsVisible;
  });
  buttonConstellations.dataset.active = state.constellationsVisible ? 'true' : 'false';
}

async function toggleOrientation() {
  if (state.orientationMode) {
    if (state.cameraOrientation) {
      state.cameraOrientation.detachControl(canvas);
    }
    state.scene.activeCamera = state.cameraOrbit;
    state.cameraOrbit.attachControl(canvas, true);
    state.orientationMode = false;
    buttonOrientation.dataset.active = 'false';
    refreshPipelineCamera();
    return;
  }

  if (state.modeDemo) {
    setDemoMode(false, true);
  }
  if (state.modeFocus) {
    exitFocusMode();
  }
  if (state.explorationMode) {
    setExplorationMode(false);
  }

  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const response = await DeviceOrientationEvent.requestPermission();
      if (response !== 'granted') {
        alert('Orientation sensors were not authorised. Please enable them in your settings.');
        return;
      }
    } catch (error) {
      alert('Orientation sensors are not available on this device.');
      return;
    }
  }

  if (!state.cameraOrientation) {
    state.cameraOrientation = new DeviceOrientationCamera('camera-orientation', Vector3.Zero(), state.scene);
    state.cameraOrientation.minZ = 0.1;
    state.cameraOrientation.maxZ = 2000;
    state.cameraOrientation.fov = state.cameraOrbit.fov;
  }

  state.cameraOrbit.detachControl(canvas);
  state.scene.activeCamera = state.cameraOrientation;
  state.cameraOrientation.attachControl(canvas, true);
  state.cameraOrientation.setTarget(Vector3.Zero());
  state.orientationMode = true;
  state.explorationMode = false;
  buttonExploration.dataset.active = 'false';
  buttonOrientation.dataset.active = 'true';
  refreshPipelineCamera();
}

function refreshPipelineCamera() {
  if (state.pipeline) {
    state.pipeline.cameras = [state.scene.activeCamera];
  }
  if (state.sun.volumetric) {
    state.sun.volumetric.attachedCamera = state.scene.activeCamera;
  }
}

function switchNightMode() {
  state.nightMode = !state.nightMode;
  applyNightMode(state.nightMode, false);
  buttonMode.dataset.active = state.nightMode ? 'true' : 'false';
}

function applyNightMode(night, instant) {
  const easing = new CubicEase();
  easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  const frames = instant ? 1 : 120;

  const nightTarget = night ? 1 : 0;
  const dayTarget = night ? 0 : 1;
  Animation.CreateAndStartAnimation('sky-night-alpha', state.skyNight.material, 'alpha', 60, frames, state.skyNight.material.alpha, nightTarget, 0, easing);
  Animation.CreateAndStartAnimation('sky-day-alpha', state.skyDay.material, 'alpha', 60, frames, state.skyDay.material.alpha, dayTarget, 0, easing);

  const fogTarget = night ? new Color3(0.02, 0.03, 0.06) : new Color3(0.45, 0.55, 0.75);
  animateColor(state.scene.fogColor, fogTarget, 'fog-color', frames, easing);
  Animation.CreateAndStartAnimation('fog-density', state.scene, 'fogDensity', 60, frames, state.scene.fogDensity, night ? 0.008 : 0.0045, 0, easing);

  Animation.CreateAndStartAnimation('exposure', state.pipeline.imageProcessing, 'exposure', 60, frames, state.pipeline.imageProcessing.exposure, night ? 1.25 : 1.1, 0, easing);
  Animation.CreateAndStartAnimation('bloom-threshold', state.pipeline, 'bloomThreshold', 60, frames, state.pipeline.bloomThreshold, night ? 0.6 : 0.75, 0, easing);

  state.starNodes.forEach((mesh) => {
    const data = mesh.metadata;
    if (!data) {
      return;
    }
    data.targetIntensity = night ? data.nightIntensity : data.dayIntensity;
  });

  state.galaxyMaterial.alpha = night ? 0.5 : 0.18;

  if (state.audio.enabled && state.audio.gain) {
    refreshAudioTargets();
  }
}

function animateColor(color, target, name, frames, easing) {
  Animation.CreateAndStartAnimation(`${name}-r`, color, 'r', 60, frames, color.r, target.r, 0, easing);
  Animation.CreateAndStartAnimation(`${name}-g`, color, 'g', 60, frames, color.g, target.g, 0, easing);
  Animation.CreateAndStartAnimation(`${name}-b`, color, 'b', 60, frames, color.b, target.b, 0, easing);
}

function baseAudioGain(profile = state.audio.profile) {
  if (profile === 'focus') {
    return AUDIO_FOCUS_GAIN;
  }
  if (profile === 'demo') {
    return AUDIO_DEMO_GAIN;
  }
  return state.nightMode ? AUDIO_BASE_NIGHT : AUDIO_BASE_DAY;
}

function baseAudioFrequency(profile = state.audio.profile) {
  if (profile === 'demo') {
    return state.nightMode ? 2000 : 2600;
  }
  return state.nightMode ? 1600 : 2200;
}

function refreshAudioTargets() {
  if (!state.audio.gain) {
    return;
  }
  state.audio.gainTarget = baseAudioGain();
  state.audio.freqTarget = baseAudioFrequency();
}

function setAudioProfile(profile) {
  state.audio.profile = profile;
  if (state.audio.enabled) {
    refreshAudioTargets();
  }
}

function animateStars(delta) {
  if (!state.twinkleEnabled) {
    return;
  }
  const now = performance.now();
  state.starNodes.forEach((mesh) => {
    const data = mesh.metadata;
    if (!data) {
      return;
    }
    const sprite = data.sprite;
    const shift = data.targetIntensity - data.currentIntensity;
    data.currentIntensity += shift * 0.02 * (delta / 16.6);
    const twinkle = data.amplitude * Math.sin(now / 900 + data.phase);
    const finalIntensity = data.currentIntensity * (1 + twinkle);
    sprite.size = data.baseSize * data.haloScale * (0.95 + Math.abs(twinkle) * 0.12);
    sprite.color = new Color4(
      data.baseColor.r * finalIntensity,
      data.baseColor.g * finalIntensity,
      data.baseColor.b * finalIntensity * 1.05,
      1
    );
  });
}

function normalizeMagnitude(mag) {
  const min = -1.5;
  const max = 6.5;
  const clamp = Math.min(Math.max(mag, min), max);
  return 1 - (clamp - min) / (max - min);
}

function raDecToVector(raDeg, decDeg, radius) {
  const ra = raDeg * DEG2RAD;
  const dec = decDeg * DEG2RAD;
  const x = radius * Math.cos(dec) * Math.cos(ra);
  const z = radius * Math.cos(dec) * Math.sin(ra);
  const y = radius * Math.sin(dec);
  return new Vector3(x, y, z);
}

function toggleComets() {
  state.cometsEnabled = !state.cometsEnabled;
  buttonComets.dataset.active = state.cometsEnabled ? 'true' : 'false';
  if (!state.cometsEnabled && state.comet.mesh) {
    state.comet.active = false;
    state.comet.mesh.isVisible = false;
    state.comet.trail.isVisible = false;
    state.comet.wait = COMET_INTERVAL_MS;
  }
}

function setExplorationMode(enabled) {
  if (enabled && state.modeFocus) {
    exitFocusMode();
  }
  if (enabled && state.modeDemo) {
    setDemoMode(false, true);
  }
  state.explorationMode = enabled;
  buttonExploration.dataset.active = enabled ? 'true' : 'false';
  if (enabled) {
    state.orientationMode = false;
    if (state.cameraOrientation) {
      state.cameraOrientation.detachControl(canvas);
    }
    state.scene.activeCamera = state.cameraOrbit;
    state.cameraOrbit.attachControl(canvas, true);
    chooseExplorationTarget();
    showExplorationMessage();
    refreshPipelineCamera();
  } else {
    state.exploration.alphaTarget = null;
    state.exploration.betaTarget = null;
    if (overlayMessage) {
      overlayMessage.hidden = true;
    }
  }
}

function setDemoMode(enabled, fromInteraction = false) {
  if (enabled === state.modeDemo) {
    return;
  }
  if (enabled) {
    if (state.modeFocus) {
      exitFocusMode();
    }
    if (state.explorationMode) {
      setExplorationMode(false);
    }
    if (state.orientationMode) {
      toggleOrientation().catch(() => {});
    }
    state.modeDemo = true;
    state.demo.timer = 0;
    state.demo.focusTimer = 0;
    state.demo.textTimer = 0;
    state.demo.textDisplayTimer = 0;
    state.demo.constellationTimer = 0;
    state.demo.targetAlpha = null;
    state.demo.targetBeta = null;
    state.demo.targetRadius = null;
    state.demo.activeConstellation = null;
    state.demo.previousConstellations = state.constellationsVisible;
    buttonDemo?.setAttribute('data-active', 'true');
    state.cameraOrbit.detachControl(canvas);
    setAudioProfile('demo');
    state.pipeline.vignetteWeight = 1.2;

    if (!state.constellationsVisible) {
      state.constellationsVisible = true;
      buttonConstellations.dataset.active = 'true';
    }
    state.constellationLines.forEach((line) => {
      line.isVisible = true;
      line.alpha = 0.05;
    });
    state.constellationAuras.forEach((aura) => {
      aura.isVisible = true;
      aura.material.alpha = 0;
    });

  cycleDemoConstellation(true);
  showDemoText(demoMessages[Math.floor(Math.random() * demoMessages.length)]);
  pickDemoTarget();
  } else {
    if (!state.modeDemo) {
      return;
    }
    state.modeDemo = false;
    buttonDemo?.setAttribute('data-active', 'false');
    state.pipeline.vignetteWeight = 0.9;
    hideDemoText(true);
    if (!state.demo.previousConstellations) {
      state.constellationsVisible = false;
      buttonConstellations.dataset.active = 'false';
      state.constellationLines.forEach((line) => {
        line.isVisible = false;
      });
      state.constellationAuras.forEach((aura) => {
        aura.isVisible = false;
      });
    } else {
      state.constellationLines.forEach((line) => {
        line.alpha = 0.8;
        line.isVisible = true;
      });
      state.constellationAuras.forEach((aura) => {
        aura.material.alpha = 0.18;
        aura.isVisible = true;
      });
    }
    state.demo.activeConstellation = null;
    if (!state.modeFocus) {
      setAudioProfile('default');
    }
    animateCamera(CAMERA_DEFAULTS.alpha, CAMERA_DEFAULTS.beta, {
      radius: CAMERA_DEFAULTS.radius,
      frames: CAMERA_TRANSITION_FRAMES,
      onComplete: () => {
        if (!state.modeFocus && !state.orientationMode) {
          state.cameraOrbit.attachControl(canvas, true);
        }
      }
    });
  }
  if (!fromInteraction) {
    if (enabled) {
      state.lastInteraction = performance.now();
    } else {
      noteUserInteraction();
    }
  }
}

function cycleDemoConstellation(initial = false) {
  if (state.constellationLines.length === 0) {
    return;
  }
  const names = Array.from(new Set(state.constellationLines.map((line) => line.metadata?.name).filter(Boolean)));
  if (names.length === 0) {
    return;
  }
  let next = names[Math.floor(Math.random() * names.length)];
  if (!initial && names.length > 1) {
    let attempts = 0;
    while (next === state.demo.activeConstellation && attempts < 8) {
      next = names[Math.floor(Math.random() * names.length)];
      attempts += 1;
    }
  }
  state.demo.activeConstellation = next;
  state.demo.constellationTimer = 0;

  const easing = new CubicEase();
  easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

  state.constellationLines.forEach((line) => {
    if (!line) {
      return;
    }
    const target = line.metadata?.name === next ? 0.9 : 0.05;
    line.isVisible = true;
    Animation.CreateAndStartAnimation(`demo-constellation-${line.name}`, line, 'alpha', 60, 60, line.alpha ?? 0.1, target, 0, easing);
  });
  state.constellationAuras.forEach((aura, name) => {
    if (!aura?.material) {
      return;
    }
    const targetAlpha = name === next ? 0.25 : 0;
    Animation.CreateAndStartAnimation(`demo-aura-${name}`, aura.material, 'alpha', 60, 60, aura.material.alpha, targetAlpha, 0, easing);
    aura.isVisible = targetAlpha > 0.01;
  });
}

function pickDemoTarget() {
  if (state.starList.length === 0) {
    state.demo.targetAlpha = null;
    state.demo.targetBeta = null;
    state.demo.targetRadius = null;
    return;
  }
  const star = state.starList[Math.floor(Math.random() * state.starList.length)];
  const mesh = state.starMap.get(star.name.toLowerCase());
  if (!mesh) {
    return;
  }
  const position = mesh.getAbsolutePosition ? mesh.getAbsolutePosition() : mesh.position;
  const distance = position.length();
  state.demo.targetAlpha = Math.atan2(position.z, position.x) + Scalar.RandomRange(-0.22, 0.22);
  state.demo.targetBeta = Math.acos(Scalar.Clamp(position.y / distance, -1, 1)) + Scalar.RandomRange(-0.1, 0.1);
  state.demo.targetRadius = Math.min(Math.max(distance * 0.78, 16), 44);
  state.demo.focusTimer = 0;
}

function showDemoText(message) {
  if (!demoTextOverlay) {
    return;
  }
  demoTextOverlay.textContent = message;
  demoTextOverlay.hidden = false;
  demoTextOverlay.classList.remove('is-visible');
  // eslint-disable-next-line no-unused-expressions
  demoTextOverlay.offsetWidth;
  demoTextOverlay.classList.add('is-visible');
  state.demo.textDisplayTimer = 0;
}

function hideDemoText(immediate = false) {
  if (!demoTextOverlay) {
    return;
  }
  if (immediate) {
    demoTextOverlay.classList.remove('is-visible');
    demoTextOverlay.hidden = true;
    return;
  }
  if (!demoTextOverlay.classList.contains('is-visible')) {
    return;
  }
  demoTextOverlay.classList.remove('is-visible');
  setTimeout(() => {
    if (!demoTextOverlay.classList.contains('is-visible')) {
      demoTextOverlay.hidden = true;
    }
  }, 500);
}

function toggleAudio() {
  if (!state.audio.enabled) {
    enableAudio();
  } else {
    disableAudio();
  }
}

function enableAudio() {
  if (!audioAmbienceElement) {
    return;
  }
  if (!state.audio.ready) {
    try {
      state.audio.context = new AudioContext();
      state.audio.source = state.audio.context.createMediaElementSource(audioAmbienceElement);
      state.audio.gain = state.audio.context.createGain();
      state.audio.filter = state.audio.context.createBiquadFilter();
      state.audio.filter.type = 'lowpass';
      state.audio.filter.frequency.value = 1800;
      state.audio.gain.gain.value = 0;
      state.audio.source.connect(state.audio.filter);
      state.audio.filter.connect(state.audio.gain);
      state.audio.gain.connect(state.audio.context.destination);
      state.audio.ready = true;
    } catch (error) {
      console.warn('Web audio is not available:', error);
      return;
    }
  }
  if (state.audio.context.state === 'suspended') {
    state.audio.context.resume().catch(() => {});
  }
  audioAmbienceElement.volume = 0.6;
  audioAmbienceElement.play().catch(() => {});
  state.audio.enabled = true;
  if (state.modeDemo) {
    setAudioProfile('demo');
  } else if (state.modeFocus) {
    setAudioProfile('focus');
  } else {
    setAudioProfile('default');
  }
  buttonAudio.dataset.active = 'true';
}

function disableAudio() {
  if (!state.audio.enabled) {
    return;
  }
  state.audio.gainTarget = 0;
  state.audio.enabled = false;
  state.audio.profile = 'default';
  buttonAudio.dataset.active = 'false';
  if (audioAmbienceElement) {
    setTimeout(() => {
      if (!state.audio.enabled) {
        audioAmbienceElement.pause();
      }
    }, 1200);
  }
}

function setLearningMode(enabled) {
  state.learningMode = enabled;
  buttonLearning.dataset.active = enabled ? 'true' : 'false';
  if (!enabled) {
    hideInfoPanel();
  }
}

async function toggleFullscreen() {
  if (!appContainer) {
    return;
  }
  if (!document.fullscreenElement) {
    await appContainer.requestFullscreen();
  } else if (document.exitFullscreen) {
    await document.exitFullscreen();
  }
}

function searchStar(value) {
  const query = value?.trim();
  if (!query) {
    updateInfoPanel(null);
    suggestionsList.hidden = true;
    return;
  }
  const suggestions = buildSuggestions(query.toLowerCase());
  if (suggestions.length === 0) {
    updateInfoPanel(null, `No star found for "${query}"`);
    return;
  }
  const best = suggestions[0];
  focusOnTarget(best.name, true, true);
  showStarInfo(best.name);
  suggestionsList.hidden = true;
  searchInput.value = best.name;
}

function renderSuggestions(value) {
  state.suggestions = buildSuggestions(value.toLowerCase());
  if (state.suggestions.length === 0) {
    suggestionsList.hidden = true;
    suggestionsList.innerHTML = '';
    return;
  }
  suggestionsList.innerHTML = state.suggestions
    .map((item, index) => `<li class="suggestions__item" data-index="${index}"><span>${item.name}</span><small>${item.score.toFixed(2)}</small></li>`)
    .join('');
  suggestionsList.hidden = false;
  suggestionsList.querySelectorAll('.suggestions__item').forEach((element) => {
    element.addEventListener('click', () => {
      const index = Number(element.dataset.index);
      const suggestion = state.suggestions[index];
      if (!suggestion) {
        return;
      }
      focusOnTarget(suggestion.name, true, true);
      showStarInfo(suggestion.name);
      suggestionsList.hidden = true;
      searchInput.value = suggestion.name;
    });
  });
}

function buildSuggestions(value) {
  return state.starList
    .map((star) => ({ name: star.name, score: similarityScore(value, star.name.toLowerCase()) }))
    .filter((entry) => entry.score > 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS);
}

function similarityScore(query, candidate) {
  const distance = levenshteinDistance(query, candidate);
  const distanceScore = 1 / (1 + distance);
  const prefix = candidate.startsWith(query) ? 0.35 : 0;
  const inclusion = candidate.includes(query) ? 0.2 : 0;
  const ratio = Math.min(query.length / candidate.length, 1) * 0.15;
  return distanceScore + prefix + inclusion + ratio;
}

function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function showStarInfo(name) {
  const star = state.starList.find((item) => item.name === name);
  if (!star) {
    updateInfoPanel(null, 'Data unavailable');
    return;
  }
  const sheet = state.starInfos[name];
  updateInfoPanel(star, sheet ? `Constellation: ${sheet.constellation}` : 'Constellation: unknown');
  infoConstellation.textContent = sheet ? `Constellation: ${sheet.constellation}` : 'Constellation: unknown';
  infoDistance.textContent = sheet ? `Distance: ${sheet.distance} ly` : 'Distance: unknown';
  infoType.textContent = sheet ? `Spectral type: ${sheet.type}` : 'Spectral type: unknown';
  infoIllustration.src = sheet?.illustration ?? TEXTURE_URLS.defaultStar;
  infoIllustration.alt = `Star ${name}`;
  state.lastConstellation = sheet?.constellation ?? null;
}

function showPlanetInfo(name) {
  const planet = PLANETS_DATA.find((item) => item.name === name);
  if (!planet) {
    return;
  }
  infoPanel.hidden = false;
  infoPanel.dataset.state = 'found';
  infoName.textContent = planet.name;
  infoMagnitude.textContent = planet.distance;
  infoConstellation.textContent = planet.size;
  infoDistance.textContent = 'Inner Solar System object';
  infoType.textContent = '—';
  infoIllustration.src = planet.albedo;
  infoIllustration.alt = `Planet ${planet.name}`;
  state.lastConstellation = null;
}

function updateInfoPanel(star, message = '') {
  if (!infoPanel) {
    return;
  }
  if (!star && !message) {
    infoPanel.hidden = true;
    infoPanel.dataset.state = 'idle';
    state.lastConstellation = null;
    return;
  }
  infoPanel.hidden = false;
  if (star) {
    infoPanel.dataset.state = 'found';
    infoName.textContent = star.name;
    infoMagnitude.textContent = `Magnitude ${star.mag}`;
  } else {
    infoPanel.dataset.state = 'empty';
    infoName.textContent = 'Search';
    infoMagnitude.textContent = '';
  }
  infoConstellation.textContent = message;
}

function hideInfoPanel() {
  updateInfoPanel(null);
}

function highlightConstellation(name) {
  state.constellationLines.forEach((line) => {
    if (line.metadata?.name === name) {
      const easing = new CubicEase();
      easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
      Animation.CreateAndStartAnimation('constellation-highlight', line, 'alpha', 60, 90, line.alpha, 1, 0, easing);
      Animation.CreateAndStartAnimation('constellation-fade', line, 'alpha', 60, 120, 1, 0.75, 0, easing, () => {
        line.alpha = state.constellationsVisible ? 0.8 : 0.2;
      });
      const aura = state.constellationAuras.get(name);
      if (aura) {
        Animation.CreateAndStartAnimation('aura-scale', aura, 'scaling.x', 60, 90, aura.scaling.x, 1.3, 0, easing, () => {
          aura.scaling.x = 1;
          aura.scaling.y = 1;
          aura.scaling.z = 1;
        });
      }
    } else {
      line.alpha = state.constellationsVisible ? 0.5 : 0.15;
    }
  });
}

function enterFocusMode(targetName) {
  if (state.modeDemo) {
    setDemoMode(false, true);
  }
  if (state.explorationMode) {
    setExplorationMode(false);
  }
  if (state.orientationMode) {
    toggleOrientation().catch(() => {});
  }
  state.focus.targetName = targetName;
  if (state.modeFocus) {
    return;
  }
  state.focus.previousState = {
    alpha: state.cameraOrbit.alpha,
    beta: state.cameraOrbit.beta,
    radius: state.cameraOrbit.radius
  };
  state.modeFocus = true;
  state.cameraOrbit.detachControl(canvas);
  if (buttonExitFocus) {
    buttonExitFocus.hidden = false;
    buttonExitFocus.dataset.visible = 'true';
    buttonExitFocus.setAttribute('aria-hidden', 'false');
  }
  setAudioProfile('focus');
}

function exitFocusMode() {
  if (!state.modeFocus) {
    return;
  }
  const fallback = {
    alpha: CAMERA_DEFAULTS.alpha,
    beta: CAMERA_DEFAULTS.beta,
    radius: CAMERA_DEFAULTS.radius
  };
  const previous = state.focus.previousState ?? fallback;
  state.modeFocus = false;
  state.focus.targetName = null;
  if (buttonExitFocus) {
    buttonExitFocus.dataset.visible = 'false';
    buttonExitFocus.hidden = true;
    buttonExitFocus.setAttribute('aria-hidden', 'true');
  }
  state.focus.previousState = null;
  if (!state.modeDemo) {
    setAudioProfile('default');
  }
  animateCamera(previous.alpha, previous.beta, {
    radius: previous.radius,
    frames: CAMERA_TRANSITION_FRAMES,
    onComplete: () => {
      if (!state.modeDemo && !state.orientationMode) {
        state.cameraOrbit.attachControl(canvas, true);
      }
    }
  });
  noteUserInteraction();
}

function focusOnTarget(name, cinematic, lockCamera = false) {
  const mesh = state.starMap.get(name.toLowerCase()) || state.planets.get(name.toLowerCase());
  if (!mesh) {
    return;
  }
  const position = mesh.getAbsolutePosition ? mesh.getAbsolutePosition() : mesh.position;
  const distance = position.length();
  const alpha = Math.atan2(position.z, position.x);
  const beta = Math.acos(Scalar.Clamp(position.y / distance, -1, 1));
  if (lockCamera) {
    enterFocusMode(name);
  }
  const camera = state.cameraOrbit;
  const targetRadius = lockCamera
    ? Math.min(Math.max(distance * 0.75, 14), 42)
    : cinematic
      ? Math.min(Math.max(camera.radius * 0.85, 12), 55)
      : camera.radius;
  animateCamera(alpha, beta, {
    radius: targetRadius,
    frames: CAMERA_TRANSITION_FRAMES,
    bounce: cinematic && !lockCamera,
    bounceReturnRadius: camera.radius,
    onComplete: () => {
      if (!lockCamera && !state.modeDemo && !state.orientationMode) {
        state.cameraOrbit.attachControl(canvas, true);
      }
    }
  });
  state.lastInteraction = performance.now() + 2000;
}

function animateCamera(alpha, beta, options = {}) {
  const camera = state.cameraOrbit;
  const {
    radius = camera.radius,
    frames = CAMERA_TRANSITION_FRAMES,
    easingMode = EasingFunction.EASINGMODE_EASEINOUT,
    bounce = false,
    bounceReturnRadius = camera.radius,
    onComplete
  } = options;
  const easing = new CubicEase();
  easing.setEasingMode(easingMode);
  const clampedTargetBeta = Scalar.Clamp(beta, 0.28, Math.PI - 0.28);
  const clampedStartBeta = Scalar.Clamp(camera.beta, 0.26, Math.PI - 0.26);

  const handleComplete = () => {
    if (bounce) {
      Animation.CreateAndStartAnimation('camera-radius-bounce', camera, 'radius', 60, frames, camera.radius, bounceReturnRadius, 0, easing, () => {
        if (typeof onComplete === 'function') {
          onComplete();
        }
      });
      return;
    }
    if (typeof onComplete === 'function') {
      onComplete();
    }
  };

  Animation.CreateAndStartAnimation('camera-alpha', camera, 'alpha', 60, frames, camera.alpha, alpha, 0, easing);
  Animation.CreateAndStartAnimation('camera-beta', camera, 'beta', 60, frames, clampedStartBeta, clampedTargetBeta, 0, easing);
  Animation.CreateAndStartAnimation('camera-radius', camera, 'radius', 60, frames, camera.radius, radius, 0, easing, handleComplete);
}

function chooseExplorationTarget() {
  state.exploration.timer = 0;
  if (state.starList.length === 0) {
    return;
  }
  const star = state.starList[Math.floor(Math.random() * state.starList.length)];
  const mesh = state.starMap.get(star.name.toLowerCase());
  if (!mesh) {
    return;
  }
  const position = mesh.getAbsolutePosition();
  const distance = position.length();
  state.exploration.alphaTarget = Math.atan2(position.z, position.x) + Scalar.RandomRange(-0.3, 0.3);
  state.exploration.betaTarget = Math.acos(Scalar.Clamp(position.y / distance, -1, 1)) + Scalar.RandomRange(-0.12, 0.12);
}

function showExplorationMessage() {
  if (!overlayMessage) {
    return;
  }
  overlayMessage.textContent = inspirationMessages[Math.floor(Math.random() * inspirationMessages.length)];
  overlayMessage.hidden = false;
  state.exploration.messageTimer = 0;
}

function updateDemo(delta) {
  if (!state.modeDemo) {
    return;
  }
  const { demo } = state;
  const camera = state.cameraOrbit;
  demo.timer += delta;
  demo.focusTimer += delta;
  demo.textTimer += delta;
  demo.textDisplayTimer += delta;
  demo.constellationTimer += delta;

  camera.alpha += demo.orbitSpeed * delta;
  const oscillation = Math.sin(performance.now() / 14000) * 0.08;
  const desiredBeta = Scalar.Clamp(CAMERA_DEFAULTS.beta + oscillation, 0.32, Math.PI - 0.32);
  camera.beta += (desiredBeta - camera.beta) * 0.0018 * delta;
  camera.beta = Scalar.Clamp(camera.beta, 0.32, Math.PI - 0.32);

  if (!demo.targetAlpha || demo.focusTimer > 12000) {
    pickDemoTarget();
  }
  if (demo.targetAlpha !== null) {
    camera.alpha += (demo.targetAlpha - camera.alpha) * 0.0014 * delta;
  }
  if (demo.targetBeta !== null) {
    camera.beta += (demo.targetBeta - camera.beta) * 0.0016 * delta;
    camera.beta = Scalar.Clamp(camera.beta, 0.32, Math.PI - 0.32);
  }
  if (demo.targetRadius !== null) {
    camera.radius += (demo.targetRadius - camera.radius) * 0.0012 * delta;
    camera.radius = Scalar.Clamp(camera.radius, 15, 48);
  }

  if (demo.constellationTimer > 9000) {
    cycleDemoConstellation();
  }

  if (demo.textTimer > DEMO_TEXT_INTERVAL_MS) {
    showDemoText(demoMessages[Math.floor(Math.random() * demoMessages.length)]);
    demo.textTimer = 0;
    demo.textDisplayTimer = 0;
  }
  if (demo.textDisplayTimer > 3000) {
    hideDemoText();
  }
}

function updateExploration(delta) {
  if (!state.explorationMode || state.modeDemo || state.modeFocus) {
    return;
  }
  const camera = state.cameraOrbit;
  const data = state.exploration;
  data.timer += delta;
  data.messageTimer += delta;
  if (!data.alphaTarget || !data.betaTarget || data.timer > 14000) {
    chooseExplorationTarget();
  }
  if (data.alphaTarget && data.betaTarget) {
    camera.alpha += (data.alphaTarget - camera.alpha) * 0.0025 * delta;
    camera.beta += (data.betaTarget - camera.beta) * 0.0025 * delta;
    camera.beta = Scalar.Clamp(camera.beta, 0.35, Math.PI - 0.35);
  }
  if (data.messageTimer > EXPLORATION_MESSAGE_MS) {
    showExplorationMessage();
  }
}

function updateCameraAuto(delta) {
  if (state.orientationMode || state.explorationMode || state.modeDemo || state.modeFocus) {
    return;
  }
  const idle = performance.now() - state.lastInteraction;
  if (idle < IDLE_DRIFT_DELAY_MS) {
    return;
  }
  const camera = state.cameraOrbit;
  camera.alpha += delta * DRIFT_ALPHA_SPEED;
  const oscillation = Math.sin(performance.now() / 9000) * DRIFT_BETA_SPEED * delta;
  camera.beta = Scalar.Clamp(camera.beta + oscillation, 0.3, Math.PI - 0.3);
}

function createComet() {
  const { scene } = state;
  if (state.comet.mesh) {
    return;
  }
  const mesh = MeshBuilder.CreateSphere('comet', { diameter: 0.65, segments: 8 }, scene);
  const material = new StandardMaterial('comet-mat', scene);
  material.emissiveColor = new Color3(1, 0.95, 0.82);
  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
  mesh.material = material;
  mesh.isVisible = false;
  mesh.parent = null;

  const trail = new TrailMesh('comet-trail', mesh, scene, 0.4, 50, true);
  const trailMat = new StandardMaterial('comet-trail-mat', scene);
  trailMat.emissiveColor = new Color3(0.7, 0.85, 1);
  trailMat.alpha = 0.75;
  trailMat.diffuseColor = Color3.Black();
  trail.material = trailMat;
  trail.isVisible = false;

  state.comet.mesh = mesh;
  state.comet.trail = trail;
  state.comet.material = material;
  state.comet.trailMaterial = trailMat;
}

function updateComet(delta) {
  if (!state.cometsEnabled || !state.comet.mesh) {
    return;
  }
  const comet = state.comet;
  if (comet.active) {
    comet.travel += delta;
    const progress = comet.travel / COMET_DURATION_MS;
    if (progress >= 1) {
      comet.active = false;
      comet.mesh.isVisible = false;
      comet.trail.isVisible = false;
      comet.wait = COMET_INTERVAL_MS + Math.random() * 6000;
      return;
    }
    const eased = progress * progress * (3 - 2 * progress);
    Vector3.LerpToRef(comet.start, comet.end, eased, comet.temp);
    comet.mesh.position.copyFrom(comet.temp);
    comet.mesh.rotation.y += delta * 0.002;
  } else {
    comet.wait -= delta;
    if (comet.wait <= 0) {
      launchComet();
    }
  }
}

function launchComet() {
  const comet = state.comet;
  if (!comet.mesh) {
    return;
  }
  const height = Scalar.RandomRange(-18, 22);
  const depth = Scalar.RandomRange(-SKY_RADIUS * 0.5, SKY_RADIUS * 0.5);
  comet.start.copyFromFloats(-SKY_RADIUS - 10, height, depth);
  comet.end.copyFromFloats(SKY_RADIUS + 10, height + Scalar.RandomRange(-8, 8), -depth);
  comet.mesh.position.copyFrom(comet.start);
  comet.mesh.isVisible = true;
  comet.trail.reset();
  comet.trail.isVisible = true;
  comet.travel = 0;
  comet.active = true;
  comet.wait = 0;
}

function createMeteorSystem() {
  const system = new ParticleSystem('meteors', 400, state.scene);
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOcv2mMAAAAASUVORK5CYII=';
  system.particleTexture = Texture.CreateFromBase64String('meteor-texture', base64, state.scene);
  system.color1 = new Color4(1, 0.85, 0.6, 1);
  system.color2 = new Color4(1, 0.95, 0.85, 0.3);
  system.colorDead = new Color4(1, 0.95, 0.85, 0);
  system.minLifeTime = 0.35;
  system.maxLifeTime = 0.6;
  system.emitRate = 0;
  system.minEmitPower = 28;
  system.maxEmitPower = 45;
  system.minSize = 0.08;
  system.maxSize = 0.2;
  system.gravity = new Vector3(0, 0, 0);
  system.manualEmitCount = 0;
  system.start();
  system.metadata = { timer: 7000 };
  state.meteorSystem = system;
}

function updateMeteors(delta) {
  if (!state.meteorSystem) {
    return;
  }
  const meta = state.meteorSystem.metadata;
  meta.timer -= delta;
  if (meta.timer > 0) {
    return;
  }
  meta.timer = 6000 + Math.random() * 9000;
  const direction = new Vector3(Scalar.RandomRange(-0.4, 0.4), Scalar.RandomRange(-0.2, -0.6), Scalar.RandomRange(-0.2, 0.2));
  state.meteorSystem.direction1 = direction;
  state.meteorSystem.direction2 = direction.scale(1.2);
  const emitter = raDecToVector(Math.random() * 360, Scalar.RandomRange(-30, 30), SKY_RADIUS * 0.9);
  state.meteorSystem.emitter = emitter;
  state.meteorSystem.manualEmitCount = 45;
}

function addPlanets() {
  PLANETS_DATA.forEach((planet) => {
    const position = raDecToVector(planet.ra, planet.dec, SKY_RADIUS * 0.6);
    const mesh = MeshBuilder.CreateSphere(`planet-${planet.name}`, { diameter: planet.radius * 2, segments: 32 }, state.scene);
    mesh.position = position;
    mesh.metadata = {
      type: 'planet',
      name: planet.name,
      rotation: planet.rotation,
      halo: null
    };
    const material = new PBRMaterial(`planet-mat-${planet.name}`, state.scene);
    material.albedoTexture = new Texture(planet.albedo, state.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
    material.bumpTexture = new Texture(planet.normal, state.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
    material.metallic = 0.2;
    material.roughness = 0.8;
    material.specularIntensity = 0.6;
    mesh.material = material;

    const halo = MeshBuilder.CreateSphere(`planet-halo-${planet.name}`, { diameter: planet.radius * 2.8, segments: 24 }, state.scene);
    halo.position = position;
    halo.isPickable = false;
    halo.metadata = { type: 'planet', name: planet.name };
    const haloMat = new StandardMaterial(`planet-halo-mat-${planet.name}`, state.scene);
    const color = Color3.FromHexString(planet.halo);
    haloMat.emissiveColor = color.scale(0.45);
    haloMat.alpha = 0.3;
    haloMat.backFaceCulling = false;
    haloMat.diffuseColor = Color3.Black();
    haloMat.disableLighting = true;
  haloMat.emissiveTexture = new Texture(TEXTURE_URLS.atmosphere, state.scene);
    haloMat.emissiveTexture.hasAlpha = true;
    halo.material = haloMat;
    state.glow.addIncludedOnlyMesh(halo);

    state.planets.set(planet.name.toLowerCase(), mesh);
    mesh.metadata.halo = halo;
  });
}

function updatePlanets(delta) {
  state.planets.forEach((mesh) => {
    const rotation = mesh.metadata?.rotation ?? 0.0002;
    mesh.rotation.y += rotation * delta;
  });
}

function followPlanet(name) {
  const mesh = state.planets.get(name.toLowerCase());
  if (!mesh) {
    return;
  }
  focusOnTarget(name, true, true);
}

function initHudOrientation() {
  if (!hudArrow) {
    return;
  }
  hudArrow.style.transform = 'rotate(0deg)';
}

function updateHudOrientation() {
  if (!hudArrow || !state.cameraOrbit) {
    return;
  }
  const angle = -state.cameraOrbit.alpha + Math.PI / 2;
  hudArrow.style.transform = `rotate(${(angle * 180) / Math.PI}deg)`;
}

function updateAudio(delta) {
  if (!state.audio.gain) {
    return;
  }
  const gain = state.audio.gain.gain.value;
  state.audio.gain.gain.value += (state.audio.gainTarget - gain) * state.audioLerp * (delta / 16.6);
  if (state.audio.filter) {
    const freq = state.audio.filter.frequency.value;
    state.audio.filter.frequency.value += (state.audio.freqTarget - freq) * 0.01 * (delta / 16.6);
  }
}

function updateBackgroundColor() {
  const camera = state.cameraOrbit;
  const factor = Scalar.Clamp((camera.beta - 0.3) / (Math.PI - 0.6), 0, 1);
  const dayColor = new Color3(0.3, 0.35, 0.5);
  const nightColor = new Color3(0.02, 0.03, 0.08);
  const mix = state.nightMode ? 1 : 0;
  const r = Scalar.Lerp(dayColor.r, nightColor.r, mix * factor + (1 - mix) * (1 - factor));
  const g = Scalar.Lerp(dayColor.g, nightColor.g, mix * factor + (1 - mix) * (1 - factor));
  const b = Scalar.Lerp(dayColor.b, nightColor.b, mix * factor + (1 - mix) * (1 - factor));
  state.scene.clearColor = new Color3(r, g, b);
}