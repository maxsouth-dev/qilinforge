/* ═══════════════════════════════════════════════════════════════
   QILIN FORGE — behaviour
   ═══════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(pointer: fine)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;

/* ───────────────────────── 1. i18n ───────────────────────── */
const LANGS = ['es', 'en', 'zh'];
let lang = (() => {
  try { const s = localStorage.getItem('qf-lang'); if (LANGS.includes(s)) return s; } catch (e) {}
  const n = (navigator.language || 'es').slice(0, 2).toLowerCase();
  return n === 'zh' ? 'zh' : n === 'en' ? 'en' : 'es';
})();

function t(key) { return (I18N[lang] && I18N[lang][key]) ?? I18N.es[key] ?? ''; }

function renderFAQ() {
  const host = $('#faqList');
  if (!host) return;
  host.innerHTML = '';
  (I18N[lang].faq || I18N.es.faq).forEach((group, gi) => {
    const sec = document.createElement('div');
    sec.className = 'faq__group reveal';
    const label = document.createElement('span');
    label.className = 'eyebrow eyebrow--red';
    label.textContent = group.g;
    sec.appendChild(label);

    group.items.forEach(([q, a], i) => {
      const id = `qa-${gi}-${i}`;
      const row = document.createElement('div');
      row.className = 'qa';
      row.innerHTML =
        `<button class="qa__q" type="button" aria-expanded="false" aria-controls="${id}" id="${id}-b">
           <span></span><span class="qa__ico" aria-hidden="true"></span>
         </button>
         <div class="qa__a" id="${id}" role="region" aria-labelledby="${id}-b"><div><p></p></div></div>`;
      row.querySelector('.qa__q span').textContent = q;
      row.querySelector('.qa__a p').textContent = a;
      sec.appendChild(row);
    });
    host.appendChild(sec);
  });
  wireFAQ();
  observeReveals(host);
}

function applyLang(next, animate = true) {
  lang = next;
  try { localStorage.setItem('qf-lang', next); } catch (e) {}
  const dict = I18N[lang];
  document.documentElement.lang = dict['html.lang'];
  document.documentElement.dataset.lang = lang;
  document.title = dict['doc.title'];

  const swap = () => {
    $$('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (v) el.textContent = v; });
    $$('[data-i18n-html]').forEach(el => { const v = t(el.dataset.i18nHtml); if (v) el.innerHTML = v; });
    $$('.lang button').forEach(b => b.classList.toggle('is-on', b.dataset.setlang === lang));
    renderFAQ();
    $$('.stat__num[data-ran="1"]').forEach(paintCounter);
    $$('[data-split]').forEach(el => {
      delete el.dataset.rawText;              // the copy just changed — re-read it
      splitText(el);
      if (el.dataset.wasIn === '1') el.classList.add('is-in');
    });
    buildTicker();
  };

  if (animate && !RM) {
    document.body.style.transition = 'opacity .22s ease';
    document.body.style.opacity = '.25';
    setTimeout(() => { swap(); document.body.style.opacity = '1'; }, 220);
    setTimeout(() => { document.body.style.transition = ''; }, 600);
  } else swap();
}

$$('.lang button').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.setlang !== lang) applyLang(b.dataset.setlang);
}));

/* ───────────────────────── 2. Split text ───────────────────────── */
function splitText(el) {
  const raw = el.dataset.rawText || el.textContent.trim();
  el.dataset.rawText = raw;
  const units = /\s/.test(raw) ? raw.split(/\s+/) : [...raw];
  const gap = /\s/.test(raw) ? ' ' : '';
  el.innerHTML = '';
  units.forEach((w, i) => {
    const outer = document.createElement('span');
    outer.className = 'split-line';
    const inner = document.createElement('span');
    inner.className = 'split-word';
    inner.style.transitionDelay = (0.045 * i) + 's';
    inner.textContent = w;
    outer.appendChild(inner);
    el.appendChild(outer);
    if (gap && i < units.length - 1) el.appendChild(document.createTextNode(gap));
  });
}

/* ───────────────────────── 3. Reveals ───────────────────────── */
let io;
function observeReveals(scope = document) {
  const targets = [
    ...$$('.reveal', scope),
    ...$$('.reveal-group > *', scope),
    ...$$('[data-split]', scope),
    ...$$('.crit li', scope),
    ...$$('.org', scope),
    ...$$('.respaldo__list li', scope)
  ];
  targets.forEach(el => io.observe(el));
}
io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const group = el.parentElement;
    if (group && group.classList.contains('reveal-group')) {
      const idx = [...group.children].indexOf(el);
      el.style.transitionDelay = (idx * 0.085) + 's';
    }
    el.classList.add('is-in');
    if (el.hasAttribute('data-split')) el.dataset.wasIn = '1';
    io.unobserve(el);
  });
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

/* ───────────────────────── 4. Ticker marquee ───────────────────────── */
let tickerX = 0, setWidth = 0, tickerTrack, baseSpeed = 0.42, speed = baseSpeed;
function buildTicker() {
  tickerTrack = $('.ticker__track');
  if (!tickerTrack) return;
  const first = tickerTrack.firstElementChild;
  [...tickerTrack.children].slice(1).forEach(n => n.remove());
  setWidth = first.getBoundingClientRect().width;
  const need = Math.ceil((innerWidth * 2) / Math.max(setWidth, 1)) + 1;
  for (let i = 0; i < need; i++) tickerTrack.appendChild(first.cloneNode(true));
}

/* ───────────────────────── 5. Counters ───────────────────────── */
/* El locale define el separador decimal y el de miles, asi 16.5 se lee
   16,5% en espanol y 16.5% en ingles sin duplicar la cifra en el markup. */
const NUM_LOCALE = { es: 'es-AR', en: 'en-US', zh: 'zh-CN' };

function fmtCount(el, n) {
  const dec = +(el.dataset.decimals || 0);
  return (el.dataset.prefix || '')
    + n.toLocaleString(NUM_LOCALE[lang] || 'es-AR', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
        useGrouping: el.dataset.format === 'dot'
      })
    + (el.dataset.suffix || '');
}

/* Escribe el valor final sin animar. Sirve para repintar al cambiar idioma. */
function paintCounter(el) { el.textContent = fmtCount(el, +el.dataset.count); }

function runCounter(el) {
  const target = +el.dataset.count;
  el.dataset.ran = '1';
  if (RM) { paintCounter(el); return; }
  const dur = 1500, t0 = performance.now();
  const step = now => {
    const p = clamp((now - t0) / dur, 0, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmtCount(el, target * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const counterIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { runCounter(e.target); counterIO.unobserve(e.target); }
}), { threshold: .6 });

/* ───────────────────────── 6. FAQ accordion ───────────────────────── */
function wireFAQ() {
  $$('.qa__q').forEach(btn => btn.addEventListener('click', () => {
    const row = btn.closest('.qa');
    const open = row.hasAttribute('open');
    $$('.qa[open]').forEach(o => { o.removeAttribute('open'); o.querySelector('.qa__q').setAttribute('aria-expanded', 'false'); });
    if (!open) { row.setAttribute('open', ''); btn.setAttribute('aria-expanded', 'true'); }
  }));
}

/* ───────────────────────── 7. Nav: theme, stuck, active ─────────────────────────
   Geometry is measured once (and on resize / font load) so the scroll loop
   never touches layout — otherwise a 9.500px page thrashes on every frame. */
const nav = $('#nav');
const navSections = $$('[data-nav]');
const navLinks = $$('.nav__links a');
const GEO = { sections: [], links: [], blocks: {} };

function absTop(el) { let t = 0, n = el; while (n) { t += n.offsetTop; n = n.offsetParent; } return t; }

function measure() {
  GEO.sections = navSections.map(el => {
    const top = absTop(el);
    return { top, bot: top + el.offsetHeight, theme: el.dataset.nav };
  });
  GEO.links = navLinks.map(a => {
    const sec = document.querySelector(a.getAttribute('href'));
    const top = sec ? absTop(sec) : 0;
    return { a, top, bot: top + (sec ? sec.offsetHeight : 0), href: a.getAttribute('href') };
  });
  const box = el => el ? { top: absTop(el), h: el.offsetHeight } : null;
  GEO.blocks.clover  = box(clover);
  GEO.blocks.meander = box(meander);
  GEO.blocks.seal    = box(sealEl);
  cacheArtRects();
}

let navTheme = '', navStuck = null, navActive = null;
function updateNav(y) {
  const stuck = y > 40;
  if (stuck !== navStuck) { nav.classList.toggle('stuck', stuck); navStuck = stuck; }

  const probe = y + 34;
  let theme = 'dark';
  for (const s of GEO.sections) if (probe >= s.top && probe < s.bot) theme = s.theme;
  if (theme !== navTheme) { nav.dataset.theme = theme; navTheme = theme; }

  const mid = y + innerHeight * 0.35;
  let active = '';
  for (const l of GEO.links) if (mid >= l.top && mid < l.bot) active = l.href;
  if (active !== navActive) {
    GEO.links.forEach(l => l.a.classList.toggle('active', l.href === active));
    navActive = active;
  }
}

/* ───────────────────────── 8. Mobile menu ───────────────────────── */
const burger = $('.burger'), menu = $('#menu');
function setMenu(open) {
  burger.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('open', open);
  menu.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('lock', open);
}
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
$$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

/* ───────────────────────── 9. Pointer candy ───────────────────────── */
const cursor = $('.cursor');
const cursorRing = $('.cursor__ring');
const cursorDot = $('.cursor__dot');
let cx = innerWidth / 2, cy = innerHeight / 2, rx = cx, ry = cy;
if (FINE && !RM) {
  addEventListener('mousemove', e => {
    cx = e.clientX; cy = e.clientY;
    cursor.classList.add('on');
    cursorDot.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
  }, { passive: true });
  addEventListener('mouseleave', () => cursor.classList.remove('on'));
  const HOT = 'a,button,.stat,.city,.seal,.card,.qa__q';
  document.addEventListener('mouseover', e => cursor.classList.toggle('hot', !!e.target.closest(HOT)));
}

/* magnetic buttons */
if (FINE && !RM) $$('.magnetic').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    el.style.transform = `translate(${dx * 14}px, ${dy * 10}px)`;
  });
  el.addEventListener('mouseleave', () => { el.style.transform = ''; });
});

/* card tilt */
const card = $('.tilt');
if (card && FINE && !RM) {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    card.style.transform = `perspective(1400px) rotateY(${dx * 4.2}deg) rotateX(${-dy * 3.4}deg) translateY(-6px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
}

/* ember burst on mint CTAs */
function burst(x, y) {
  if (RM) return;
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('i');
    p.className = 'ember';
    p.style.left = x + 'px'; p.style.top = y + 'px';
    if (i % 3 === 0) p.style.background = '#C3001D', p.style.boxShadow = '0 0 10px 2px rgba(195,0,29,.6)';
    document.body.appendChild(p);
    const ang = Math.random() * Math.PI * 2, d = 40 + Math.random() * 110;
    p.animate(
      [{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
       { transform: `translate(${Math.cos(ang) * d - 50}%, ${Math.sin(ang) * d + 60}%) scale(0)`, opacity: 0 }],
      { duration: 620 + Math.random() * 520, easing: 'cubic-bezier(.2,.7,.3,1)' }
    ).onfinish = () => p.remove();
  }
}
document.addEventListener('click', e => {
  const b = e.target.closest('.btn--mint');
  if (b) burst(e.clientX, e.clientY);
});

/* ───────────────────────── 10. Easter eggs ───────────────────────── */
const toast = $('#toast');
let toastTimer;
function say(msg) {
  toast.textContent = msg;
  toast.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('on'), 4200);
}

const seal = $('.seal'), chop = $('.chop');
if (seal && chop) seal.addEventListener('click', () => {
  chop.classList.remove('stamp'); void chop.offsetWidth; chop.classList.add('stamp');
  say(t('egg.stamp'));
});

const runner = $('#runner');
let buf = '';
addEventListener('keydown', e => {
  if (e.key.length !== 1) return;
  buf = (buf + e.key.toLowerCase()).slice(-8);
  if (buf.includes('qilin') || buf.includes('麒麟')) {
    buf = '';
    runner.classList.remove('go'); void runner.offsetWidth; runner.classList.add('go');
    say(t('egg.toast'));
  }
});

/* ───────────────────────── 11. Scroll loop ───────────────────────── */
const progress = $('.progress i');
const heroArt = $$('.hero__art .art');  // wrappers; imgs handle the entrance
const heroGlow = $('.hero__glow');
const clover = $('.ventana__pattern');
const meander = $('.respaldo__pattern');
const sealEl = $('.seal');
let mx = 0, my = 0, tmx = 0, tmy = 0;
let lastY = scrollY, vel = 0;

if (FINE && !RM) addEventListener('mousemove', e => {
  tmx = (e.clientX / innerWidth - .5) * 2;
  tmy = (e.clientY / innerHeight - .5) * 2;
  if (heroGlow) { heroGlow.style.setProperty('--gx', (e.clientX / innerWidth * 100) + '%'); heroGlow.style.setProperty('--gy', (e.clientY / innerHeight * 100) + '%'); }
}, { passive: true });

function frame() {
  const y = scrollY;
  vel = lerp(vel, Math.abs(y - lastY), .12);
  lastY = y;

  /* progress */
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

  /* nav */
  updateNav(y);

  /* ticker */
  if (tickerTrack && setWidth) {
    speed = lerp(speed, baseSpeed + Math.min(vel * .09, 3.4), .08);
    tickerX -= speed;
    if (tickerX <= -setWidth) tickerX += setWidth;
    tickerTrack.style.transform = `translate3d(${tickerX}px,0,0)`;
  }

  if (!RM) {
    const vh = innerHeight;
    const onScreen = b => b && (b.top - y) < vh && (b.top - y + b.h) > 0;

    /* hero parallax — only while the hero is anywhere near the viewport */
    mx = lerp(mx, tmx, .06); my = lerp(my, tmy, .06);
    if (y < vh * 1.25) {
      const heroP = clamp(y / vh, 0, 1.4);
      heroArt.forEach(el => {
        const d = +el.dataset.depth || 12;
        el.style.transform =
          `translate3d(${-mx * d}px, ${-my * d * .7 + heroP * d * 3.2}px, 0) scale(${1 + heroP * .04})`;
        if (FINE && el._r) {
          const near = clamp(1 - Math.hypot(cx - el._r.x, cy - el._r.y + y) / 520, 0, 1);
          const o = (0.13 + near * 0.5).toFixed(2);
          if (el._o !== o) { el.style.setProperty('--o', o); el._o = o; }
        }
      });
    }

    /* pattern parallax */
    const bc = GEO.blocks.clover;
    if (onScreen(bc)) clover.style.transform = `translate3d(0,${((bc.top - y) - vh) * -0.07}px,0)`;
    const bm = GEO.blocks.meander;
    if (onScreen(bm)) {
      const d = (bm.top - y) - vh;
      meander.style.transform = `translate3d(${d * 0.03}px,${d * -0.05}px,0)`;
    }

    /* the seal turns slowly with the scroll instead of spinning forever */
    const bs = GEO.blocks.seal;
    if (sealEl && onScreen(bs)) {
      const p = ((bs.top - y) + bs.h / 2 - vh / 2) / vh;
      sealEl.style.setProperty('--rot', (-p * 26).toFixed(1) + 'deg');
    }

    /* cursor ring easing */
    if (FINE) {
      rx = lerp(rx, cx, .16); ry = lerp(ry, cy, .16);
      cursorRing.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    }
  }
  requestAnimationFrame(frame);
}

/* ───────────────────────── 12. Boot ───────────────────────── */
function boot() {
  applyLang(lang, false);
  $$('[data-split]').forEach(splitText);
  observeReveals();
  $$('.stat__num').forEach(el => counterIO.observe(el));
  buildTicker();
  measure();
  updateNav(scrollY);
  requestAnimationFrame(frame);

  const intro = $('#intro');
  const reveal = () => {
    intro.classList.add('done');
    document.body.classList.remove('lock');
    heroArt.forEach(el => el.classList.add('in'));
    $$('.hero .reveal, .hero [data-split]').forEach((el, i) => setTimeout(() => el.classList.add('is-in'), 60 * i));
    $$('.hero [data-split]').forEach(el => el.dataset.wasIn = '1');
  };
  setTimeout(measure, 1200);
  if (RM) { intro.remove(); reveal(); }
  else { document.body.classList.add('lock'); setTimeout(reveal, 1750); }
}

function cacheArtRects() {
  heroArt.forEach(el => {
    const r = el.getBoundingClientRect();
    el._r = { x: r.left + r.width / 2, y: r.top + r.height / 2 + scrollY };
  });
}
let reTimer;
addEventListener('resize', () => {
  clearTimeout(reTimer);
  reTimer = setTimeout(() => { buildTicker(); measure(); }, 140);
}, { passive: true });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(measure, 60));
if (document.readyState !== 'loading') boot();
else addEventListener('DOMContentLoaded', boot);

})();
