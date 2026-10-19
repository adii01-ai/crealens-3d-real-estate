// Downloads the CC0 3D models, PBR textures and sky HDRI used by the house scene
// from Poly Haven (https://polyhaven.com — public domain, no attribution required).
// Usage: node scripts/fetch-assets.mjs
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODELS, TEXTURES, HDRI } from '../src/scene/assets.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');
const RES = '1k';

const exists = (p) => access(p).then(() => true, () => false);

async function download(url, dest) {
  if (await exists(dest)) return;
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  console.log('  ✓', dest.replace(root, 'public/assets'));
}

const files = async (id) => {
  const res = await fetch(`https://api.polyhaven.com/files/${id}`);
  if (!res.ok) throw new Error(`No Poly Haven asset "${id}"`);
  return res.json();
};

for (const id of Object.keys(MODELS)) {
  console.log('model', id);
  const g = (await files(id)).gltf[RES].gltf;
  const dir = join(root, 'models', id);
  await download(g.url, join(dir, `${id}.gltf`));
  for (const [rel, f] of Object.entries(g.include || {})) await download(f.url, join(dir, rel));
}

const MAPS = { diff: 'Diffuse', nor: 'nor_gl', rough: 'Rough' };
for (const id of Object.keys(TEXTURES)) {
  console.log('texture', id);
  const f = await files(id);
  for (const [short, key] of Object.entries(MAPS)) {
    const entry = f[key]?.[RES]?.jpg;
    if (entry) await download(entry.url, join(root, 'textures', id, `${short}.jpg`));
  }
}

console.log('hdri', HDRI);
await download((await files(HDRI)).hdri[RES].hdr.url, join(root, 'hdri', `${HDRI}.hdr`));
console.log('Done.');
