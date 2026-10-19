import * as THREE from 'three';

// Box-projected UVs in world metres, so textures keep a real scale on any size of box.
function metreUVs(geo, offset) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + offset.x, y = p.getY(i) + offset.y, z = p.getZ(i) + offset.z;
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ax >= ay && ax >= az) uv.setXY(i, z, y);
    else if (ay >= az) uv.setXY(i, x, z);
    else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true;
}

// Axis-aligned box from min/max corners. `mat` is one material or [+x,-x,+y,-y,+z,-z].
export function box(parent, [x0, y0, z0], [x1, y1, z1], mat, { cast = true, receive = true } = {}) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const geo = new THREE.BoxGeometry(w, h, d);
  const center = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  metreUVs(geo, center);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(center);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

// Material array for a wall whose outside faces +z / -z / +x / -x.
export function faces(side, ext, int, edge = int) {
  const m = [edge, edge, edge, edge, edge, edge];
  const idx = { '+x': 0, '-x': 1, '+z': 4, '-z': 5 };
  const opposite = { '+x': '-x', '-x': '+x', '+z': '-z', '-z': '+z' };
  m[idx[side]] = ext;
  m[idx[opposite[side]]] = int;
  return m;
}

/**
 * Wall along X (at z) or along Z (at x), with rectangular openings.
 * openings: [{ from, to, bottom, top }] measured along the wall's axis.
 */
export function wall(parent, { axis, at, from, to, y0, y1, t = 0.25, mat, openings = [] }) {
  const seg = (a, b, ya, yb) => {
    if (b - a < 1e-3 || yb - ya < 1e-3) return;
    if (axis === 'x') box(parent, [a, ya, at - t / 2], [b, yb, at + t / 2], mat);
    else box(parent, [at - t / 2, ya, a], [at + t / 2, yb, b], mat);
  };
  const ops = [...openings].sort((p, q) => p.from - q.from);
  let cursor = from;
  for (const o of ops) {
    seg(cursor, o.from, y0, y1);
    seg(o.from, o.to, y0, o.bottom);
    seg(o.from, o.to, o.top, y1);
    cursor = o.to;
  }
  seg(cursor, to, y0, y1);
}

// Glazed opening: glass pane + slim aluminium frame and mullions.
export function glazing(parent, { axis, at, from, to, bottom, top, mats, mullions = [], t = 0.06 }) {
  const f = 0.05;
  const g = new THREE.Group();
  const add = (a0, a1, ya, yb, depth, mat, cast) => {
    if (axis === 'x') box(g, [a0, ya, at - depth / 2], [a1, yb, at + depth / 2], mat, { cast, receive: false });
    else box(g, [at - depth / 2, ya, a0], [at + depth / 2, yb, a1], mat, { cast, receive: false });
  };
  add(from, to, bottom, top, 0.012, mats.glass, false);
  add(from, to, bottom, bottom + f, t, mats.frame, true);
  add(from, to, top - f, top, t, mats.frame, true);
  for (const m of [from, ...mullions, to]) add(m - f / 2, m + f / 2, bottom, top, t, mats.frame, true);
  parent.add(g);
  return g;
}

// Load a glTF model, normalise its size and drop it into place.
export function placeModel(parent, gltf, { pos = [0, 0, 0], height, width, scale, rotY = 0, lookAt, shadow = true } = {}) {
  const obj = gltf.scene.clone(true);
  const bbox = new THREE.Box3().setFromObject(obj);
  const size = bbox.getSize(new THREE.Vector3());
  let s = scale ?? 1;
  if (height) s = height / size.y;
  if (width) s = width / Math.max(size.x, size.z);
  obj.scale.setScalar(s);
  obj.position.set(pos[0], pos[1] - bbox.min.y * s, pos[2]);
  if (lookAt) obj.lookAt(lookAt[0], obj.position.y, lookAt[1]);
  else obj.rotation.y = rotY;
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = shadow;
      o.receiveShadow = true;
    }
  });
  parent.add(obj);
  return obj;
}
