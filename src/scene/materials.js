import * as THREE from 'three';
import { TEXTURES } from './assets.js';

const HI_RES = new Set(['wood_floor', 'japanese_cedar_planks', 'exterior_wall_cladding', 'concrete_pavers']);

// Real-world-scaled PBR materials. Geometry built with `box()` gets UVs in metres,
// so a texture's repeat is simply 1 / (metres per tile).
export function createMaterials(manager, renderer, { mobile }) {
  const loader = new THREE.TextureLoader(manager);
  const aniso = Math.min(renderer.capabilities.getMaxAnisotropy(), mobile ? 4 : 8);
  const cache = {};

  const map = (id, kind) => {
    const key = `${id}/${kind}`;
    if (cache[key]) return cache[key];
    const t = loader.load(`/assets/textures/${id}/${kind}.jpg`, (tex) => {
      // Keep full resolution only for large surfaces seen up close; halve the rest to save GPU memory
      if (!mobile && HI_RES.has(id) && kind !== 'rough') return;
      const img = tex.image, c = document.createElement('canvas');
      c.width = img.width / 2;
      c.height = img.height / 2;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      tex.image = c;
      tex.needsUpdate = true;
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.setScalar(1 / TEXTURES[id]);
    t.anisotropy = aniso;
    if (kind === 'diff') t.colorSpace = THREE.SRGBColorSpace;
    return (cache[key] = t);
  };

  // Full PBR set (colour + normal + roughness)
  const pbr = (id, opts = {}) =>
    new THREE.MeshStandardMaterial({ map: map(id, 'diff'), normalMap: map(id, 'nor'), roughnessMap: map(id, 'rough'), ...opts });
  // Surface detail only, with a flat colour (for clean painted walls, fabrics)
  const detail = (id, color, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, normalMap: map(id, 'nor'), roughnessMap: map(id, 'rough'), ...opts });

  return {
    floor: pbr('wood_floor', { roughness: 0.9 }),
    stairWood: pbr('wood_floor'),
    wallInt: detail('white_plaster_02', '#f1efea', { normalScale: new THREE.Vector2(0.4, 0.4) }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.95 }),
    render: detail('painted_plaster_wall', '#f3f1ec', { normalScale: new THREE.Vector2(0.6, 0.6) }),
    cedar: pbr('japanese_cedar_planks', { color: '#c9b8a6' }),
    stone: pbr('exterior_wall_cladding'),
    marble: new THREE.MeshStandardMaterial({ color: '#f3f1ed', roughness: 0.22, metalness: 0 }),
    cabinet: pbr('kitchen_wood'),
    lacquer: new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.45, metalness: 0.1 }),
    deck: detail('wood_floor_deck', '#a48f7a', { roughness: 0.85 }),
    grass: pbr('leafy_grass', { color: '#b8c9a0' }),
    pavers: pbr('concrete_pavers'),
    tiles: pbr('large_floor_tiles_02', { color: '#e9e4dc' }),
    fabric: detail('quatrefoil_jacquard_fabric', '#b7afa3', { roughness: 1 }),
    linen: detail('quatrefoil_jacquard_fabric', '#f2efe9', { roughness: 1, normalScale: new THREE.Vector2(0.4, 0.4) }),
    rug: detail('quatrefoil_jacquard_fabric', '#8c8478', { roughness: 1 }),
    slab: new THREE.MeshStandardMaterial({ color: '#f2f0eb', roughness: 0.6 }),
    frame: new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.35, metalness: 0.7 }),
    steel: new THREE.MeshStandardMaterial({ color: '#1d1e21', roughness: 0.4, metalness: 0.8 }),
    asphalt: new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.95 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#dfeef2', roughness: 0.03, metalness: 0, transparent: true, opacity: 0.16,
      envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
    }),
    rail: new THREE.MeshPhysicalMaterial({
      color: '#cfe3e8', roughness: 0.05, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
    }),
    poolTile: new THREE.MeshStandardMaterial({ color: '#7fc4d3', roughness: 0.3 }),
  };
}
