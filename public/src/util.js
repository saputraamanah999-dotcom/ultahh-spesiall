export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Mini hyperscript: h('div', {class:'a', onclick:fn, html:'<b>x</b>'}, child, 'text') */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

/** Ganti {name} / {sender} dalam teks dari config. */
let ctx = { name: '', sender: '' };
export const setCtx = (c) => (ctx = c);
export const fmt = (s) => String(s ?? '').replace(/\{name\}/g, ctx.name).replace(/\{sender\}/g, ctx.sender);

export function preload(urls) {
  return Promise.all([...new Set(urls)].map((u) => new Promise((res) => {
    const i = new Image();
    i.onload = i.onerror = () => res();
    i.src = u;
  })));
}

export function once(el, ev) {
  return new Promise((res) => el.addEventListener(ev, res, { once: true }));
}

/** Tunggu klik/tap pada elemen. */
export const tap = (el) => once(el, 'click');

export function stars(n = 40) {
  const w = h('div', { class: 'stars' });
  for (let i = 0; i < n; i++) {
    w.append(h('i', { style: { left: rand(0, 100) + '%', top: rand(0, 100) + '%', '--d': rand(3, 7) + 's', '--dl': rand(0, 5) + 's', width: rand(2, 4) + 'px', height: rand(2, 4) + 'px' } }));
  }
  return w;
}

export function confetti(symbols = ['💙', '💫', '🤍', '✨'], ms = 5000, every = 160) {
  const t = setInterval(() => {
    const c = h('div', { class: 'confetti', text: pick(symbols), style: { left: rand(0, 100) + 'vw', fontSize: rand(16, 28) + 'px', animationDuration: rand(3, 6) + 's' } });
    document.body.append(c);
    setTimeout(() => c.remove(), 6500);
  }, every);
  setTimeout(() => clearInterval(t), ms);
  return () => clearInterval(t);
}
