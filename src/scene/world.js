import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { HDRI } from './assets.js';

export function createWorld(canvas, manager, { mobile }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cfdbe6');
  scene.fog = new THREE.Fog('#d6e0e8', 70, 520);

  const camera = new THREE.PerspectiveCamera(mobile ? 62 : 50, window.innerWidth / window.innerHeight, 0.05, 900);

  // Real sky: used for the backdrop and for image-based lighting/reflections
  new RGBELoader(manager).load(`/assets/hdri/${HDRI}.hdr`, (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = hdr;
    scene.environment = hdr;
    scene.environmentIntensity = 0.85;
    scene.backgroundRotation.y = scene.environmentRotation.y = 1.2;
  });

  // Sun for crisp shadows (light coming through the glass into the rooms)
  const sun = new THREE.DirectionalLight('#fff1dc', 2.6);
  sun.position.set(-22, 30, 26);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 5, far: 90 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#e9f1ff', '#7a6a55', 0.35));

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  return { renderer, scene, camera };
}
