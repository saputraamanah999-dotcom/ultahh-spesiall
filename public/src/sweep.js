// Animasi transisi: bunga bertebaran menutupi layar (dari kanan-atas menyapu ke bawah-kiri),
// ditahan sebentar, lalu menyapu keluar ke bawah.
import { rand, pick, h } from './util.js';

const SETS = {
  red: {
    blooms: ['red/daisy1', 'red/dahlia1', 'red/anemone', 'red/daisy2', 'red/dahlia2'].map((n) => `/assets/${n}.webp`),
    petals: ['p-ruby', 'p-scarlet', 'p-wine1', 'p-wine2', 'p-cream'].map((n) => `/assets/petals/${n}.webp`),
    backing: '',
  },
  blue: {
    blooms: ['blue-cornflower-01', 'blue-hydrangea-01', 'blue-iris-01', 'blue-cornflower-02', 'blue-nigella-01', 'forget-me-not-cluster-01', 'white-daisy-01'].map((n) => `/assets/blue/${n}.webp`),
    petals: ['petal-cream-broad-01', 'petal-blush-broad-01', 'petal-cream-long-01'].map((n) => `/assets/petals/${n}.webp`),
    backing: 'blue',
  },
};
export const sweepAssets = () => [...SETS.red.blooms, ...SETS.red.petals, ...SETS.blue.blooms, ...SETS.blue.petals, '/assets/red/wall.webp'];

const root = document.getElementById('sweep');
let live = null;

function build(theme, mode, anchor) {
  const set = SETS[theme] || SETS.red;
  const vw = innerWidth, vh = innerHeight;
  const base = Math.max(210, Math.min(Math.max(vw, vh) * 0.4, 360));
  const backing = h('div', { class: 'backing ' + set.backing });
  root.append(backing);
  const items = [];

  const add = (src, size, x, y, extra = {}) => {
    const img = h('img', { src, alt: '', draggable: 'false' });
    img.style.width = size + 'px';
    root.append(img);
    const a = anchor || { x: vw * 0.5, y: vh * 0.5 };
    // t = urutan sapuan 0..1 (0 = mulai duluan)
    let t;
    if (mode === 'diag') t = ((vw - x) / vw + y / vh) / 2; // dari kanan-atas menuju kiri-bawah
    else t = Math.hypot(x - a.x, y - a.y) / Math.hypot(Math.max(a.x, vw - a.x), Math.max(a.y, vh - a.y));
    items.push({ img, size, x, y, t: Math.min(1, Math.max(0, t)), rot: rand(-40, 40), ...extra });
  };

  // lapis bunga besar (grid berjitter menutup seluruh layar)
  const step = base * 0.56;
  for (let gy = -step * 0.3; gy < vh + step; gy += step) {
    for (let gx = -step * 0.3; gx < vw + step; gx += step) {
      const s = base * rand(0.9, 1.25);
      add(pick(set.blooms), s, gx + rand(-step * .3, step * .3), gy + rand(-step * .3, step * .3));
    }
  }
  // kelopak bertebaran
  const nPetal = Math.round((vw * vh) / 24000);
  for (let i = 0; i < nPetal; i++) add(pick(set.petals), base * rand(0.2, 0.36), rand(0, vw), rand(0, vh), { fly: true });
  // bunga aksen besar
  for (let i = 0; i < 5; i++) add(pick(set.blooms), base * rand(1.2, 1.6), rand(0, vw), rand(0, vh));

  items.forEach((it) => (it.img.style.zIndex = Math.round(it.t * 10 + (it.fly ? 20 : 0) + rand(0, 6))));
  return { items, backing, vw, vh, anchor: anchor || { x: vw / 2, y: vh / 2 } };
}

const place = (it) => `translate(${it.x - it.size / 2}px, ${it.y - it.size / 2}px)`;

/** Bunga menutupi layar. mode: 'diag' (kanan-atas -> bawah) atau 'burst' (menyembur dari anchor). */
export async function sweepIn({ theme = 'red', mode = 'diag', anchor = null } = {}) {
  if (live) await sweepOut({ quick: true });
  const L = (live = build(theme, mode, anchor));
  root.classList.add('on');
  const { items, vw, vh } = L;
  const dur = 1000, spread = mode === 'diag' ? 1250 : 900;
  const anims = items.map((it) => {
    let from;
    if (mode === 'diag') {
      from = `translate(${it.x - it.size / 2 + vw * 0.7}px, ${it.y - it.size / 2 - vh * 0.75}px) rotate(${it.rot - 110}deg) scale(.35)`;
    } else {
      from = `translate(${L.anchor.x - it.size / 2}px, ${L.anchor.y - it.size / 2}px) rotate(${it.rot - 160}deg) scale(.05)`;
    }
    it.img.style.opacity = 0;
    return it.img.animate(
      [{ transform: from, opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: `${place(it)} rotate(${it.rot}deg) scale(1)`, opacity: 1 }],
      { duration: dur + rand(0, 250), delay: it.t * spread + rand(0, 160), easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'forwards' }).finished;
  });
  L.backing.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: spread * 0.5, fill: 'forwards' });
  await Promise.all(anims);
  await new Promise((r) => setTimeout(r, 260));
}

/** Bunga menyapu keluar ke bawah, membuka layar baru di belakangnya. */
export async function sweepOut({ quick = false } = {}) {
  const L = live; if (!L) return;
  const { items, vw, vh } = L;
  const spread = quick ? 200 : 1000;
  const anims = items.map((it) => it.img.animate(
    [{ transform: `${place(it)} rotate(${it.rot}deg) scale(1)`, opacity: 1 },
     { transform: `translate(${it.x - it.size / 2 - vw * 0.35}px, ${it.y - it.size / 2 + vh * 1.05}px) rotate(${it.rot + 70}deg) scale(1.05)`, opacity: 1, offset: .85 },
     { transform: `translate(${it.x - it.size / 2 - vw * 0.4}px, ${it.y - it.size / 2 + vh * 1.2}px) rotate(${it.rot + 80}deg) scale(1)`, opacity: 0 }],
    { duration: quick ? 200 : 1100, delay: it.t * spread, easing: 'cubic-bezier(.5,0,.8,.5)', fill: 'forwards' }).finished);
  L.backing.animate([{ opacity: 1 }, { opacity: 0 }], { duration: quick ? 150 : 600, delay: quick ? 0 : spread * 0.45, fill: 'forwards' });
  await Promise.all(anims);
  root.replaceChildren();
  root.classList.remove('on');
  live = null;
}
