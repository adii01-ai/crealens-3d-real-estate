import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

/*
 * Camera path through the house. Points with `at` are reached when the matching
 * [data-scene] element scrolls to the top of the screen; points without `at` are
 * in-between waypoints that keep the camera inside doorways and on the stairs.
 * Eye height is ~1.6 m above the floor (garden level is -0.3, upper floor 3.5).
 */
const PATH = [
  { at: 'hero', pos: [24, 7, 30], look: [-9, 3, 4], mobile: { pos: [24, 8, 34], look: [1, -7, 2] } },
  { at: 'arrive', pos: [-3.2, 1.35, 17.5], look: [-4, 1.9, 5] },
  { at: 'door', pos: [-4, 1.35, 7.6], look: [-4, 1.4, 3] },
  { pos: [-4, 1.6, 3.9], look: [-2.2, 1.35, 0] },
  { at: 'living', pos: [1.0, 1.55, 2.6], look: [5, 0.7, -2.8] },
  { at: 'kitchen', pos: [-0.6, 1.65, -0.2], look: [-3.8, 0.95, -3.4] },
  { pos: [-2.4, 1.65, 3.0], look: [-6.5, 1.8, 1.5] },
  { at: 'stairs', pos: [-5.0, 1.75, 2.6], look: [-7.6, 1.7, 0.8] },
  { pos: [-6.2, 1.75, 4.25], look: [-7.2, 2.6, 1] },
  { pos: [-7.2, 1.95, 4.15], look: [-7.2, 3.4, -1] },
  { pos: [-7.2, 3.6, 1.2], look: [-7.2, 4.7, -3] },
  { pos: [-7.2, 5.15, -1.6], look: [-6, 5, -4] },
  { pos: [-6.0, 5.15, -2.4], look: [-1.5, 4.4, -3.6] },
  { at: 'bedroom', pos: [-3.4, 5.2, 1.4], look: [-1.5, 4.0, -3.6] },
  { id: 'terraceDoor', pos: [0.6, 5.15, 2.3], look: [4, 5.0, 2.3] },
  { pos: [3.0, 5.15, 2.3], look: [8, 4.6, 5] },
  { at: 'terrace', pos: [6.4, 5.2, 3.2], look: [6.5, 0.5, 11] },
  { at: 'homes', pos: [-14, 6, 20], look: [5, 2.5, 3.4], mobile: { pos: [-15, 8, 26], look: [0, -2, 0] } },
  { at: 'commercial', pos: [10, 16, 30], look: [-35, 30, -280], mobile: { pos: [10, 16, 34], look: [30, 20, -280] } },
  { at: 'why', pos: [8, 48, 42], look: [2, 0, 0] },
  { at: 'about', pos: [-12, 5, 22], look: [-4.4, 2.5, -2.4], mobile: { pos: [-20, 6, 22], look: [0, -1.5, 0] } },
  { at: 'contact', pos: [16, 2.2, 22], look: [4, 2, -3], mobile: { pos: [18, 3, 26], look: [0, -1.5, 0] } },
];

const clamp01 = (t) => Math.min(Math.max(t, 0), 1);
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const ease = (t) => 0.35 * clamp01(t) + 0.65 * smooth(t);

export function setupSmoothScroll(reducedMotion) {
  if (reducedMotion) return null;
  const lenis = new Lenis({ lerp: 0.08, smoothWheel: true, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function setupReveals(reducedMotion) {
  if (reducedMotion) return;
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  gsap.to('.scroll-hint', { opacity: 0, scrollTrigger: { trigger: '#hero', start: 'top top', end: '20% top', scrub: true } });
}

export function setupCameraPath(camera, { mobile, reducedMotion, door, slider }) {
  const ctrl = PATH.map((c) => (mobile && c.mobile ? { ...c, ...c.mobile } : c));
  const posCurve = new THREE.CatmullRomCurve3(ctrl.map((c) => new THREE.Vector3(...c.pos)), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(ctrl.map((c) => new THREE.Vector3(...c.look)), false, 'centripetal');
  const last = ctrl.length - 1;

  const markers = [...document.querySelectorAll('[data-scene]')];
  const idx = markers.map((el) => {
    const i = ctrl.findIndex((c) => c.at === el.dataset.scene);
    if (i < 0) throw new Error(`No camera point for data-scene="${el.dataset.scene}"`);
    return i;
  });
  const captions = markers.map((el) => el.querySelector('.tour-card'));
  const dots = [...document.querySelectorAll('.tour-hud li')];
  const hud = document.querySelector('.tour-hud');

  let tops = [];
  const measure = () => { tops = markers.map((el) => el.getBoundingClientRect().top + window.scrollY); };
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  new ResizeObserver(measure).observe(document.body);

  // Scroll → progress in "marker units": 0 at the hero, 1 at the next marker, ...
  // Each move happens over the last 70% of the gap between markers, then holds.
  function markerProgress() {
    const y = window.scrollY;
    let q = 0;
    for (let i = 1; i < tops.length; i++) {
      const win = (tops[i] - tops[i - 1]) * 0.7;
      q += ease((y - (tops[i] - win)) / win);
    }
    return q;
  }

  const doorAt = ctrl.findIndex((c) => c.at === 'door');
  const sliderAt = ctrl.findIndex((c) => c.id === 'terraceDoor');
  const look = new THREE.Vector3();
  let p = null;

  return {
    update(dt, mouse) {
      const q = markerProgress();
      const k = Math.min(Math.floor(q), idx.length - 2);
      const target = idx[k] + (q - k) * (idx[k + 1] - idx[k]);
      p = p === null || reducedMotion ? target : p + (target - p) * (1 - Math.exp(-dt * 6));

      const u = Math.min(Math.max(p / last, 0), 1);
      posCurve.getPoint(u, camera.position);
      lookCurve.getPoint(u, look);
      camera.lookAt(look);
      if (!reducedMotion) {
        camera.rotateY(-mouse.x * 0.05);
        camera.rotateX(mouse.y * 0.035);
      }

      // Doors open as the camera approaches them
      door.rotation.y = 1.45 * smooth((p - (doorAt - 0.35)) / 0.6);
      slider.position.z = -1.35 * smooth((p - (sliderAt - 0.7)) / 0.6);

      // Room captions + tour progress
      let active = -1;
      captions.forEach((c, i) => {
        if (!c) return;
        const on = Math.abs(q - i) < 0.35;
        c.classList.toggle('show', on);
        if (on) active = i;
      });
      if (hud) {
        const tourIdx = captions.map((c, i) => (c ? i : null)).filter((i) => i !== null);
        hud.classList.toggle('show', q > tourIdx[0] - 0.5 && q < tourIdx[tourIdx.length - 1] + 0.5);
        dots.forEach((d, j) => d.classList.toggle('on', tourIdx[j] === active || (active < 0 && Math.round(q) === tourIdx[j])));
      }
    },
  };
}
