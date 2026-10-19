import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createWorld } from './scene/world.js';
import { createMaterials } from './scene/materials.js';
import { createHouse } from './scene/house.js';
import { createSite } from './scene/site.js';
import { MODELS } from './scene/assets.js';
import { setupSmoothScroll, setupReveals, setupCameraPath } from './scroll.js';
import { initUI } from './ui.js';

const mobile = window.matchMedia('(max-width: 768px)').matches;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

initUI();
setupSmoothScroll(reducedMotion);

// Furniture props don't need 1k textures: shrink them to keep GPU memory low (laptops / phones).
function shrinkTextures(root, max) {
  const seen = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const mat of [].concat(o.material)) {
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap']) {
        const tex = mat[key];
        if (!tex || seen.has(tex)) continue;
        seen.add(tex);
        const img = tex.image;
        if (!img || Math.max(img.width, img.height) <= max) continue;
        const s = max / Math.max(img.width, img.height);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        tex.image = c;
        tex.needsUpdate = true;
      }
    }
  });
}

const loader = document.getElementById('loader');
const bar = loader.querySelector('.loader-bar i');
const pct = loader.querySelector('.loader-pct');
const setProgress = (f) => {
  bar.style.width = `${Math.round(f * 100)}%`;
  pct.textContent = `${Math.round(f * 100)}%`;
};
const hideLoader = () => {
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 900);
};

async function start() {
  const manager = new THREE.LoadingManager();
  let idle = false;
  manager.onStart = () => { idle = false; };
  manager.onLoad = () => { idle = true; };
  manager.onProgress = (_url, loaded, total) => setProgress(loaded / total);

  const { renderer, scene, camera } = createWorld(document.getElementById('scene'), manager, { mobile });
  const mats = createMaterials(manager, renderer, { mobile });

  const gltf = new GLTFLoader(manager);
  const models = {};
  await Promise.all(Object.keys(MODELS).map(async (id) => {
    models[id] = await gltf.loadAsync(`/assets/models/${id}/${id}.gltf`);
    shrinkTextures(models[id].scene, mobile ? 256 : 512);
  }));

  const canvas = renderer.domElement;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    document.body.classList.add('no-webgl');
  });
  canvas.addEventListener('webglcontextrestored', () => document.body.classList.remove('no-webgl'));

  const { house, door, slider } = createHouse(mats, models);
  const site = createSite(mats, models, { mobile });
  scene.add(house, site.site);

  await new Promise((resolve) => { const check = () => (idle ? resolve() : requestAnimationFrame(check)); check(); });

  const path = setupCameraPath(camera, { mobile, reducedMotion, door, slider });
  path.update(0, { x: 0, y: 0 });
  await renderer.compileAsync(scene, camera);
  setupReveals(reducedMotion);

  const mouse = { x: 0, y: 0 }, smoothMouse = { x: 0, y: 0 };
  if (!mobile) {
    window.addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    });
  }

  const clock = new THREE.Clock();
  let first = true;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.05;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.05;
    path.update(dt, smoothMouse);
    site.update(clock.elapsedTime);
    renderer.render(scene, camera);
    if (first) { first = false; setTimeout(hideLoader, 300); }
  });
}

start().catch((err) => {
  console.error('3D scene failed to start', err);
  document.body.classList.add('no-webgl');
  setupReveals(reducedMotion);
  hideLoader();
});
