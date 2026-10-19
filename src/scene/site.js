import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { box, placeModel } from './builder.js';

const G = -0.3; // garden level (house floor is at 0)

/* ---------- Procedural textures ---------- */
function canvasTex(size, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function leafTexture() {
  return canvasTex(256, (ctx, s) => {
    for (let i = 0; i < 260; i++) {
      const r = Math.sqrt(Math.random()) * s * 0.42;
      const a = Math.random() * Math.PI * 2;
      const x = s / 2 + Math.cos(a) * r, y = s / 2 + Math.sin(a) * r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillStyle = `hsl(${88 + Math.random() * 30}, ${35 + Math.random() * 25}%, ${20 + Math.random() * 22}%)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9 + Math.random() * 5, 4 + Math.random() * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

function waterNormals() {
  const t = canvasTex(256, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    const h = (x, y) =>
      Math.sin(x * 0.11 + y * 0.05) * 0.5 + Math.sin(x * 0.04 - y * 0.13) * 0.6 + Math.sin((x + y) * 0.21) * 0.25 + Math.sin(x * 0.3 - y * 0.27) * 0.15;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
        const n = new THREE.Vector3(-dx, -dy, 1.4).normalize();
        const i = (y * s + x) * 4;
        img.data[i] = (n.x * 0.5 + 0.5) * 255;
        img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
        img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 1.2);
  return t;
}

function facadeTexture(cols, rows) {
  const t = canvasTex(512, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#9fb6c8');
    g.addColorStop(1, '#4d6275');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const cw = s / cols, ch = s / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
        ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
      }
    }
    ctx.fillStyle = 'rgba(40,48,58,0.85)';
    for (let r = 0; r <= rows; r++) ctx.fillRect(0, r * ch - 1.5, s, 3);
    for (let c = 0; c <= cols; c++) ctx.fillRect(c * cw - 0.75, 0, 1.5, s);
  });
  return t;
}

/* ---------- Trees ---------- */
function createTreeKit() {
  const leaves = leafTexture();
  const leafMat = new THREE.MeshStandardMaterial({ map: leaves, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 });
  const depthMat = new THREE.MeshDepthMaterial({ map: leaves, alphaTest: 0.45, depthPacking: THREE.RGBADepthPacking });
  const barkMat = new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 1 });
  const card = new THREE.PlaneGeometry(1.7, 1.7);
  return { leafMat, depthMat, barkMat, card };
}

function tree(kit, x, z, height, seed = Math.random()) {
  const g = new THREE.Group();
  const rand = (() => { let s = seed * 9999; return () => ((s = Math.sin(s) * 10000) - Math.floor(s)); })();
  const trunkH = height * 0.42;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.025, height * 0.045, trunkH, 9), kit.barkMat);
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  g.add(trunk);
  for (let i = 0; i < 4; i++) {
    const br = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.008, height * 0.02, height * 0.35, 6), kit.barkMat);
    br.position.y = trunkH * 0.95;
    br.rotation.set((rand() - 0.5) * 1.2, rand() * Math.PI, (rand() - 0.5) * 1.2);
    br.translateY(height * 0.15);
    br.castShadow = true;
    g.add(br);
  }
  const count = Math.round(110 + height * 14);
  const crown = new THREE.InstancedMesh(kit.card, kit.leafMat, count);
  crown.customDepthMaterial = kit.depthMat;
  crown.castShadow = true;
  crown.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const rx = height * 0.32, ry = height * 0.3, cy = trunkH + ry * 0.75;
  for (let i = 0; i < count; i++) {
    const u = rand() * Math.PI * 2, v = Math.acos(2 * rand() - 1), r = Math.cbrt(rand());
    p.set(Math.sin(v) * Math.cos(u) * rx * r, Math.cos(v) * ry * r + cy, Math.sin(v) * Math.sin(u) * rx * r);
    q.setFromEuler(e.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI));
    sc.setScalar(0.7 + rand() * 0.6 + height * 0.04);
    crown.setMatrixAt(i, m.compose(p, q, sc));
    crown.setColorAt(i, new THREE.Color().setHSL(0.24 + rand() * 0.05, 0.4, 0.55 + rand() * 0.3));
  }
  g.add(crown);
  g.position.set(x, G, z);
  return g;
}

/* ---------- Site ---------- */
export function createSite(m, models, { mobile }) {
  const site = new THREE.Group();

  // Lawn
  box(site, [-180, -1, -180], [180, G, 180], m.grass, { cast: false });

  // Timber deck around the pool, level with the living room floor
  for (const [a, b] of [
    [[-2, G, 5.1], [10, 0, 6.5]],
    [[-2, G, 11.1], [10, 0, 12.6]],
    [[-2, G, 6.5], [1.2, 0, 11.1]],
    [[8.8, G, 6.5], [10, 0, 11.1]],
    [[8.1, G, -5.1], [10, 0, 5.1]],
  ]) box(site, a, b, m.deck);

  // Pool: stone coping, tiled basin, animated water
  box(site, [1.2, 0, 6.5], [8.8, 0.04, 6.8], m.tiles);
  box(site, [1.2, 0, 10.8], [8.8, 0.04, 11.1], m.tiles);
  box(site, [1.2, 0, 6.8], [1.5, 0.04, 10.8], m.tiles);
  box(site, [8.5, 0, 6.8], [8.8, 0.04, 10.8], m.tiles);
  box(site, [1.2, G, 6.5], [8.8, G + 0.02, 11.1], m.poolTile, { cast: false });
  box(site, [1.2, G, 6.5], [8.8, 0, 6.8], m.poolTile, { cast: false });
  box(site, [1.2, G, 10.8], [8.8, 0, 11.1], m.poolTile, { cast: false });
  box(site, [1.2, G, 6.8], [1.5, 0, 10.8], m.poolTile, { cast: false });
  box(site, [8.5, G, 6.8], [8.8, 0, 10.8], m.poolTile, { cast: false });
  const waterNormal = waterNormals();
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 4),
    new THREE.MeshPhysicalMaterial({
      color: '#3aa7c4', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.82,
      normalMap: waterNormal, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.3,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(5, -0.07, 8.8);
  water.receiveShadow = true;
  site.add(water);

  // Sun loungers
  for (const x of [3.3, 5.8]) {
    const z = 11.85;
    box(site, [x - 1, 0, z - 0.34], [x + 1, 0.22, z + 0.34], m.steel);
    const c = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.12, 0.64, 3, 0.05), m.linen);
    c.position.set(x - 0.3, 0.28, z);
    const back = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.12, 0.64, 3, 0.05), m.linen);
    back.position.set(x + 0.62, 0.45, z);
    back.rotation.z = 0.55;
    for (const p of [c, back]) { p.castShadow = p.receiveShadow = true; site.add(p); }
  }

  // Entry path, driveway, pavement and street
  box(site, [-5, G, 5.1], [-3, -0.15, 5.7], m.stone);
  box(site, [-5, G, 5.7], [-3, G + 0.03, 16], m.pavers, { cast: false });
  box(site, [-12.5, G, -4], [-9, G + 0.03, 16], m.pavers, { cast: false });
  box(site, [-180, G, 16], [180, G + 0.05, 17.6], m.pavers, { cast: false });
  box(site, [-180, G, 17.6], [180, G + 0.02, 25], m.asphalt, { cast: false });
  const lineMat = new THREE.MeshStandardMaterial({ color: '#e8e6df', roughness: 0.8 });
  for (let x = -120; x <= 120; x += 6) box(site, [x, G + 0.02, 21.2], [x + 3, G + 0.03, 21.4], lineMat, { cast: false });

  // Planting
  const shrubs = [
    [-13.5, 14.8], [-7.5, 14.8], [-1.5, 14.8], [1.5, 14.8], [5, 14.8], [8.5, 14.8], [12, 14.8],
    [-7.4, 6.2], [-6.2, 6.4], [10.8, -3], [10.8, 1.5], [-9, -6.2], [-4, -6.3], [2, -6.2], [6.5, -6.3],
  ];
  shrubs.forEach(([x, z], i) => {
    const id = i % 3 === 0 ? 'wild_rooibos_bush' : i % 2 ? 'shrub_03' : 'shrub_04';
    placeModel(site, models[id], { pos: [x, G, z], height: 0.9 + (i % 4) * 0.2, rotY: i * 1.7 });
  });
  // The shrub scans are quite dark next to the bright lawn: lift them a little
  for (const id of ['shrub_03', 'shrub_04']) {
    models[id].scene.traverse((o) => { if (o.isMesh && !o.material.userData.lifted) { o.material.color.multiplyScalar(1.6); o.material.userData.lifted = true; } });
  }

  const kit = createTreeKit();
  const trees = [
    [-15, -2, 7.5], [14, -8, 8.5], [-13, 11, 6], [15, 12, 6.5], [3, -13, 9.5], [-6, -13.5, 8],
    [19, 3, 7], [-20, -10, 9], [24, -16, 10], [-26, 6, 8],
  ];
  for (const [x, z, h] of mobile ? trees.slice(0, 7) : trees) site.add(tree(kit, x, z, h, x * 0.13 + z * 0.07));

  // Neighbouring houses, kept simple and far enough to read as context
  const windowMat = new THREE.MeshStandardMaterial({ color: '#2c3741', roughness: 0.08, metalness: 0.7, envMapIntensity: 1.4 });
  for (const [x, z, w, d] of [[-40, 0, 14, 10], [40, -2, 16, 11], [-38, -34, 12, 10], [36, -36, 15, 10]]) {
    box(site, [x - w / 2, G, z - d / 2], [x + w / 2, 3.4, z + d / 2], m.render);
    box(site, [x - w / 2 + 2, 3.4, z - d / 2], [x + w / 2 - 1, 6.6, z + d / 2], m.cedar);
    box(site, [x - w / 2 - 0.4, 6.6, z - d / 2 - 0.4], [x + w / 2 + 0.4, 6.85, z + d / 2 + 0.6], m.slab);
    // Glazed bands so they read as houses rather than blocks
    box(site, [x - w / 2 + 1.5, 0.4, z - d / 2 - 0.03], [x + w / 2 - 1.5, 2.9, z + d / 2 + 0.03], windowMat, { cast: false });
    box(site, [x - w / 2 + 3, 4.2, z - d / 2 - 0.03], [x + w / 2 - 2, 6.0, z + d / 2 + 0.03], windowMat, { cast: false });
  }

  // Distant business district skyline (for the commercial section)
  const skyline = new THREE.Group();
  const towers = [
    [-40, -260, 18, 60], [-10, -285, 22, 80], [20, -260, 16, 50], [48, -290, 24, 100], [75, -265, 18, 68],
    [100, -300, 20, 85], [125, -270, 16, 46], [12, -330, 26, 120], [68, -340, 22, 95], [-60, -310, 18, 64],
  ];
  for (const [x, z, w, h] of mobile ? towers.slice(0, 6) : towers) {
    const tex = facadeTexture(Math.round(w / 3), Math.round(h / 3.6));
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.18, metalness: 0.65, envMapIntensity: 1.1 });
    const cap = new THREE.MeshStandardMaterial({ color: '#5d6873', roughness: 0.6 });
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), [mat, mat, cap, cap, mat, mat]);
    t.position.set(x, G + h / 2, z);
    skyline.add(t);
  }
  site.add(skyline);

  return {
    site,
    update(t) {
      waterNormal.offset.set(t * 0.02, t * 0.013);
    },
  };
}
