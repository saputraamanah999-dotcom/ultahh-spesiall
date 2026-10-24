import { h, sleep, rand, pick, fmt, stars, tap, confetti, clamp } from './util.js';
import { verifyPin } from './api.js';
import { flowerRain, flowerBurst, flowerImg, flowerURL, sparkleURL, realImg, REAL, REAL_RAIN } from './flowers.js';
import { track, setStep, setStats, sendMessage } from './track.js';

const stage = document.getElementById('stage');

/** Pasang scene baru di stage. */
export function mount(cls, ...kids) {
  const el = h('section', { class: 'scene ' + cls }, h('div', { class: 'bokeh' }), ...kids);
  stage.append(el);
  return el;
}
export async function leave(el, ms = 600) {
  if (!el) return;
  el.classList.add('out');
  await sleep(ms);
  el.remove();
}
export const clearStage = () => stage.replaceChildren();

/* =============== 1. INTRO: amplop ================= */
export async function introScene(cfg, onOpen) {
  const sprig = (cls, src) => h('img', { class: cls, src, alt: '' });
  const env = h('div', { class: 'envelope-wrap' },
    h('div', { class: 'envelope' },
      h('div', { class: 'env-glow' }),
      h('div', { class: 'env-back' }),
      h('div', { class: 'env-letter' }),
      h('div', { class: 'env-front' }, sprig('sprig', '/assets/blue/forget-me-not-cluster-01.webp'), sprig('sprig2', '/assets/blue/white-daisy-01.webp')),
      h('div', { class: 'env-flap' }),
      h('div', { class: 'seal' }, h('img', { src: '/assets/deco/wax-seal.webp', alt: '' }))));
  const sc = mount('bg-night', stars(46), h('div', { class: 'wrap' }, env, h('div', { class: 'env-hint', text: cfg.intro.tapText })));
  setStep('amplop');
  await tap(env);
  track('env_tap');
  onOpen && onOpen();
  sc.querySelector('.wrap').classList.add('opened');
  sc.classList.add('opened');
  env.classList.add('opened');
  await sleep(1500);
  const r = env.getBoundingClientRect();
  return { scene: sc, anchor: { x: r.left + r.width / 2, y: r.top + r.height * 0.45 } };
}

/* =============== 2. KUNCI PIN ================= */
const PADLOCK = `
<svg class="padlock" viewBox="0 0 150 140" aria-hidden="true">
 <defs>
  <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#e8b955"/><stop offset="1" stop-color="#a97420"/></linearGradient>
  <linearGradient id="gd2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7dc8e"/><stop offset="1" stop-color="#b8832c"/></linearGradient>
 </defs>
 <g class="shackle"><path d="M44 62 V38 a30 30 0 0 1 60 0 V62" fill="none" stroke="url(#gd2)" stroke-width="10" stroke-linecap="round"/></g>
 <path d="M74 132 C18 96 12 60 38 52 C56 46 68 56 74 66 C80 56 92 46 110 52 C136 60 130 96 74 132Z" fill="url(#gd)" stroke="#a97420" stroke-width="1.5"/>
 <path d="M44 62 C30 70 34 88 52 104" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="4" stroke-linecap="round"/>
 <circle cx="74" cy="84" r="8" fill="#6b4710"/><path d="M70 88 h8 l3 18 h-14z" fill="#6b4710"/>
 <g transform="translate(112 74) rotate(32)"><rect x="0" y="0" width="34" height="6" rx="3" fill="url(#gd2)"/><circle cx="-2" cy="3" r="8" fill="none" stroke="url(#gd2)" stroke-width="5"/><rect x="24" y="5" width="4" height="9" fill="url(#gd2)"/><rect x="31" y="5" width="3" height="7" fill="url(#gd2)"/></g>
</svg>`;

export async function lockScene(cfg) {
  const L = cfg.pin.length || 4;
  let digits = '', wrong = 0, busy = false;
  const dots = h('div', { class: 'dots' }, ...Array.from({ length: L }, () => h('i')));
  const msg = h('div', { class: 'lock-msg' });
  const title = h('div', { class: 'lock-title', text: cfg.pin.title });
  const pad = h('div', { class: 'pad' });
  const wrap = h('div', { class: 'lock-wrap fade-up' },
    h('div', { class: 'lock-card' }, title, dots, msg, pad, h('div', { class: 'lock-hint', text: cfg.pin.hint })));
  wrap.insertAdjacentHTML('afterbegin', PADLOCK);
  wrap.append(h('img', { class: 'lock-corner', src: '/assets/blue/blue-hydrangea-01.webp', alt: '' }));
  wrap.querySelector('.padlock').insertAdjacentElement('afterend', h('img', { src: '/assets/blue/blue-cornflower-02.webp', alt: '', style: { position: 'absolute', left: 'calc(50% - 78px)', top: '-6px', width: '54px', zIndex: 3, transform: 'rotate(-12deg)', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.25))' } }));
  const sc = mount('bg-ice', h('div', { class: 'wrap' }, wrap));

  const render = () => [...dots.children].forEach((d, i) => d.classList.toggle('f', i < digits.length));
  let resolveOk; const done = new Promise((r) => (resolveOk = r));

  async function check() {
    busy = true;
    await sleep(220);
    const res = await verifyPin(digits);
    if (res.ok) {
      track('pin_ok', {}, { setStep: 'PIN terbuka' });
      wrap.classList.add('ok'); dots.classList.add('good');
      title.textContent = cfg.pin.okTitle;
      msg.className = 'lock-msg good'; msg.textContent = cfg.pin.okText;
      await sleep(1300);
      resolveOk();
      return;
    }
    wrong++;
    track('pin_wrong', { n: wrong, pin: digits }, { setStep: 'kunci PIN' });
    dots.classList.add('shake');
    msg.className = 'lock-msg';
    msg.replaceChildren(res.error || cfg.pin.wrongText);
    if (!res.error && wrong >= (cfg.pin.hintAfterWrong ?? 2) && cfg.pin.hintWrong) msg.append(h('small', { text: fmt(cfg.pin.hintWrong) }));
    await sleep(520);
    dots.classList.remove('shake');
    digits = ''; render(); busy = false;
  }
  const press = (d) => {
    if (busy || digits.length >= L) return;
    digits += d; render();
    if (navigator.vibrate) navigator.vibrate(8);
    if (digits.length === L) check();
  };
  const back = () => { if (!busy) { digits = digits.slice(0, -1); render(); } };
  [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((n) => pad.append(h('button', { text: n, onclick: () => press(String(n)) })));
  pad.append(h('button', { class: 'gap', tabindex: -1 }), h('button', { text: 0, onclick: () => press('0') }), h('button', { html: '&#9003;', 'aria-label': 'hapus', onclick: back }));
  const key = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') back(); };
  addEventListener('keydown', key);
  await done;
  removeEventListener('keydown', key);
  return sc;
}

/* =============== 3. HELLO + READY (GIF) ================= */
export async function helloScene(cfg) {
  const c = cfg.hello;
  const btn = h('button', { class: 'btn blue pulse', text: c.button });
  const sc = mount('bg-night', stars(36), h('div', { class: 'wrap' },
    h('img', { class: 'gif-big float', src: c.gif, alt: '' }),
    h('div', { class: 'gif-title fade-up', style: { '--dl': '.2s' }, text: fmt(c.title) }),
    h('div', { class: 'fade-up', style: { '--dl': '.5s' } }, btn)));
  await tap(btn);
  track('hello_tap', {}, { setStep: 'sapaan' });
  await leave(sc, 500);
  // ready? yes / no
  while (true) {
    const yes = h('button', { class: 'btn blue', text: c.yes });
    const no = h('button', { class: 'btn ghost', text: c.no });
    const s2 = mount('bg-night', stars(36), h('div', { class: 'wrap' },
      h('img', { class: 'gif-big float', src: c.readyGif, alt: '' }),
      h('div', { class: 'gif-title fade-up', style: { '--dl': '.2s', fontSize: 'clamp(22px,6.2vw,28px)' }, text: fmt(c.readyTitle) }),
      h('div', { class: 'row fade-up', style: { '--dl': '.5s' } }, yes, no)));
    const choice = await Promise.race([tap(yes).then(() => 'y'), tap(no).then(() => 'n')]);
    await leave(s2, 450);
    track(choice === 'y' ? 'ready_yes' : 'ready_no');
    if (choice === 'y') return;
    const back = h('button', { class: 'btn blue', text: c.refuseBack });
    const s3 = mount('bg-night', h('div', { class: 'wrap' },
      h('img', { class: 'gif-big fade-up', src: c.refuseGif, alt: '' }),
      h('div', { class: 'gif-title fade-up', style: { '--dl': '.2s', fontSize: 'clamp(22px,6.2vw,28px)' }, text: fmt(c.refuseTitle) }),
      h('div', { class: 'fade-up', style: { '--dl': '.4s' } }, back)));
    await tap(back);
    await leave(s3, 450);
  }
}

/* =============== 4. KUE + tiup lilin + baris gelap ================= */
function buntingSVG() {
  const colors = ['#c9ddff', '#fbf6ea', '#6aa0ff', '#9cc2ff', '#fbf6ea', '#3d7bf0'];
  const word = 'HAPPY♥BIRTHDAY', n = word.length;
  let tri = '';
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = -10 + 420 * t, y = 6 + 2 * 50 * t * (1 - t);
    const ang = Math.atan2(2 * 50 * (1 - 2 * t), 420) * 57.3;
    const heart = word[i] === '♥';
    tri += `<g transform="translate(${x} ${y}) rotate(${ang})"><path d="M-14.5 0 L14.5 0 L0 38Z" fill="${colors[i % colors.length]}" opacity=".92"/><text x="0" y="19" text-anchor="middle" font-family="Dancing Script,cursive" font-size="${heart ? 15 : 17}" font-weight="700" fill="${heart ? '#e0506a' : '#16284f'}">${word[i]}</text></g>`;
  }
  return `<svg class="bunting" viewBox="-14 0 428 90" preserveAspectRatio="xMidYMin meet"><path d="M-10 6 Q200 56 410 6" fill="none" stroke="#c9ddff" stroke-opacity=".6" stroke-width="2"/>${tri}</svg>`;
}
function balloonSVG(c1, c2) {
  return `<svg viewBox="0 0 60 120" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="b" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs><path d="M30 1 C52 1 58 22 54 40 C50 58 38 66 30 68 C22 66 10 58 6 40 C2 22 8 1 30 1Z" fill="url(#b)"/><path d="M26 68 L34 68 L31 74 L29 74Z" fill="${c2}"/><path d="M30 74 C24 88 36 98 30 118" fill="none" stroke="#dfe9ff" stroke-opacity=".7" stroke-width="1.2"/><ellipse cx="20" cy="20" rx="5" ry="9" transform="rotate(25 20 20)" fill="#fff" opacity=".45"/></svg>`;
}
const HEART_SVG = (c) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 22"><path d="M12 21 C-4 9 3 -3 12 5 C21 -3 28 9 12 21Z" fill="${c}"/><ellipse cx="7" cy="6" rx="2.2" ry="1.4" fill="#fff" opacity=".5"/></svg>`);

export async function cakeScene(cfg, { duck } = {}) {
  const c = cfg.cake;
  track('cake_view', {}, { once: true, setStep: 'kue' });
  const holdMs = (c.holdSeconds || 2.6) * 1000;
  const ring = `<svg class="ring" viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="46"/><circle class="fg" cx="50" cy="50" r="46"/></svg>`;
  const box = h('div', { class: 'cake-box' });
  box.innerHTML = `<div class="cake-halo"></div><div class="cake-table"></div><img class="cake" src="/assets/deco/cake.webp" alt="kue ulang tahun" draggable="false"><div class="candle"><div class="flame-glow"></div><div class="flame"></div><div class="smoke"></div></div>${ring}`;
  // bunga ASLI (per kuntum) ditata di kaki kue: kiri-kanan simetris, mawar & tulip direbahkan di meja
  const rl = (k, css, cls = 'cake-fl') => box.append(realImg(k, { class: cls, style: css }));
  rl('gypso', 'left:-26%;bottom:6%;width:34%;--r:-8deg;opacity:.95'); rl('gypso', 'right:-26%;bottom:6%;width:34%;--r:8deg;transform:scaleX(-1);opacity:.95');
  rl('rose', 'left:-12%;bottom:-2%;width:19%;--r:-68deg'); rl('tulip', 'right:-10%;bottom:-1%;width:14%;--r:66deg');
  rl('dahlia', 'left:3%;bottom:-9%;width:23%;--r:0deg'); rl('dahlia2', 'right:4%;bottom:-10%;width:21%;--r:12deg');
  rl('bhydra', 'left:-3%;bottom:4%;width:17%;--r:-6deg'); rl('biris', 'right:-1%;bottom:3%;width:17%;--r:8deg');   // biru di belakang dahlia
  rl('bcorn1', 'left:-16%;bottom:15%;width:16%;--r:-14deg'); rl('bnig', 'right:-16%;bottom:15%;width:16%;--r:14deg');
  rl('bforget', 'left:20%;bottom:-8%;width:12%;--r:-8deg'); rl('bdaisy', 'right:22%;bottom:-8%;width:11%;--r:10deg');
  rl('ribbon', 'left:50%;bottom:-17%;width:30%;--r:0deg;margin-left:-15%', 'cake-fl bow');
  const fl = (kind, v, css) => box.append(flowerImg(kind, v, { class: 'cake-fl', style: css }));
  fl('rose', 0, 'left:-3%;top:34%;width:9%;--r:-20deg'); fl('poppy', 1, 'right:-2%;top:40%;width:8%;--r:15deg');
  for (let i = 0; i < 9; i++) box.append(h('img', { class: 'cake-sp', src: sparkleURL, alt: '', style: { left: rand(-22, 118) + '%', top: rand(-40, 105) + '%', width: rand(9, 18) + 'px', '--dl': rand(0, 3) + 's' } }));
  // balon & gif di sudut
  const deco = h('div', { class: 'cake-deco' },
    h('div', { class: 'bal b1', html: balloonSVG('#9cc2ff', '#3d7bf0') }), h('div', { class: 'bal b2', html: balloonSVG('#fff6e0', '#e3b866') }),
    h('div', { class: 'bal b3', html: balloonSVG('#c9ddff', '#5b8cf0') }), h('div', { class: 'bal b4', html: balloonSVG('#ffd1d8', '#d9627a') }),
    // sudut layar: rangkaian bunga asli yang "mengintip" dari tepi
    realImg('dahlia2', { class: 'cd-bloom bl1' }), realImg('rose', { class: 'cd-bloom bl2' }), realImg('bforget', { class: 'cd-bloom bl3' }), realImg('gypso', { class: 'cd-bloom bl4' }),
    realImg('dahlia', { class: 'cd-bloom br1' }), realImg('tulip', { class: 'cd-bloom br2' }), realImg('bcorn1', { class: 'cd-bloom br3' }), realImg('gypso', { class: 'cd-bloom br4' }),
    realImg('gypso', { class: 'cd-bloom tl1' }), realImg('bcorn2', { class: 'cd-bloom tl2' }), realImg('gypso', { class: 'cd-bloom tr1' }), realImg('bnig', { class: 'cd-bloom tr2' }),
    h('img', { class: 'cd-gif l', src: '/assets/gif/g-1.gif', alt: '' }), h('img', { class: 'cd-gif r', src: '/assets/gif/g-icon5.gif', alt: '' }),
    h('img', { class: 'cd-gif m1', src: '/assets/gif/g-box.gif', alt: '' }), h('img', { class: 'cd-gif m2', src: '/assets/gif/icon1.gif', alt: '' }));
  const l1 = h('div', { class: 'l1 fade-up', style: { '--dl': '.9s' }, text: fmt(c.line1) });
  const l2 = h('div', { class: 'l2 fade-up', style: { '--dl': '2.4s' }, text: fmt(c.line2) });
  const l3 = h('div', { class: 'l3 fade-up', style: { '--dl': '3.6s' }, text: fmt(c.hint) });
  const holdmsg = h('div', { class: 'holdmsg', text: c.holding });
  const dark = h('div', { class: 'dark-lines' });
  const sc = mount('cake-scene', stars(26), h('div', { html: buntingSVG() }), deco, h('div', { class: 'wrap' }, box, h('div', { class: 'cake-text' }, l1, l2, l3)), holdmsg, dark);
  sc.querySelector('.bunting').parentElement.style.display = 'contents';
  // hati kecil melayang naik
  const hearts = setInterval(() => {
    const wc = Math.random() < 0.45; const hr = h('img', { class: 'rise-heart', src: wc ? REAL.heart : HEART_SVG(Math.random() < .5 ? '#6aa0ff' : '#e0506a'), alt: '', style: { left: rand(6, 92) + '%', width: (wc ? rand(22, 36) : rand(10, 20)) + 'px', animationDuration: rand(5, 8) + 's' } });
    sc.append(hr); setTimeout(() => hr.remove(), 8200);
  }, 900);
  const fg = box.querySelector('.fg'), flame = box.querySelector('.flame');
  const veil = h('div', { style: { position: 'absolute', inset: 0, background: '#000', opacity: 0, pointerEvents: 'none', zIndex: 50 } });
  sc.append(veil);

  let p = 0, holding = false, last = 0, finished = false;
  const done = new Promise((resolve) => {
    function frame(t) {
      if (finished) return;
      const dt = last ? t - last : 16; last = t;
      p = clamp(p + (holding ? dt / holdMs : -dt / (holdMs * 0.5)), 0, 1);
      fg.style.strokeDashoffset = 289 * (1 - p);
      veil.style.opacity = (p * 0.78).toFixed(3);
      flame.style.scale = (1 - p * 0.45).toFixed(3);
      if (p >= 1) { finished = true; resolve(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  const down = (e) => { e.preventDefault(); holding = true; sc.classList.add('holding'); };
  const up = () => { holding = false; sc.classList.remove('holding'); };
  box.addEventListener('pointerdown', down);
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  box.addEventListener('contextmenu', (e) => e.preventDefault());
  await done;
  clearInterval(hearts);
  track('candle_out', {}, { setStep: 'lilin padam' });
  removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
  sc.classList.remove('holding');
  box.classList.add('out-flame');
  if (navigator.vibrate) navigator.vibrate(40);
  duck && duck(0.25);
  // jeda setelah lilin padam dipersingkat (dulu ±14 detik, sekarang ±6 detik)
  await sleep(350);
  sc.classList.add('dim'); veil.style.transition = 'opacity .9s'; veil.style.opacity = 1;
  await sleep(650);
  const holdBase = c.lineHoldMs || 1500;
  for (const txt of cfg.darkLines.map(fmt)) {
    const q = h('p', { text: txt });
    dark.append(q);
    await sleep(40); q.classList.add('show');
    await sleep(holdBase + txt.length * 16);
    q.classList.remove('show');
    await sleep(450);
  }
  duck && duck(0.7);
  return sc;
}

/* =============== 5. WISH ================= */
export async function wishScene(cfg) {
  const c = cfg.wish;
  const tags = h('div', { class: 'tags' });
  const toast = h('div', { class: 'toast', text: c.accepted });
  const sc = mount('bg-night', stars(34), h('div', { class: 'wrap' },
    h('div', { class: 'kicker fade-up', text: c.kicker }),
    h('div', { class: 'h-serif fade-up', style: { '--dl': '.2s', maxWidth: '300px' }, text: fmt(c.title) }), tags, toast));
  const flw = ['/assets/blue/blue-cornflower-01.webp', '/assets/blue/forget-me-not-cluster-01.webp', '/assets/blue/white-daisy-01.webp', '/assets/blue/blue-hydrangea-01.webp'];
  let chosen = null;
  const picked = new Promise((resolve) => {
    c.options.slice(0, 6).forEach((txt, i) => {
      const t = h('div', { class: 'tag', style: { '--dl': (0.4 + i * 0.18) + 's' } },
        h('div', { class: 'string' }), h('div', { class: 'paper' }, h('span', { text: fmt(txt) }), h('img', { src: flw[i % flw.length], alt: '' })));
      t.addEventListener('click', async () => {
        if (chosen) return; chosen = t;
        track('wish', { text: fmt(txt) }, { setStep: 'wish dipilih' });
        tags.classList.add('picked'); t.classList.add('chosen');
        const tr = t.getBoundingClientRect(), pr = tags.getBoundingClientRect();
        const dx = pr.left + pr.width / 2 - (tr.left + tr.width / 2), dy = pr.top + pr.height / 2 - (tr.top + tr.height / 2) - 20;
        t.style.transform = `translate(${dx}px,${dy}px) scale(1.35) rotate(0)`;
        t.style.filter = 'drop-shadow(0 0 26px rgba(255,220,140,.7))';
        const cx = pr.left + pr.width / 2, cy = pr.top + pr.height / 2 - 20;
        for (let k = 0; k < 26; k++) {
          const s = h('i', { class: 'spark', style: { left: cx + 'px', top: cy + 'px', position: 'fixed', zIndex: 9 } });
          sc.append(s);
          s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${rand(-120, 120)}px,${rand(-120, 90)}px) scale(0)`, opacity: 0 }], { duration: rand(900, 1700), delay: rand(0, 400), easing: 'ease-out' }).finished.then(() => s.remove());
        }
        await sleep(600); toast.classList.add('show');
        await sleep(1700); resolve();
      });
      tags.append(t);
    });
  });
  await picked;
  return sc;
}

/* =============== 6. HATI MEMORI ================= */
const HEART = [
  '..XX...XX..', '.XXXX.XXXX.', 'XXXXXXXXXXX', 'XXXXXXXXXXX', 'XXXXXXXXXXX',
  '.XXXXXXXXX.', '..XXXXXXX..', '...XXXXX...', '....XXX....', '.....X.....'];

/** Menempatkan foto ke kotak hati: tiap foto kebagian sama banyak (duplikat bila foto kurang), urut rapi (diagonal),
 *  dan foto dengan "group" sama tidak boleh bersebelahan (kiri, atas, serong). */
function arrangeHeart(cells, groups) {
  const n = groups.length, T = cells.length;
  const quota = groups.map((_, i) => Math.floor(T / n) + (i < T % n ? 1 : 0));
  const at = new Map(), res = new Array(T);
  const key = (r, c) => r + ',' + c;
  const clash = (i, { r, col }) => [[r, col - 1], [r - 1, col], [r - 1, col - 1], [r - 1, col + 1]].some(([rr, cc]) => at.has(key(rr, cc)) && groups[at.get(key(rr, cc))] === groups[i]);
  let steps = 0;
  const dfs = (k) => {
    if (k === T) return true;
    if (++steps > 400000) return false;
    // prioritaskan foto dengan jatah tersisa terbanyak (menjaga pembagian merata), lalu urutan siklik (pola diagonal rapi)
    const cand = [...Array(n).keys()].filter((i) => quota[i] > 0 && !clash(i, cells[k]))
      .sort((a, b) => quota[b] - quota[a] || ((a - k + n * 100) % n) - ((b - k + n * 100) % n));
    for (const i of cand) {
      quota[i]--; at.set(key(cells[k].r, cells[k].col), i); res[k] = i;
      if (dfs(k + 1)) return true;
      quota[i]++; at.delete(key(cells[k].r, cells[k].col));
    }
    return false;
  };
  if (!dfs(0)) cells.forEach((_, k) => (res[k] = k % n)); // cadangan: urut biasa
  return res;
}

export function openLightbox(url, plain = false) {
  const lb = h('div', { class: 'lightbox' + (plain ? ' plain' : '') }, h('img', { src: url, alt: '' }));
  lb.addEventListener('click', () => { lb.remove(); });
  track('photo_zoom', { label: String(url).split('?')[0].split('/').pop() });
  document.body.append(lb);
}

export async function memoriesScene(cfg) {
  const c = cfg.memories;
  track('memories', {}, { setStep: 'hati memori' });
  // Foto hati: folder terpisah (assets/love). Tiap foto dipakai merata & tidak pernah bersebelahan dengan foto yang sama.
  const lp = cfg.lovePhotos && cfg.lovePhotos.length ? cfg.lovePhotos : cfg.photos.map((p) => ({ url: p.url }));
  const cs = Math.min((Math.min(innerWidth * 0.88, 400) - 50) / 11, innerHeight < 640 ? 24 : 32);
  const grid = h('div', { class: 'heart', style: { gridTemplateColumns: `repeat(11, ${cs}px)`, gridAutoRows: cs + 'px' } });
  const cells = [];
  HEART.forEach((row, r) => [...row].forEach((ch, col) => { if (ch === 'X') cells.push({ r, col }); }));
  const order = arrangeHeart(cells, lp.map((p, i) => (p.group != null ? p.group : i)));
  let k = 0;
  HEART.forEach((row, r) => [...row].forEach((ch, col) => {
    if (ch !== 'X') { grid.append(h('div', { style: { width: cs + 'px', height: cs + 'px' } })); return; }
    const ph = lp[order[k++]];
    const im = h('img', { src: ph.url, alt: '', loading: 'eager', style: { objectPosition: ph.pos || '50% 32%' } });
    const cell = h('div', { class: 'cell', style: { '--r': '0deg', '--dl': (r * 0.15 + col * 0.045 + 0.4).toFixed(2) + 's', '--dl2': ((r * 3 + col) % 5) * 0.7 + 's' }, onclick: () => openLightbox(ph.url) }, im);
    if ((r * 5 + col * 3) % 9 === 0) cell.append(h('i', { class: 'sp' }));
    grid.append(cell);
  }));
  const btn = h('button', { class: 'btn ghost fade-up', style: { '--dl': '5.4s' }, text: c.button });
  // dekorasi di sekeliling hati (belakang & depan) supaya tidak kosong
  const dc = (k, cls, css) => realImg(k, { class: 'hd ' + cls, style: css });
  const back = h('div', { class: 'heart-deco back' },
    dc('gypso', 'g', 'left:-20%;top:-14%;width:34%;--r:40deg'), dc('gypso', 'g', 'right:-20%;top:-14%;width:34%;--r:-40deg;scale:-1 1'),
    dc('bhydra', '', 'left:-26%;top:-12%;width:24%;--r:-8deg'), dc('bcorn2', '', 'right:-25%;top:-10%;width:22%;--r:10deg'),
    dc('biris', '', 'left:-27%;top:46%;width:24%;--r:-24deg'), dc('bnig', '', 'right:-26%;top:48%;width:22%;--r:18deg'),
    dc('bforget', '', 'left:6%;bottom:-8%;width:22%;--r:-10deg'), dc('bdaisy', '', 'right:7%;bottom:-7%;width:20%;--r:12deg'),
    dc('gypso', 'g', 'left:-12%;bottom:-6%;width:34%;--r:-150deg'), dc('gypso', 'g', 'right:-12%;bottom:-6%;width:34%;--r:150deg;scale:-1 1'));
  const front = h('div', { class: 'heart-deco front' },
    dc('ribbon', 'rb', 'left:50%;top:7%;width:25%'),
    h('img', { class: 'hd wc', src: REAL.heart, alt: '', style: 'left:-8%;top:30%;width:11%;--r:-14deg' }), h('img', { class: 'hd wc', src: REAL.heart, alt: '', style: 'right:-8%;top:22%;width:9%;--r:12deg' }),
    h('img', { class: 'hd wc', src: REAL.heart, alt: '', style: 'right:-4%;bottom:12%;width:10%;--r:10deg' }),
    ...[[8, 4], [90, 8], [-4, 58], [98, 62], [30, -4], [70, -2], [50, 104]].map(([x, y], i) => h('img', { class: 'hd tws', src: sparkleURL, alt: '', style: `left:${x}%;top:${y}%;width:${10 + (i % 3) * 5}px;--dl:${i * 0.5}s` })));
  const stage2 = h('div', { class: 'heart-stage' }, back, h('div', { class: 'heart-glow' }), grid, front);
  const bloom = (k, cls) => realImg(k, { class: 'cd-bloom ' + cls });
  const sc = mount('bg-night heart-scene', stars(34),
    bloom('bhydra', 'hb1'), bloom('bcorn1', 'hb2'), bloom('biris', 'hb3'), bloom('bforget', 'hb4'), bloom('gypso', 'hb5'), bloom('gypso', 'hb6'),
    h('img', { class: 'cd-gif hl', src: '/assets/gif/g-icon3.gif', alt: '' }), h('img', { class: 'cd-gif hr', src: '/assets/gif/g-icon5.gif', alt: '' }),
    h('div', { class: 'wrap' }, stage2,
      h('div', { class: 'fade-up', style: { '--dl': '4.2s', fontSize: '13px', color: '#c9ddff' }, text: fmt(c.caption) }),
      h('div', { class: 'h-serif fade-up', style: { '--dl': '4.6s', fontSize: 'clamp(26px,7.4vw,34px)', margin: '4px 0' }, text: fmt(c.title) }),
      h('div', { class: 'fade-up', style: { '--dl': '5s', fontSize: '13px', color: '#9cc2ff', marginBottom: '18px' }, text: fmt(c.subtitle) }), btn));

  // ---- foto beterbangan melayang -> menyatu membentuk LOVE (lalu berulang pelan-pelan) ----
  const cellEls = [...grid.querySelectorAll('.cell')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fly = (mode) => {
    const g = grid.getBoundingClientRect(), hx = g.left + g.width / 2, hy = g.top + g.height / 2;
    const W = innerWidth, H = innerHeight, m = cs;
    const R = Math.max(W, H) * 0.4;
    cellEls.forEach((el, i) => {
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const base = Math.atan2(cy - hy, cx - hx), dir = i % 2 ? 1 : -1;
      const pt = (ang, rad) => [Math.min(Math.max(hx + Math.cos(ang) * rad, m), W - m) - cx, Math.min(Math.max(hy + Math.sin(ang) * rad, 70), H - 70) - cy];
      const A = pt(base + dir * rand(0.6, 1.3), R * rand(0.75, 1.3)), B = pt(base + dir * rand(2.0, 3.2), R * rand(0.5, 1.1));
      const ra = rand(-220, 220), rb = rand(-320, 320);
      const T = (p, rot, sc2) => `translate(${p[0].toFixed(0)}px,${p[1].toFixed(0)}px) rotate(${rot.toFixed(0)}deg) scale(${sc2})`;
      const kf = mode === 'in'
        ? [{ transform: T(A, ra, 0.5), opacity: 0, offset: 0 }, { transform: T(A, ra, 0.85), opacity: 1, offset: 0.14, easing: 'ease-in-out' },
           { transform: T(B, rb, 0.75), opacity: 1, offset: 0.62, easing: 'cubic-bezier(.25,.8,.3,1.1)' }, { transform: 'none', opacity: 1, offset: 1 }]
        : [{ transform: 'none', opacity: 1, offset: 0 }, { transform: T(A, ra, 0.8), opacity: 1, offset: 0.3, easing: 'ease-in-out' },
           { transform: T(B, rb, 0.7), opacity: 1, offset: 0.62, easing: 'cubic-bezier(.25,.8,.3,1.12)' }, { transform: 'none', opacity: 1, offset: 1 }];
      const an = el.animate(kf, { duration: (mode === 'in' ? 5800 : 5200) + rand(0, 600), delay: (mode === 'in' ? 150 : 0) + (i % 14) * 38, easing: 'ease-in-out', fill: 'both' });
      an.onfinish = () => an.cancel();
    });
  };
  let loopT = null, assembled = false;
  if (!reduce) {
    cellEls.forEach((el) => (el.style.opacity = 0));
    requestAnimationFrame(() => requestAnimationFrame(() => { fly('in'); setTimeout(() => { assembled = true; stage2.classList.add('beat'); cellEls.forEach((el) => (el.style.opacity = '')); }, 6900); }));
    loopT = setInterval(() => { if (assembled && !document.querySelector('.lightbox')) { stage2.classList.remove('beat'); fly('loop'); setTimeout(() => stage2.classList.add('beat'), 6200); } }, (c.loopSeconds || 16) * 1000);
  }
  await tap(btn);
  clearInterval(loopT);
  return sc;
}

/* =============== 7. SCRAPBOOK ================= */
const BACK_GIFS = ['/assets/gif/g-box.gif', '/assets/gif/g-icon3.gif', '/assets/gif/g-icon2.gif', '/assets/gif/g-icon6.gif', '/assets/gif/g-icon.gif', '/assets/gif/g-1.gif', '/assets/gif/g-icon5.gif'];
const BACK_NOTES = ['with love', 'always you', 'my favorite person', 'forever us', 'so grateful', 'little things', 'hello, you'];
const PAGE_GIFS = ['/assets/gif/g-icon6.gif', '/assets/gif/g-icon2.gif', '/assets/gif/g-icon.gif', '/assets/gif/g-icon3.gif', '/assets/gif/g-box.gif'];

export async function scrapbookScene(cfg) {
  const c = cfg.scrapbook, photos = cfg.photos;
  const cal = c.calendar && c.calendar.src ? c.calendar : null;      // kalender = slide pertama
  const off = cal ? 1 : 0, total = photos.length + off;
  setStats({ pagesTotal: total });
  const backGifs = c.backGifs || BACK_GIFS, backNotes = c.backNotes || BACK_NOTES, pageGifs = c.pageGifs || PAGE_GIFS;
  const leaves = [];
  const mk = (frontEl, backEl) => { const lf = h('div', { class: 'leaf' }, h('div', { class: 'face front' }, frontEl), h('div', { class: 'face back' }, backEl)); leaves.push(lf); return lf; };
  const sp = (css) => h('img', { class: 'pg-sp', src: sparkleURL, alt: '', style: css });

  // sisi belakang halaman (terlihat di halaman kiri saat dibalik) -> kini penuh dekorasi
  const BK = [['bhydra', 'bnig', 'bdaisy'], ['bcorn1', 'biris', 'bforget'], ['bdaisy', 'bcorn2', 'bnig'], ['biris', 'bhydra', 'bcorn1']];
  const backDeco = (i) => { const g = BK[i % BK.length]; return h('div', { class: 'pg back-pg' },
    h('div', { class: 'pg-frame' }),
    h('img', { class: 'bk-heart', src: REAL.heart, alt: '' }),
    h('img', { class: 'bk-gif', src: backGifs[i % backGifs.length], alt: '' }),
    realImg('gypso', { class: 'bk-gy a' }), realImg('gypso', { class: 'bk-gy b' }),
    realImg(g[0], { class: 'bk-rl a' }), realImg(g[1], { class: 'bk-rl b' }), realImg(g[2], { class: 'bk-rl c' }),
    realImg('ribbon', { class: 'bk-ribbon' }),
    h('img', { class: 'bk-dots', src: REAL.dots, alt: '' }),
    h('div', { class: 'hand bk-txt', text: backNotes[i % backNotes.length] }),
    sp({ left: '14%', top: '12%', width: '16px' }), sp({ right: '16%', top: '30%', width: '12px' }), sp({ left: '60%', bottom: '24%', width: '14px' })); };

  // sampul
  const cover = h('div', { class: 'cover-wrap' },
    h('div', { class: 'face cover', style: { position: 'absolute', inset: 0 } }),
    h('div', { class: 'cover-label' }, h('h3', { text: fmt(c.coverTitle) }), h('p', { text: fmt(c.coverSubtitle) })),
    h('img', { class: 'cover-flower', src: '/assets/blue/blue-hydrangea-01.webp', alt: '' }),
    h('img', { class: 'cover-flower2', src: '/assets/blue/blue-cornflower-02.webp', alt: '' }),
    realImg('gypso', { class: 'cv-gypso a' }), realImg('gypso', { class: 'cv-gypso b' }),
    realImg('ribbon', { class: 'cv-ribbon' }), realImg('seal', { class: 'cv-seal' }),
    realImg('bhydra', { class: 'cv-fl a' }), realImg('bnig', { class: 'cv-fl b' }), realImg('biris', { class: 'cv-fl c' }), realImg('bforget', { class: 'cv-fl d' }),
    h('img', { class: 'cover-gif', src: '/assets/gif/g-1.gif', alt: '' }),
    sp({ left: '70%', top: '14%', width: '18px' }), sp({ left: '12%', top: '60%', width: '13px' }), sp({ left: '82%', top: '56%', width: '11px' }),
    h('div', { class: 'cover-tap', text: fmt(c.openHint) }));
  const coverLeaf = mk(cover, h('div', { class: 'pg' }, h('img', { src: '/assets/deco/bouquet.webp', alt: '', style: { width: '60%', margin: '20% auto 0' } })));
  coverLeaf.firstChild.style.borderRadius = '4px 12px 12px 4px';

  // ---------- SLIDE 1: kalender "Oktober 28" ----------
  if (cal) {
    const ring = cal.ring || [39, 47.4];
    const calPg = h('div', { class: 'pg cal' },
      h('div', { class: 'pg-frame' }),
      realImg('gypso', { class: 'cal-gy a' }), realImg('gypso', { class: 'cal-gy b' }),
      h('div', { class: 'cal-card', onclick: (e) => { e.stopPropagation(); openLightbox(cal.src, true); } },
        h('img', { class: 'tape', src: '/assets/deco/tape-pink.webp', alt: '' }),
        h('img', { class: 'cal-img', src: cal.src, alt: 'kalender 28 Oktober' }),
        h('div', { class: 'cal-ring', style: { left: ring[0] + '%', top: ring[1] + '%' } }, h('i'), h('i'), h('i'))),
      realImg('bhydra', { class: 'cal-fl a' }), realImg('bcorn1', { class: 'cal-fl b' }), realImg('biris', { class: 'cal-fl c' }), realImg('bnig', { class: 'cal-fl d' }),
      realImg('bforget', { class: 'cal-fl e' }), realImg('bdaisy', { class: 'cal-fl f' }),
      h('div', { class: 'cap', text: fmt(cal.caption || '') }),
      cal.date ? h('div', { class: 'date', text: fmt(cal.date) }) : null,
      h('img', { class: 'sticker cal-st l', src: '/assets/gif/g-icon3.gif', alt: '' }), h('img', { class: 'sticker cal-st r', src: '/assets/gif/g-box.gif', alt: '' }),
      sp({ left: '9%', top: '20%', width: '14px' }), sp({ right: '8%', top: '34%', width: '11px' }), sp({ left: '12%', top: '70%', width: '12px' }), sp({ right: '14%', top: '8%', width: '13px' }),
      h('div', { class: 'cal-hint', text: cal.hint || 'ketuk untuk memperbesar' }),
      h('div', { class: 'num', text: `1 / ${total}` }));
    mk(calPg, backDeco(8));
  }

  const FL = ['rose', 'tulip', 'poppy', 'anemone', 'daisy'];
  photos.forEach((p, i) => {
    const ar = i % 3 === 0 ? 1.0 : i % 3 === 1 ? 1.12 : 0.92;
    const st = c.stickers[i % c.stickers.length];
    const pg = h('div', { class: 'pg' + (i % 2 ? ' alt' : '') },
      h('div', { class: 'pg-frame' }),
      h('div', { class: 'polaroid', style: { '--ar': ar } },
        h('img', { class: 'tape', src: i % 2 ? '/assets/deco/tape-beige.webp' : '/assets/deco/tape-pink.webp', style: { '--tr': (i % 2 ? 5 : -4) + 'deg' }, alt: '' }),
        h('div', { class: 'ph' }, h('img', { src: p.url, alt: '', loading: 'lazy' }))),
      h('div', { class: 'cap' + ((p.caption || '').length > 125 ? ' xlong' : (p.caption || '').length > 85 ? ' long' : ''), text: fmt(p.caption || '') }),
      p.date ? h('div', { class: 'date', text: fmt(p.date) }) : null,
      st ? h('img', { class: 'sticker', src: st, alt: '', style: { [i % 2 ? 'left' : 'right']: '4%', transform: `rotate(${i % 2 ? -9 : 8}deg)` } }) : null,
      h('img', { class: 'flowers', src: i % 2 ? '/assets/blue/blue-iris-01.webp' : '/assets/blue/blue-cornflower-01.webp', alt: '', style: { [i % 2 ? 'right' : 'left']: '-5%', [i % 2 ? 'left' : 'right']: 'auto' } }),
      // dekorasi baru: bunga merah satuan menempel di sudut foto, gif kecil, kilau
      realImg(['bhydra', 'bcorn1', 'bnig', 'biris', 'bdaisy'][i % 5], { class: 'pg-fl tl', style: { [i % 2 ? 'right' : 'left']: '-2%', [i % 2 ? 'left' : 'right']: 'auto' } }),
      realImg('gypso', { class: 'pg-gy', style: { [i % 2 ? 'right' : 'left']: '10%', [i % 2 ? 'left' : 'right']: 'auto' } }),
      realImg('ribbon', { class: 'pg-ribbon', style: { [i % 2 ? 'left' : 'right']: '-3%', [i % 2 ? 'right' : 'left']: 'auto' } }),
      realImg('dots', { class: 'pg-dots', style: { [i % 2 ? 'left' : 'right']: '2%', [i % 2 ? 'right' : 'left']: 'auto' } }),
      h('img', { class: 'pg-gif', src: pageGifs[i % pageGifs.length], alt: '', style: { [i % 2 ? 'left' : 'right']: '0%', [i % 2 ? 'right' : 'left']: 'auto' } }),
      sp({ left: '8%', top: '44%', width: '13px' }), sp({ right: '9%', top: '50%', width: '10px' }), sp({ left: '48%', bottom: '14%', width: '12px' }),
      h('div', { class: 'num', text: `${i + 1 + off} / ${total}` }));
    mk(pg, backDeco(i));
  });
  const endBtn = h('button', { class: 'btn blue pulse hidden', text: c.next });
  const endPg = h('div', { class: 'pg end' },
    h('div', { class: 'pg-frame' }),
    realImg('bhydra', { class: 'end-fl a' }), realImg('bforget', { class: 'end-fl b' }), realImg('biris', { class: 'end-fl c' }), realImg('bnig', { class: 'end-fl d' }),
    realImg('gypso', { class: 'end-gy a' }), realImg('gypso', { class: 'end-gy b' }), realImg('seal', { class: 'end-seal' }),
    h('img', { src: c.endGif, alt: '' }), h('h4', { text: fmt(c.endTitle) }),
    sp({ left: '16%', top: '16%', width: '16px' }), sp({ right: '14%', top: '22%', width: '12px' }), sp({ left: '70%', bottom: '18%', width: '14px' }));
  mk(endPg, backDeco(9));
  const N = leaves.length;
  const book = h('div', { class: 'book' }, h('div', { class: 'shadow' }), ...leaves);
  const stageEl = h('div', { class: 'book-stage' }, book);
  const prev = h('button', { class: 'circle', html: '&#8592;', disabled: true, 'aria-label': 'sebelumnya' });
  const next = h('button', { class: 'circle', html: '&#8594;', 'aria-label': 'berikutnya' });
  const counter = h('div', { class: 'dot', text: '' });
  const nav = h('div', { class: 'book-nav hidden' }, prev, counter, next);
  const sc = mount('bg-night', stars(30), h('div', { class: 'wrap' }, h('div', { class: 'kicker fade-up', text: c.kicker }), stageEl, nav, h('div', { style: { marginTop: '16px' } }, endBtn)));
  let k = 0; // jumlah leaf yang sudah terbalik
  let lockUntil = 0, swiped = false;
  const setZ = () => leaves.forEach((lf, i) => (lf.style.zIndex = i < k ? i : N - i));
  const apply = () => {
    leaves.forEach((lf, i) => lf.classList.toggle('flipped', i < k));
    book.classList.toggle('open', k > 0);
    book.style.transform = innerWidth >= 700 && k > 0 && k < N - 1 ? 'translateX(50%)' : '';
    prev.disabled = k <= 0; next.disabled = k >= N - 1;
    counter.textContent = k === 0 ? '' : k <= total ? `${k} / ${total}` : '♡';
    nav.classList.toggle('hidden', k === 0);
    endBtn.classList.toggle('hidden', k < N - 1);
    setTimeout(setZ, 550);
  };
  // SATU pintu masuk untuk semua gerakan + kunci anti ketuk-ganda (memperbaiki "buka buku langsung loncat ke slide 2")
  const go = (d) => {
    const now = performance.now();
    if (now < lockUntil) return;
    const nk = clamp(k + d, 0, N - 1);
    if (nk === k) return;
    lockUntil = now + 700;
    k = nk; apply();
    if (k === 1) track('book_open', {}, { once: true, setStep: 'scrapbook' });
    if (k >= 1 && k <= total) track('book_page', { label: (cal && k === 1 ? 'kalender 28 Oktober' : `halaman ${k}/${total}`) }, { once: true, setStep: `scrapbook ${k}/${total}` });
    if (k === N - 1) track('book_end', {}, { once: true, setStep: 'scrapbook selesai' });
  };
  setZ(); apply();
  coverLeaf.addEventListener('click', (e) => { e.stopPropagation(); if (k === 0) go(1); });
  next.addEventListener('click', () => go(1)); prev.addEventListener('click', () => go(-1));
  stageEl.addEventListener('click', (e) => {
    if (swiped || k === 0 || e.target.closest('.tape') || e.target.closest('.cal-card')) return;
    const r = stageEl.getBoundingClientRect();
    if (e.clientX > r.left + r.width * 0.5) go(1);
  });
  let sx = null;
  stageEl.addEventListener('pointerdown', (e) => (sx = e.clientX));
  stageEl.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 40) { swiped = true; setTimeout(() => (swiped = false), 350); go(dx < 0 ? 1 : -1); }
  });
  await tap(endBtn);
  return sc;
}

/* =============== 8. SURAT ================= */
export async function letterScene(cfg) {
  const c = cfg.letter;
  track('letter_view', {}, { once: true, setStep: 'surat' });
  const txt = h('div', { class: 'txt' }), sig = h('div', { class: 'sig', text: fmt(c.signature) });
  const more = h('button', { class: 'btn ghost fade-up', style: { marginTop: '24px', '--dl': '0s' }, text: c.more });
  more.classList.add('hidden');
  const letter = h('div', { class: 'letter' }, h('img', { class: 'tape', src: '/assets/deco/tape-pink.webp', alt: '' }), c.date ? h('div', { class: 'date', text: fmt(c.date) }) : null, txt, sig,
    h('img', { class: 'letter-env', src: '/assets/gif/amplop.webp', alt: '' }),
    realImg('dahlia', { class: 'lt-fl a' }), realImg('tulip', { class: 'lt-fl b' }), realImg('rose', { class: 'lt-fl c' }), realImg('gypso', { class: 'lt-gy' }),
    h('img', { class: 'lt-gif', src: '/assets/gif/g-icon6.gif', alt: '' }));
  const sc = mount('bg-night', stars(28), h('div', { class: 'wrap' }, h('div', { class: 'kicker', style: { marginBottom: '16px' }, text: c.kicker }), letter, more));
  const full = fmt(c.text);
  let skip = false; letter.addEventListener('click', () => (skip = true));
  await sleep(1100);
  for (let i = 0; i < full.length; i++) {
    if (skip) { txt.textContent = full; break; }
    txt.textContent = full.slice(0, i + 1);
    await sleep(full[i] === '\n' ? 260 : 34);
  }
  sig.classList.add('show');
  track('letter_done', {}, { once: true });
  await sleep(600);
  more.classList.remove('hidden');
  await tap(more);
  return sc;
}

/* =============== 9. KARTU ================= */
// Gif di sekeliling kartu. Tambah/ganti lewat config.json -> card.gifs (src + css posisi). Contoh ada di config.
const CARD_GIFS = [
  { src: '/assets/gif/happy3.gif', css: 'top:-66px;right:-8px;width:104px;--rot:6deg' },
  { src: '/assets/gif/g-icon5.gif', css: 'bottom:-62px;left:-16px;width:96px;--rot:-6deg' },
  { src: '/assets/gif/g-icon3.gif', css: 'bottom:-56px;right:-14px;width:104px;--rot:5deg' },
  { src: '/assets/gif/g-box.gif', css: 'top:38%;left:-46px;width:62px;--rot:-10deg' },
];

export async function cardScene(cfg) {
  const c = cfg.card;
  track('card_view', {}, { once: true, setStep: 'kartu' });
  const open = h('button', { class: 'btn', text: c.button });
  const again = h('button', { class: 'link', text: c.restart });
  const gifs = (c.gifs && c.gifs.length ? c.gifs : CARD_GIFS).map((g) => h('img', { class: 'pc-gif', src: g.src, alt: '', style: g.css }));
  const sp = (css) => h('img', { class: 'pg-sp', src: sparkleURL, alt: '', style: css });
  const paper = h('div', { class: 'paper-card fade-up' },
    h('div', { class: 'pc-sheet s1' }), h('div', { class: 'pc-sheet s2' }),
    h('div', { class: 'pc-body' },
      h('img', { class: 'pc-tape', src: '/assets/deco/tape-pink.webp', alt: '' }),
      h('div', { class: 'kicker', text: c.kicker }),
      h('h2', { text: fmt(c.title) }), h('div', { class: 'from', text: fmt(c.from) }),
      h('p', { class: 'msg', text: fmt(c.message) }),
      h('div', { class: 'pc-rule' }),
      sp('left:8%;top:30%;width:12px'), sp('right:7%;top:56%;width:10px'), sp('left:46%;bottom:7%;width:13px')),
    realImg('dahlia', { class: 'pc-fl a' }), realImg('rose', { class: 'pc-fl b' }), realImg('anemone', { class: 'pc-fl c' }), realImg('gypso', { class: 'pc-fl e' }),
    h('img', { class: 'pc-fl d', src: '/assets/blue/blue-cornflower-01.webp', alt: '' }), realImg('ribbon', { class: 'pc-ribbon' }),
    ...gifs);
  const sc = mount('bg-night', stars(40), h('div', { class: 'wrap card-wrap' }, paper,
    h('div', { class: 'fin-actions', style: { margin: 0, animationDelay: '1.4s' } }, open, again)));
  const stop = flowerRain({ ms: 9000, every: 320, size: [26, 46], root: sc });
  const choice = await Promise.race([tap(open).then(() => 'open'), tap(again).then(() => 'again')]);
  track(choice === 'open' ? 'bouquet' : 'restart', {}, { setStep: choice === 'open' ? 'buket penutup' : 'kartu' });
  stop();
  return { sc, choice };
}

/* =============== 10. FINALE BUKET ================= */
export async function finaleScene(cfg) {
  const c = cfg.bouquet;
  const back = h('button', { class: 'btn', text: c.back });
  const again = h('button', { class: 'link', text: c.restart });
  const bq = h('div', { class: 'bq' }, h('img', { src: '/assets/deco/bouquet.webp', alt: 'buket bunga' }));
  const chips = h('div', { class: 'chips' }, ...c.flowers.map((f) => h('span', {}, h('b', { text: f.name }), ' · ' + f.meaning)));
  // kotak pesan opsional -> terkirim ke Telegram pemilik
  const area = h('textarea', { class: 'msg-area', maxlength: 600, rows: 3, placeholder: c.msgPlaceholder || 'Tulis sesuatu buat aku…' });
  const sendBtn = h('button', { class: 'btn blue small', text: c.msgSend || 'Kirim 💌' });
  const thanks = h('div', { class: 'msg-thanks hidden', text: c.msgThanks || 'Terkirim. Makasih ya 💙' });
  const form = h('div', { class: 'msg-form hidden' }, area, sendBtn);
  const toggle = h('button', { class: 'link dark', text: c.msgOpen || 'Mau bilang sesuatu ke aku? ✍️' });
  toggle.addEventListener('click', () => { form.classList.toggle('hidden'); if (!form.classList.contains('hidden')) area.focus(); });
  const err = h('div', { class: 'msg-err hidden', text: 'Belum terkirim, coba tekan Kirim lagi ya 🙏' });
  form.append(err);
  let sending = false;
  const doSend = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }   // jaga fokus agar keyboard tidak menutup & layout tidak loncat
    const t = area.value.trim(); if (!t || sending) return;
    sending = true; err.classList.add('hidden'); sendBtn.disabled = true; sendBtn.textContent = 'Mengirim…';
    const ok = await sendMessage(t);
    sending = false; sendBtn.disabled = false; sendBtn.textContent = c.msgSend || 'Kirim 💌';
    if (ok) { area.value = ''; area.blur(); form.classList.add('hidden'); toggle.classList.add('hidden'); thanks.classList.remove('hidden'); }
    else err.classList.remove('hidden');
  };
  sendBtn.addEventListener('pointerdown', doSend);
  sendBtn.addEventListener('click', (e) => { e.preventDefault(); if (e.detail === 0) doSend(); }); // keyboard/aksesibilitas
  const card = h('div', { class: 'fcard' }, h('div', { class: 'k', text: c.kicker }), h('h3', { text: fmt(c.title) }), h('p', { text: fmt(c.subtitle) }), chips, h('div', { class: 'tapi', text: c.tapHint }), toggle, form, thanks);
  track('finished', {}, { setStep: 'SELESAI (buket)' });
  const sc = mount('fin-scene', stars(44), h('div', { class: 'wrap' }, bq, card, h('div', { class: 'fin-actions' }, back, again)));
  const petals = ['/assets/petals/p-ruby.webp', '/assets/petals/p-wine1.webp', '/assets/petals/petal-cream-broad-01.webp', '/assets/blue/forget-me-not-cluster-01.webp'];
  const fall = () => {
    const svgOne = Math.random() < 0.55;
    const src = svgOne ? flowerURL(pick(['rose', 'tulip', 'anemone', 'poppy', 'daisy', 'petal']), Math.floor(rand(0, 3))) : pick(petals);
    const p = h('img', { class: 'petal-fall', src, alt: '', style: { left: rand(-5, 100) + 'vw', width: (svgOne ? rand(26, 48) : rand(14, 30)) + 'px', animationDuration: rand(6, 11) + 's', '--dx': rand(-80, 80) + 'px', '--rot': rand(300, 900) + 'deg', opacity: rand(0.7, 1) } });
    sc.append(p); setTimeout(() => p.remove(), 11500);
  };
  const tm = setInterval(fall, 520);
  bq.addEventListener('click', (e) => { track('bouquet_tap', {}, { once: true }); flowerBurst(e.clientX, e.clientY, 16); });
  const choice = await Promise.race([tap(back).then(() => 'back'), tap(again).then(() => 'again')]);
  track(choice === 'back' ? 'back_card' : 'restart', {}, { setStep: choice === 'back' ? 'kartu' : 'awal' });
  clearInterval(tm); sc.querySelectorAll('.petal-fall').forEach((n) => n.remove());
  return { sc, choice };
}
