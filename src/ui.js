import { homes, commercial } from './data/listings.js';

const houseIcon = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 30 32 10l24 20v24H8z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><rect x="26" y="38" width="12" height="16" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>`;
const towerIcon = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 56V12h20v44M38 26h10v30M12 56h42" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 20h8M24 28h8M24 36h8M24 44h8" stroke="currentColor" stroke-width="2.5"/></svg>`;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function card(item, kind) {
  const art = item.image
    ? `<div class="card-art has-photo"><img src="${esc(item.image)}" alt="${esc(item.title)}" loading="lazy" decoding="async" />`
    : `<div class="card-art" style="--h:${item.hue}">${kind === 'home' ? houseIcon : towerIcon}`;
  const meta = kind === 'home'
    ? `<span>${item.beds} bed</span><span>${item.baths} bath</span><span>${esc(item.area)}</span>`
    : `<span>${esc(item.type)}</span><span>${esc(item.area)}</span>`;
  return `
    <article class="card reveal">
      ${art}<span class="tag">${esc(item.tag)}</span></div>
      <div class="card-body">
        <h3>${esc(item.title)}</h3>
        <p class="loc">${esc(item.location)}</p>
        <div class="meta">${meta}</div>
        <div class="card-foot"><b>${esc(item.price)}</b><a href="#contact" class="link">Enquire →</a></div>
      </div>
    </article>`;
}

function counters() {
  const els = document.querySelectorAll('[data-count]');
  const run = (el) => {
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / 1600, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3))).toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

function nav() {
  const header = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('#navLinks a').forEach((a) =>
    a.addEventListener('click', () => {
      header.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
}

function form() {
  const f = document.getElementById('contactForm');
  const note = document.getElementById('formNote');
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!f.name.value.trim() || !f.email.checkValidity() || !f.email.value) {
      note.textContent = 'Please add your name and a valid email.';
      note.className = 'form-note error';
      return;
    }
    // TODO: connect to the client's email service / CRM (e.g. Formspree, EmailJS or an API endpoint).
    note.textContent = `Thanks ${f.name.value.trim()}! A Crealens agent will be in touch shortly.`;
    note.className = 'form-note ok';
    f.reset();
  });
}

export function initUI() {
  document.getElementById('homeCards').innerHTML = homes.map((h) => card(h, 'home')).join('');
  document.getElementById('commercialCards').innerHTML = commercial.map((c) => card(c, 'commercial')).join('');
  document.getElementById('year').textContent = new Date().getFullYear();
  counters();
  nav();
  form();
}
