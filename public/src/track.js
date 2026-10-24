// Pelacak progres -> /api/track (server lokal ATAU Vercel) -> bot Telegram.
// Token bot TIDAK ada di sini; hanya di server (.env / Environment Variables Vercel).
const sid = Math.random().toString(36).slice(2, 8);
const t0 = Date.now();
let step = 'buka halaman';
const sent = new Set();
const stats = { wrong: 0, no: 0, pages: 0, pagesTotal: 5, wish: '', letter: false, finished: false, msg: '' };

/* ---------------- deteksi perangkat ---------------- */
const ANDROID_BRANDS = [
  [/^(SM-|GT-|SC-|SCV|SGH-)/i, 'Samsung'], [/^(Redmi|Mi |MI |POCO|M\d{4}[A-Z]\d|\d{7,}[A-Z]{1,3}$|2[0-9]{3}[0-9A-Z]{4,})/i, 'Xiaomi/Redmi/POCO'],
  [/^(CPH|PH[A-Z]M|PCA|PD\d|OPPO)/i, 'OPPO'], [/^(RMX|realme)/i, 'realme'], [/^(V\d{4}|vivo|PD\d{4}|I\d{4})/i, 'vivo'],
  [/^(Infinix|X\d{3,4}[A-Z]?\b)/i, 'Infinix'], [/^(TECNO|K[A-Z]\d|C[A-Z]\d)/i, 'TECNO'], [/^(itel)/i, 'itel'], [/^(Pixel)/i, 'Google'],
  [/^(ONEPLUS|OnePlus|[A-Z]{2}\d{4}$)/i, 'OnePlus'], [/^(HUAWEI|HONOR|[A-Z]{3}-[A-LN-Z0-9]{2,4})/i, 'Huawei/Honor'], [/^(moto|XT\d)/i, 'Motorola'],
  [/^(ASUS|ZS\d|AI\d)/i, 'ASUS'], [/^(Nokia|TA-)/i, 'Nokia'], [/^(Sony|XQ-|SO-)/i, 'Sony'], [/^(LG|LM-)/i, 'LG'], [/^(Lenovo)/i, 'Lenovo'],
];
const IPHONES = { '320x568': 'iPhone SE (1)/5s', '375x667': 'iPhone 6/7/8/SE 2-3', '414x736': 'iPhone 6/7/8 Plus', '375x812': 'iPhone X/XS/11 Pro/12-13 mini',
  '414x896': 'iPhone XR/11/XS Max/11 Pro Max', '390x844': 'iPhone 12/13/14 (Pro)', '428x926': 'iPhone 12/13 Pro Max/14 Plus', '393x852': 'iPhone 14 Pro/15/15 Pro/16',
  '430x932': 'iPhone 14 Pro Max/15 Plus/15 Pro Max/16 Plus', '402x874': 'iPhone 16 Pro/17', '440x956': 'iPhone 16 Pro Max/17 Pro Max', '420x912': 'iPhone Air' };
const IPADS = { '768x1024': 'iPad (9.7/10.2/mini)', '810x1080': 'iPad 10.2', '820x1180': 'iPad Air/10th gen', '834x1194': 'iPad Pro 11', '1024x1366': 'iPad Pro 12.9' };

function baseDevice() {
  const ua = navigator.userAgent || '';
  const sw = Math.min(screen.width, screen.height), sh = Math.max(screen.width, screen.height);
  const d = { screen: `${screen.width}x${screen.height} @${devicePixelRatio || 1}x`, lang: navigator.language || '', tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '', net: (navigator.connection && navigator.connection.effectiveType) || '' };
  let m;
  if (/iPhone/.test(ua)) {
    m = /OS (\d+)[_.](\d+)/.exec(ua); d.os = 'iOS ' + (m ? m[1] + '.' + m[2] : '?');
    d.model = 'iPhone (kira-kira: ' + (IPHONES[sw + 'x' + sh] || 'tipe tidak dikenal ' + sw + 'x' + sh) + ')';
  } else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    d.os = 'iPadOS'; d.model = 'iPad (kira-kira: ' + (IPADS[sw + 'x' + sh] || sw + 'x' + sh) + ')';
  } else if (/Android/.test(ua)) {
    m = /Android ([\d.]+)/.exec(ua); d.os = 'Android ' + (m ? m[1] : '?');
    const mm = /Android [\d.]+;\s*([^;)]+?)(?:\s+Build|\))/.exec(ua); const raw = mm ? mm[1].trim() : '';
    const br = (ANDROID_BRANDS.find(([re]) => re.test(raw)) || [])[1];
    d.model = raw && raw !== 'K' ? (br ? br + ' ' : '') + raw : 'Android (model disembunyikan browser)'; d.rawModel = raw;
  } else if (/Windows/.test(ua)) { d.os = 'Windows'; d.model = 'PC/Laptop Windows'; }
  else if (/Mac OS X/.test(ua)) { d.os = 'macOS'; d.model = 'Mac'; }
  else if (/CrOS/.test(ua)) { d.os = 'ChromeOS'; d.model = 'Chromebook'; }
  else if (/Linux/.test(ua)) { d.os = 'Linux'; d.model = 'PC Linux'; }
  else { d.os = '?'; d.model = 'tidak dikenal'; }
  d.browser = /SamsungBrowser\/([\d.]+)/.test(ua) ? 'Samsung Internet' : /EdgA?\/([\d.]+)/.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /UCBrowser/.test(ua) ? 'UC Browser'
    : /(CriOS|Chrome)\/([\d]+)/.test(ua) ? 'Chrome ' + RegExp.$2 : /FxiOS|Firefox\/([\d]+)/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : '?';
  d.inapp = /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook' : /TikTok|musical_ly|Bytedance/i.test(ua) ? 'TikTok' : /Line\//.test(ua) ? 'LINE' : /; wv\)/.test(ua) ? 'WebView/aplikasi' : '';
  d.summary = d.model + ' · ' + d.os;
  d.ua = ua.slice(0, 120);
  return d;
}
let device = baseDevice();
// Chrome Android menyediakan model asli lewat Client Hints -> lebih akurat
const devReady = (async () => {
  try {
    const u = navigator.userAgentData; if (!u || !u.getHighEntropyValues) return;
    const hv = await Promise.race([u.getHighEntropyValues(['model', 'platformVersion']), new Promise((r) => setTimeout(r, 700))]);
    if (hv && hv.model) { const br = (ANDROID_BRANDS.find(([re]) => re.test(hv.model)) || [])[1]; device.model = (br ? br + ' ' : '') + hv.model; device.rawModel = hv.model; device.summary = device.model + ' · ' + device.os; }
  } catch (e) { /* abaikan */ }
})();

/* ---------------- kirim ---------------- */
async function post(body, beacon) {
  if (!beacon) await devReady;
  const payload = JSON.stringify(Object.assign({ sid, t: Math.round((Date.now() - t0) / 1000), step, dev: device, stats }, body));
  try {
    if (beacon && navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
    else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
  } catch (e) { /* jangan ganggu hadiah */ }
}

export function track(ev, data = {}, { once = false, setStep = null } = {}) {
  if (setStep) step = setStep;
  if (once) { const k = ev + JSON.stringify(data); if (sent.has(k)) return; sent.add(k); }
  if (ev === 'pin_wrong') stats.wrong++;
  if (ev === 'ready_no') stats.no++;
  if (ev === 'book_page') stats.pages++;
  if (ev === 'wish') stats.wish = data.text || '';
  if (ev === 'letter_done') stats.letter = true;
  if (ev === 'finished') stats.finished = true;
  if (ev === 'message') stats.msg = data.text || '';
  post({ ev, data });
}
export const setStep = (s) => { step = s; };
export const setStats = (o) => Object.assign(stats, o);

let left = false;
function leaveNote(reason) { if (left) return; left = true; post({ ev: 'leave', data: { reason } }, true); }
addEventListener('pagehide', () => leaveNote('menutup/keluar'));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') leaveNote('pindah tab/app');
  else if (left) { left = false; post({ ev: 'back', data: {} }); }
});

/** Kirim pesan dia & tunggu konfirmasi server. Mengembalikan true jika benar-benar terkirim ke Telegram. */
export async function sendMessage(text) {
  stats.msg = text; await devReady;
  const payload = JSON.stringify({ sid, t: Math.round((Date.now() - t0) / 1000), step: 'mengirim pesan', dev: device, stats, ev: 'message', data: { text } });
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok !== false) return true;
      console.warn('kirim pesan gagal:', r.status, j && j.error);
    } catch (e) { /* coba lagi */ }
    await new Promise((res) => setTimeout(res, 700));
  }
  return false;
}
