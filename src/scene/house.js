import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { box, faces, wall, glazing, placeModel } from './builder.js';

// Floor plan (metres): footprint x[-8, 8] × z[-5, 5], front faces +z.
// Ground floor 0 → 3.2, slab 3.2 → 3.5, upper floor 3.5 → 6.6 (x[-8, 3]), roof terrace over x[3, 8].
export const GF = 0, UF = 3.5;
export const STAIR = { x0: -7.75, x1: -6.65, zBottom: 3.6, run: 0.3, steps: 16 };

const topOf = (obj) => new THREE.Box3().setFromObject(obj).max.y;

function soft(parent, [x0, y0, z0], [x1, y1, z1], mat, r = 0.05) {
  const geo = new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 3, r);
  const m = new THREE.Mesh(geo, mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

function pendantLight(parent, x, y, z, intensity = 2.5) {
  const l = new THREE.PointLight('#ffd9a8', intensity, 5, 2);
  l.position.set(x, y, z);
  parent.add(l);
}

export function createHouse(m, models) {
  const house = new THREE.Group();
  const T = 0.25;

  /* ---------- Structure ---------- */
  // Plinth + ground floor finish
  box(house, [-8.1, -0.3, -5.1], [8.1, -0.02, 5.1], m.stone);
  box(house, [-7.75, -0.02, -4.75], [7.75, 0, 4.75], m.floor, { cast: false });

  // Ground-floor walls
  wall(house, { axis: 'x', at: 5 - T / 2, from: -8, to: -2, y0: 0, y1: 3.2, mat: faces('+z', m.stone, m.wallInt),
    openings: [{ from: -4.7, to: -3.3, bottom: 0, top: 2.7 }] });
  wall(house, { axis: 'x', at: -5 + T / 2, from: -8, to: 8, y0: 0, y1: 3.2, mat: faces('-z', m.render, m.wallInt),
    openings: [{ from: -5.5, to: -2.5, bottom: 1.15, top: 2.45 }, { from: 2.6, to: 7.4, bottom: 0.5, top: 2.9 }] });
  wall(house, { axis: 'z', at: -8 + T / 2, from: -4.75, to: 4.75, y0: 0, y1: 3.2, mat: faces('-x', m.render, m.wallInt) });

  // Ground-floor glazing: full-height glass on the front and the garden side
  glazing(house, { axis: 'x', at: 4.92, from: -2, to: 8, bottom: 0, top: 3.2, mats: m, mullions: [0.5, 3, 5.5] });
  glazing(house, { axis: 'z', at: 7.92, from: -4.75, to: 4.92, bottom: 0, top: 3.2, mats: m, mullions: [-2.3, 0.2, 2.6] });
  glazing(house, { axis: 'x', at: -4.88, from: -5.5, to: -2.5, bottom: 1.15, top: 2.45, mats: m });
  glazing(house, { axis: 'x', at: -4.88, from: 2.6, to: 7.4, bottom: 0.5, top: 2.9, mats: m, mullions: [5] });

  // First-floor slab (stair void cut out); timber floor above, plaster ceiling below
  const slabMat = (top) => [m.slab, m.slab, top, m.ceiling, m.slab, m.slab];
  box(house, [-8, 3.2, -5], [3, 3.5, -1.2], slabMat(m.floor));
  box(house, [-6.6, 3.2, -1.2], [3, 3.5, 3.8], slabMat(m.floor));
  box(house, [-8, 3.2, 3.8], [3, 3.5, 5], slabMat(m.floor));
  box(house, [3, 3.2, -5], [8, 3.5, 5], slabMat(m.deck));

  // Upper-floor walls (cedar outside, plaster inside)
  wall(house, { axis: 'x', at: 5 - T / 2, from: -8, to: -6, y0: UF, y1: 6.6, mat: faces('+z', m.cedar, m.wallInt) });
  wall(house, { axis: 'x', at: -5 + T / 2, from: -8, to: 3, y0: UF, y1: 6.6, mat: faces('-z', m.cedar, m.wallInt),
    openings: [{ from: -3.6, to: 0.6, bottom: 5.5, top: 6.3 }] });
  wall(house, { axis: 'z', at: -8 + T / 2, from: -4.75, to: 4.75, y0: UF, y1: 6.6, mat: faces('-x', m.cedar, m.wallInt) });
  wall(house, { axis: 'z', at: 3 - T / 2, from: -4.75, to: 4.75, y0: UF, y1: 6.6, mat: faces('+x', m.cedar, m.wallInt),
    openings: [{ from: 0.2, to: 3.0, bottom: UF, top: 5.9 }] });
  glazing(house, { axis: 'x', at: 4.92, from: -6, to: 3, bottom: UF, top: 6.6, mats: m, mullions: [-3.75, -1.5, 0.75] });
  glazing(house, { axis: 'x', at: -4.88, from: -3.6, to: 0.6, bottom: 5.5, top: 6.3, mats: m, mullions: [-1.5] });

  // Terrace sliding door (one fixed pane, one that slides open on scroll)
  glazing(house, { axis: 'z', at: 2.95, from: 0.2, to: 1.6, bottom: UF, top: 5.9, mats: m });
  const slider = glazing(house, { axis: 'z', at: 2.83, from: 1.6, to: 3.0, bottom: UF, top: 5.9, mats: m });

  // Roof with deep overhang; cedar soffit/ceiling
  box(house, [-8.4, 6.6, -5.4], [3.4, 6.9, 6.0], [m.slab, m.slab, m.slab, m.cedar, m.slab, m.slab]);
  box(house, [-8.4, 6.9, -5.4], [3.4, 7.05, -5.25], m.slab);
  // Entrance canopy
  box(house, [-5.6, 2.95, 5], [-2.4, 3.2, 6.6], m.slab);

  // Terrace: frameless glass balustrade
  box(house, [7.9, UF, -4.95], [7.93, UF + 1.05, 4.95], m.rail, { cast: false, receive: false });
  box(house, [3, UF, 4.92], [7.93, UF + 1.05, 4.95], m.rail, { cast: false, receive: false });
  box(house, [3, UF, -4.95], [7.93, UF + 1.05, -4.92], m.rail, { cast: false, receive: false });

  /* ---------- Front door ---------- */
  const door = new THREE.Group();
  door.position.set(-4.7, 0, 5 - T / 2);
  box(door, [0, 0, -0.035], [1.4, 2.7, 0.035], m.cedar);
  box(door, [1.18, 0.7, 0.035], [1.21, 1.9, 0.07], m.steel);
  box(door, [1.18, 0.7, -0.07], [1.21, 1.9, -0.035], m.steel);
  house.add(door);
  // Door-side wall lights
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffe2b8', emissiveIntensity: 3 });
  box(house, [-5.05, 1.9, 5], [-4.9, 2.3, 5.08], lampMat, { cast: false });
  box(house, [-3.1, 1.9, 5], [-2.95, 2.3, 5.08], lampMat, { cast: false });

  /* ---------- Staircase: floating timber treads with glass balustrade ---------- */
  const R = UF / STAIR.steps;
  for (let i = 0; i < STAIR.steps; i++) {
    const zTop = STAIR.zBottom - i * STAIR.run;
    box(house, [STAIR.x0, (i + 1) * R - 0.07, zTop - STAIR.run - 0.02], [STAIR.x1, (i + 1) * R, zTop], m.stairWood);
  }
  const zTopStair = STAIR.zBottom - STAIR.steps * STAIR.run;
  const railGeo = new THREE.BufferGeometry();
  const rx = STAIR.x1 + 0.02;
  railGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    rx, 0.05, STAIR.zBottom, rx, UF, zTopStair, rx, UF + 1, zTopStair,
    rx, 0.05, STAIR.zBottom, rx, UF + 1, zTopStair, rx, 1.05, STAIR.zBottom,
  ], 3));
  railGeo.computeVertexNormals();
  house.add(new THREE.Mesh(railGeo, m.rail));
  // Guard around the stair void upstairs
  box(house, [-6.62, UF, zTopStair], [-6.58, UF + 1, 3.8], m.rail, { cast: false, receive: false });
  box(house, [-7.75, UF, 3.78], [-6.6, UF + 1, 3.82], m.rail, { cast: false, receive: false });

  /* ---------- Kitchen ---------- */
  box(house, [-6.3, 0, -4.7], [-0.9, 0.1, -4.22], m.lacquer);
  box(house, [-6.3, 0.1, -4.75], [-0.9, 0.86, -4.15], m.cabinet);
  box(house, [-6.35, 0.86, -4.75], [-0.85, 0.9, -4.1], m.marble);
  box(house, [-6.3, 0.9, -4.75], [-0.9, 1.15, -4.73], m.marble);
  box(house, [-4.4, 0.86, -4.62], [-3.6, 0.905, -4.25], m.steel);
  box(house, [-4.03, 0.9, -4.7], [-3.97, 1.25, -4.64], m.steel);
  box(house, [-4.03, 1.22, -4.66], [-3.97, 1.26, -4.45], m.steel);
  box(house, [-2.2, 0.9, -4.65], [-1.45, 0.906, -4.2], m.lacquer);
  box(house, [-2.3, 1.5, -4.75], [-0.9, 2.4, -4.4], m.cabinet);
  box(house, [-6.3, 1.5, -4.75], [-5.6, 2.4, -4.4], m.cabinet);
  box(house, [-0.9, 0, -4.75], [0.35, 2.45, -4.1], m.lacquer);
  // Island with marble waterfall top
  box(house, [-5.0, 0, -2.55], [-2.0, 0.1, -1.75], m.lacquer);
  box(house, [-5.1, 0.1, -2.6], [-1.9, 0.88, -1.7], m.cabinet);
  box(house, [-5.2, 0.88, -2.65], [-1.8, 0.92, -1.45], m.marble);
  box(house, [-5.2, 0, -2.65], [-5.16, 0.88, -1.45], m.marble);
  box(house, [-1.84, 0, -2.65], [-1.8, 0.88, -1.45], m.marble);
  // Bar stools
  for (const x of [-4.3, -3.5, -2.7]) {
    const s = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.06, 24), m.fabric);
    seat.position.y = 0.7;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.66, 12), m.steel);
    pole.position.y = 0.36;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 24), m.steel);
    base.position.y = 0.012;
    for (const p of [seat, pole, base]) { p.castShadow = p.receiveShadow = true; s.add(p); }
    s.position.set(x, 0, -1.05);
    house.add(s);
  }
  for (const x of [-4.2, -2.8]) {
    placeModel(house, models.modern_ceiling_lamp_01, { pos: [x, 2.15, -2.05], height: 1.05 });
    pendantLight(house, x, 2.0, -2.05);
  }

  /* ---------- Dining ---------- */
  box(house, [-4.4, 0.72, 0.75], [-2.0, 0.76, 1.75], m.cabinet);
  for (const x of [-4.2, -2.2]) {
    box(house, [x - 0.04, 0, 0.85], [x + 0.04, 0.72, 0.9], m.steel);
    box(house, [x - 0.04, 0, 1.6], [x + 0.04, 0.72, 1.65], m.steel);
    box(house, [x - 0.04, 0.66, 0.85], [x + 0.04, 0.72, 1.65], m.steel);
  }
  for (const x of [-3.95, -3.2, -2.45]) {
    placeModel(house, models.dining_chair_02, { pos: [x, 0, 0.35], height: 0.95, lookAt: [x, 1.25] });
    placeModel(house, models.dining_chair_02, { pos: [x, 0, 2.15], height: 0.95, lookAt: [x, 1.25] });
  }
  placeModel(house, models.ceramic_vase_01, { pos: [-3.2, 0.76, 1.25], height: 0.32 });
  placeModel(house, models.modern_ceiling_lamp_01, { pos: [-3.2, 2.05, 1.25], height: 1.15 });
  pendantLight(house, -3.2, 1.9, 1.25, 3);

  /* ---------- Living room ---------- */
  box(house, [2.9, 0, -3.95], [7.1, 0.012, -0.75], m.rug, { cast: false });
  // Modern three-seat sofa
  box(house, [3.3, 0, -4.5], [6.7, 0.08, -3.55], m.steel);
  soft(house, [3.3, 0.08, -4.55], [6.7, 0.32, -3.5], m.fabric, 0.04);
  soft(house, [3.3, 0.08, -4.55], [3.52, 0.66, -3.5], m.fabric, 0.06);
  soft(house, [6.48, 0.08, -4.55], [6.7, 0.66, -3.5], m.fabric, 0.06);
  soft(house, [3.52, 0.32, -4.55], [6.48, 0.8, -4.3], m.fabric, 0.06);
  for (const x of [3.52, 4.5, 5.49]) {
    soft(house, [x + 0.01, 0.32, -4.32], [x + 0.97, 0.5, -3.52], m.fabric, 0.07);
    soft(house, [x + 0.03, 0.48, -4.35], [x + 0.95, 0.95, -4.12], m.fabric, 0.09);
  }
  placeModel(house, models.throw_pillows_01, { pos: [3.95, 0.5, -3.95], width: 0.85, rotY: 0.25 });
  placeModel(house, models.throw_pillows_01, { pos: [6.05, 0.5, -3.95], width: 0.85, rotY: -0.25 });
  const coffee = placeModel(house, models.coffee_table_round_01, { pos: [5, 0.012, -2.3], width: 1.0 });
  placeModel(house, models.potted_plant_04, { pos: [5.1, topOf(coffee), -2.3], height: 0.28 });
  placeModel(house, models.modern_arm_chair_01, { pos: [3.15, 0.012, -1.8], height: 0.85, lookAt: [5, -2.6] });
  placeModel(house, models.modern_arm_chair_01, { pos: [6.85, 0.012, -1.8], height: 0.85, lookAt: [5, -2.6] });
  const media = placeModel(house, models.modern_wooden_cabinet, { pos: [1.45, 0, -4.4], width: 1.5 });
  placeModel(house, models.ceramic_vase_01, { pos: [1.0, topOf(media), -4.4], height: 0.38 });
  placeModel(house, models.hanging_picture_frame_01, { pos: [1.45, 1.35, -4.72], height: 1.0, rotY: Math.PI });
  placeModel(house, models.potted_plant_01, { pos: [7.3, 0, -4.25], height: 1.4 });
  placeModel(house, models.potted_plant_02, { pos: [7.3, 0, 4.3], height: 1.1 });
  placeModel(house, models.potted_plant_02, { pos: [-5.4, 0, 4.3], height: 1.0 });
  placeModel(house, models.hanging_picture_frame_01, { pos: [-5.9, 1.3, 4.72], height: 0.9 });

  /* ---------- Master bedroom ---------- */
  box(house, [-3.3, UF, -3.9], [0.3, UF + 0.012, -1.3], m.rug, { cast: false });
  soft(house, [-2.85, UF, -4.75], [-0.15, UF + 1.15, -4.58], m.fabric, 0.04);
  box(house, [-2.5, UF + 0.05, -4.58], [-0.5, UF + 0.33, -2.35], m.cabinet);
  soft(house, [-2.45, UF + 0.33, -4.55], [-0.55, UF + 0.56, -2.4], m.linen, 0.08);
  soft(house, [-2.5, UF + 0.48, -3.75], [-0.5, UF + 0.62, -2.33], m.fabric, 0.06);
  soft(house, [-2.35, UF + 0.56, -4.5], [-1.55, UF + 0.74, -4.1], m.linen, 0.08);
  soft(house, [-1.45, UF + 0.56, -4.5], [-0.65, UF + 0.74, -4.1], m.linen, 0.08);
  placeModel(house, models.throw_pillows_01, { pos: [-1.5, UF + 0.56, -3.95], width: 0.8 });
  const ns1 = placeModel(house, models.side_table_01, { pos: [-3.25, UF, -4.4], height: 0.5 });
  const ns2 = placeModel(house, models.side_table_01, { pos: [0.25, UF, -4.4], height: 0.5 });
  placeModel(house, models.ceramic_vase_01, { pos: [-3.25, topOf(ns1), -4.4], height: 0.3 });
  placeModel(house, models.potted_plant_04, { pos: [0.25, topOf(ns2), -4.4], height: 0.25 });
  placeModel(house, models.Ottoman_01, { pos: [-1.5, UF, -1.85], width: 0.6 });
  box(house, [-6.3, UF, -4.75], [-3.9, 6.0, -4.15], m.cabinet);
  placeModel(house, models.mid_century_lounge_chair, { pos: [1.7, UF, 3.4], height: 1.0, lookAt: [-1.5, -1] });
  placeModel(house, models.potted_plant_01, { pos: [2.4, UF, -4.3], height: 1.3 });
  pendantLight(house, -1.5, 5.8, -2.5, 3);

  /* ---------- Roof terrace ---------- */
  placeModel(house, models.outdoor_table_chair_set_01, { pos: [5.6, UF, -2.4], width: 1.6, rotY: 0.3 });
  placeModel(house, models.potted_plant_02, { pos: [7.4, UF, 4.4], height: 1.0 });
  placeModel(house, models.potted_plant_01, { pos: [3.5, UF, 4.4], height: 1.2 });

  return { house, door, slider };
}
