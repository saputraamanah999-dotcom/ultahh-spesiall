// Bunga SVG satuan (per biji, bukan gabungan) untuk menggantikan hujan emoji.
// Tiap bunga digambar sendiri (mawar, tulip, anemone, poppy, daisy, kuncup) lengkap dengan daun & kilau emas,
// lalu dijadikan data-URI <img> supaya ringan dan di-cache.
import { h, rand, pick } from './util.js';

const REDS = [
  { d: '#7d0f2b', m: '#c4203f', l: '#f0606f', s: '#5a0a1f' },
  { d: '#9a1530', m: '#d83a4c', l: '#ff8d92', s: '#6e0e22' },
  { d: '#8a1029', m: '#bb1a38', l: '#e9505f', s: '#5f0b1d' },
];
const GREEN = { d: '#2f6b45', m: '#4f9a63', l: '#8fcf93' };
const GOLD = '#f6cf6a';

const rot = (a, cx = 50, cy = 50) => `rotate(${a} ${cx} ${cy})`;
const leaf = (x, y, a, s = 1) =>
  `<g transform="translate(${x} ${y}) ${rot(a, 0, 0)} scale(${s})"><path d="M0 0 C10 -12 28 -12 38 0 C28 12 10 12 0 0Z" fill="url(#gl)"/><path d="M2 0 H34" stroke="${GREEN.d}" stroke-opacity=".5" stroke-width="1.2" fill="none"/></g>`;
const sparkle = (x, y, s = 1, o = 0.95) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8Z" fill="${GOLD}" opacity="${o}"/>`;

function defs(c) {
  return `<defs>
  <radialGradient id="rg" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="${c.l}"/><stop offset=".55" stop-color="${c.m}"/><stop offset="1" stop-color="${c.d}"/></radialGradient>
  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.l}"/><stop offset=".5" stop-color="${c.m}"/><stop offset="1" stop-color="${c.d}"/></linearGradient>
  <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GREEN.l}"/><stop offset="1" stop-color="${GREEN.d}"/></linearGradient>
  <radialGradient id="gc" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="#fff2b8"/><stop offset="1" stop-color="#d9a23a"/></radialGradient>
  </defs>`;
}
const wrap = (c, w, hh, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}">${defs(c)}${body}</svg>`;

/* ---- mawar (tampak atas) ---- */
function rose(c) {
  let b = leaf(50, 52, 205, 1.05) + leaf(50, 52, -25, 1.05) + leaf(50, 52, 90, 0.8);
  const ring = (n, r, rx, ry, off, fill, st) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = (360 / n) * i + off;
      s += `<ellipse cx="50" cy="${50 - r}" rx="${rx}" ry="${ry}" transform="${rot(a)}" fill="${fill}" stroke="${st}" stroke-width="1.1" stroke-opacity=".55"/>`;
    }
    return s;
  };
  b += ring(7, 21, 19, 21, 0, 'url(#rg)', c.s);
  b += ring(6, 14, 15, 16, 20, 'url(#rg)', c.s);
  b += ring(5, 8, 11, 12, 10, 'url(#rg)', c.s);
  b += `<path d="M50 50 m-5 0 a5 5 0 1 1 5 5 a8 8 0 1 1 -8 -8 a11 11 0 1 1 11 11" fill="none" stroke="${c.s}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`;
  b += `<ellipse cx="40" cy="36" rx="9" ry="5" transform="${rot(-30, 40, 36)}" fill="#fff" opacity=".22"/>`;
  b += sparkle(88, 14, 0.8) + sparkle(12, 86, 0.6, 0.8);
  return wrap(c, 100, 100, b);
}

/* ---- tulip (berbatang) ---- */
function tulip(c) {
  let b = `<path d="M50 78 C49 100 51 120 50 146" stroke="${GREEN.d}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
  b += `<path d="M50 140 C28 128 20 104 24 88 C40 98 50 118 50 140Z" fill="url(#gl)"/>`;
  b += `<path d="M50 132 C70 124 80 106 77 92 C62 100 52 112 50 132Z" fill="url(#gl)" opacity=".9"/>`;
  b += `<path d="M50 80 C27 78 19 52 23 22 C38 28 49 46 50 80Z" fill="url(#pg)" stroke="${c.s}" stroke-opacity=".5" stroke-width="1"/>`;
  b += `<path d="M50 80 C73 78 81 52 77 22 C62 28 51 46 50 80Z" fill="url(#pg)" stroke="${c.s}" stroke-opacity=".5" stroke-width="1"/>`;
  b += `<path d="M50 84 C32 80 31 46 50 14 C69 46 68 80 50 84Z" fill="url(#rg)" stroke="${c.s}" stroke-opacity=".6" stroke-width="1"/>`;
  b += `<path d="M44 34 C41 50 42 66 47 76" stroke="#fff" stroke-opacity=".35" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  b += sparkle(84, 18, 0.8) + sparkle(14, 60, 0.6, 0.8);
  return wrap(c, 100, 150, b);
}

/* ---- anemone ---- */
function anemone(c) {
  let b = leaf(50, 56, 200, 0.9) + leaf(50, 56, -20, 0.9);
  for (let i = 0; i < 7; i++) {
    b += `<ellipse cx="50" cy="26" rx="17" ry="25" transform="${rot((360 / 7) * i + 8)}" fill="url(#rg)" stroke="${c.s}" stroke-opacity=".5" stroke-width="1"/>`;
  }
  b += `<circle cx="50" cy="50" r="13" fill="#fff" opacity=".92"/><circle cx="50" cy="50" r="9.5" fill="#1b1230"/>`;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, x = 50 + Math.cos(a) * 14.5, y = 50 + Math.sin(a) * 14.5;
    b += `<line x1="50" y1="50" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#1b1230" stroke-width="1.2"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.7" fill="#1b1230"/>`;
  }
  b += sparkle(90, 12, 0.8);
  return wrap(c, 100, 100, b);
}

/* ---- poppy / kamelia ---- */
function poppy(c) {
  let b = leaf(50, 54, 160, 0.9) + leaf(50, 54, 20, 0.9);
  for (let i = 0; i < 5; i++) {
    b += `<path transform="${rot(72 * i)}" d="M50 50 C22 46 14 14 38 8 C48 5 52 5 62 8 C86 14 78 46 50 50Z" fill="url(#rg)" stroke="${c.s}" stroke-opacity=".55" stroke-width="1"/>`;
    b += `<path transform="${rot(72 * i)}" d="M50 46 C48 34 47 24 50 14" stroke="${c.s}" stroke-opacity=".35" stroke-width="1.2" fill="none"/>`;
  }
  b += `<circle cx="50" cy="50" r="8.5" fill="#2a0c1a"/>`;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b += `<circle cx="${(50 + Math.cos(a) * 11).toFixed(1)}" cy="${(50 + Math.sin(a) * 11).toFixed(1)}" r="1.7" fill="url(#gc)"/>`;
  }
  b += sparkle(12, 14, 0.7) + sparkle(88, 88, 0.8);
  return wrap(c, 100, 100, b);
}

/* ---- daisy merah ---- */
function daisy(c) {
  let b = leaf(50, 56, 205, 0.8) + leaf(50, 56, -25, 0.8);
  for (let i = 0; i < 16; i++) {
    b += `<ellipse cx="50" cy="24" rx="6" ry="21" transform="${rot((360 / 16) * i)}" fill="url(#pg)" stroke="${c.s}" stroke-opacity=".4" stroke-width=".8"/>`;
  }
  b += `<circle cx="50" cy="50" r="12" fill="url(#gc)" stroke="#b27a22" stroke-width="1"/>`;
  for (let i = 0; i < 9; i++) b += `<circle cx="${(50 + Math.cos(i) * 5.5 * (i % 2 ? 1 : .6)).toFixed(1)}" cy="${(50 + Math.sin(i) * 5.5 * (i % 2 ? 1 : .6)).toFixed(1)}" r="1.2" fill="#b27a22" opacity=".7"/>`;
  b += sparkle(88, 12, 0.7);
  return wrap(c, 100, 100, b);
}

/* ---- kuncup mungil + daun ---- */
function bud(c) {
  let b = `<path d="M30 118 C30 90 32 70 36 52" stroke="${GREEN.d}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  b += `<path d="M31 100 C14 96 8 82 10 70 C24 74 31 86 31 100Z" fill="url(#gl)"/>`;
  b += `<path d="M31 88 C46 84 54 72 52 60 C38 64 31 74 31 88Z" fill="url(#gl)"/>`;
  b += `<path d="M36 56 C22 54 20 36 36 20 C52 36 50 54 36 56Z" fill="url(#rg)" stroke="${c.s}" stroke-opacity=".6" stroke-width="1"/>`;
  b += `<path d="M36 56 C30 46 30 34 36 24" stroke="#fff" stroke-opacity=".3" stroke-width="2" fill="none"/>`;
  b += `<path d="M26 62 C30 54 42 54 46 62 C42 66 30 66 26 62Z" fill="${GREEN.m}"/>`;
  b += sparkle(58, 22, 0.7);
  return wrap(c, 70, 120, b);
}

/* ---- kelopak tunggal ---- */
function petal(c) {
  const b = `<path d="M30 4 C54 18 54 62 30 76 C6 62 6 18 30 4Z" fill="url(#pg)" stroke="${c.s}" stroke-opacity=".5" stroke-width="1"/><path d="M30 12 C30 30 30 50 30 68" stroke="#fff" stroke-opacity=".25" stroke-width="1.4" fill="none"/>`;
  return wrap(c, 60, 80, b);
}

/* ---- bunga biru kecil (aksen tema) ---- */
function forget(c) {
  const blue = { d: '#2c52b5', m: '#5b8cf0', l: '#c3d9ff', s: '#1d3a85' };
  let b = '';
  for (let i = 0; i < 5; i++) b += `<ellipse cx="50" cy="29" rx="15" ry="21" transform="${rot(72 * i)}" fill="url(#rg)" stroke="${blue.s}" stroke-opacity=".5"/>`;
  b += `<circle cx="50" cy="50" r="8" fill="#fff6c9"/><circle cx="50" cy="50" r="4" fill="#f2b84b"/>`;
  return wrap(blue, 100, 100, b);
}

const KINDS = { rose, tulip, anemone, poppy, daisy, bud, petal, forget };
const cache = new Map();

/** URL data-URI untuk satu bunga. kind: rose|tulip|anemone|poppy|daisy|bud|petal|forget ; v: variasi warna 0..2 */
export function flowerURL(kind, v = 0) {
  const key = kind + v;
  if (!cache.has(key)) {
    const svg = KINDS[kind](REDS[v % REDS.length]);
    cache.set(key, 'data:image/svg+xml;utf8,' + encodeURIComponent(svg));
  }
  return cache.get(key);
}
export const flowerImg = (kind, v = 0, attrs = {}) => h('img', { src: flowerURL(kind, v), alt: '', draggable: 'false', ...attrs });
export const sparkleURL = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 20 20"><path d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4Z" fill="${GOLD}"/></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
})();

// Bunga ASLI dari asset (per kuntum, bukan gabungan)
export const REAL = {
  rose: '/assets/lb/rose-stem.webp', tulip: '/assets/lb/tulip-stem.webp', dahlia: '/assets/lb/dahlia1.webp', dahlia2: '/assets/lb/dahlia2.webp',
  anemone: '/assets/lb/anemone.webp', daisy: '/assets/lb/daisy1.webp', daisy2: '/assets/red/daisy2.webp', gypso: '/assets/lb/gypso.webp',
  ribbon: '/assets/lb/ribbon.webp', heart: '/assets/lb/heart-wc.webp', seal: '/assets/lb/seal.webp', dots: '/assets/lb/dots.webp',
  bhydra: '/assets/blue/blue-hydrangea-01.webp', bcorn1: '/assets/blue/blue-cornflower-01.webp', bcorn2: '/assets/blue/blue-cornflower-02.webp', biris: '/assets/blue/blue-iris-01.webp',
  bnig: '/assets/blue/blue-nigella-01.webp', bforget: '/assets/blue/forget-me-not-cluster-01.webp', bdaisy: '/assets/blue/white-daisy-01.webp',
  petal1: '/assets/petals/p-ruby.webp', petal2: '/assets/petals/p-scarlet.webp', petal3: '/assets/petals/p-wine1.webp',
};
export const REAL_RAIN = ['rose', 'tulip', 'dahlia', 'dahlia2', 'anemone', 'daisy', 'daisy2', 'rose', 'dahlia', 'petal1', 'petal2', 'petal3', 'petal1'];
export const realImg = (k, attrs = {}) => h('img', { src: REAL[k], alt: '', draggable: 'false', ...attrs });
export const preloadList = () => Object.values(REAL);

const FALL = ['rose', 'tulip', 'anemone', 'poppy', 'daisy', 'bud', 'petal', 'rose', 'poppy', 'forget'];

/** Hujan bunga merah satuan (pengganti hujan emoji). Mengembalikan fungsi stop. */
export function flowerRain({ ms = 7000, every = 260, kinds = FALL, size = [30, 58], root = null } = {}) {
  const spawn = () => {
    const useReal = Math.random() < 0.85;
    const kind = pick(kinds), w = rand(size[0], size[1]);
    const rk = pick(REAL_RAIN), isPetal = rk.startsWith('petal');
    const el = h('img', {
      class: 'flower-fall', src: useReal ? REAL[rk] : flowerURL(kind, Math.floor(rand(0, 3))), alt: '', draggable: 'false',
      style: { left: rand(-3, 100) + 'vw', width: (useReal && isPetal ? w * 0.55 : w) + 'px', '--dx': rand(-70, 70) + 'px', '--rot': rand(-540, 540) + 'deg', animationDuration: rand(5.5, 9.5) + 's', opacity: rand(0.8, 1) },
    });
    (root || document.body).append(el);
    setTimeout(() => el.remove(), 10200);
  };
  const t = setInterval(spawn, every);
  for (let i = 0; i < 5; i++) setTimeout(spawn, i * 120);
  const stop = () => clearInterval(t);
  if (ms) setTimeout(stop, ms);
  return stop;
}

/** Letupan bunga dari satu titik (dipakai saat ketuk). */
export function flowerBurst(x, y, n = 14) {
  for (let i = 0; i < n; i++) {
    const w = rand(22, 44);
    const p = h('img', { class: 'pop-petal', src: Math.random() < 0.8 ? REAL[pick(REAL_RAIN)] : flowerURL(pick(FALL), Math.floor(rand(0, 3))), alt: '', style: { left: x + 'px', top: y + 'px', width: w + 'px' } });
    document.body.append(p);
    p.animate(
      [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: `translate(calc(-50% + ${rand(-160, 160)}px), calc(-50% + ${rand(-180, 120)}px)) rotate(${rand(-360, 360)}deg) scale(1)`, opacity: 0 }],
      { duration: rand(900, 1600), easing: 'cubic-bezier(.2,.7,.3,1)' }
    ).finished.then(() => p.remove());
  }
}
