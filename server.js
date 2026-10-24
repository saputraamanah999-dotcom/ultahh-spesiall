// Server tanpa dependency: node server.js
// - menyajikan folder /public
// - GET  /api/config        -> konfigurasi publik (PIN TIDAK ikut dikirim)
// - POST /api/verify        -> cek PIN di server (dengan rate-limit)
// - /admin                  -> editor konfigurasi (lihat README)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const CONFIG_PATH = process.env.CONFIG_PATH || path.join(ROOT, 'config.json');
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const https = require('https');

// ---- .env sederhana (token bot disimpan di sini, BUKAN di folder public) ----
try {
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/).forEach((l) => {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(l);
    if (m && !l.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) { /* tidak ada .env: tracking Telegram nonaktif */ }
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.woff2': 'font/woff2',
};

function readConfig() {
  const c = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (process.env.PIN_CODE) c.pin.code = String(process.env.PIN_CODE);
  return c;
}
// Tambahkan ?v=<waktu-ubah-file> ke semua alamat /assets/... di config, jadi foto/gif yang kamu ganti
// (walau namanya sama) otomatis dimuat ulang oleh browser & tidak tertahan cache lama.
function versionAssets(v) {
  if (typeof v === 'string' && v.startsWith('/assets/') && !v.includes('?')) {
    try { return v + '?v=' + Math.floor(fs.statSync(path.join(PUBLIC, v)).mtimeMs / 1000).toString(36); } catch (e) { return v; }
  }
  if (Array.isArray(v)) return v.map(versionAssets);
  if (v && typeof v === 'object') { for (const k of Object.keys(v)) v[k] = versionAssets(v[k]); return v; }
  return v;
}
function publicConfig(cfg) {
  const copy = JSON.parse(JSON.stringify(cfg));
  const code = String((copy.pin && copy.pin.code) || '');
  copy.pin = Object.assign({}, copy.pin, { length: code.length });
  delete copy.pin.code;
  return versionAssets(copy);
}
const SEC = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' https: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};
function send(res, status, body, headers = {}) {
  const isObj = body && typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, Object.assign(
    { 'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, SEC,
    headers));
  res.end(isObj ? JSON.stringify(body) : body);
}
function readBody(req, limit = 1e6) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > limit) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
function safeEq(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// rate limit sederhana: 8 percobaan / menit / IP
const tries = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (tries.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now);
  tries.set(ip, arr);
  return arr.length > 8;
}
function isLocal(req) {
  const a = req.socket.remoteAddress || '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}
function adminAllowed(req) {
  if (ADMIN_KEY) return safeEq(req.headers['x-admin-key'] || '', ADMIN_KEY);
  return isLocal(req); // tanpa ADMIN_KEY: hanya boleh dari komputer sendiri
}

// ================= TRACKING -> TELEGRAM (logika di lib/track-core.js) =================
const { buildMessage, tgSend, isNetworkError } = require('./lib/track-core');
const hits = new Map();
function trackLimited(ip) {
  const now = Date.now(); const a = (hits.get(ip) || []).filter((t) => now - t < 60000);
  a.push(now); hits.set(ip, a); return a.length > 90;
}
function logVisit(body, ip) {
  try { fs.appendFileSync(path.join(ROOT, 'visits.log'), JSON.stringify({ at: new Date().toISOString(), ip, ev: body.ev, d: body.data, step: body.step, t: body.t, sid: body.sid }) + '\n'); } catch (e) { /* abaikan */ }
}
// ---- Antrean: jika koneksi keluar ke Telegram putus (mis. server jalan di HP & aplikasinya di latar belakang),
// semua laporan disimpan lalu dikirim berurutan begitu koneksi pulih. Tidak ada laporan yang hilang. ----
const tgQueue = [];
let flushing = false, lastWarn = 0;
const waktu = (t) => new Date(t).toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', second: '2-digit' });
function warnOffline(err) {
  if (Date.now() - lastWarn < 60000) return; lastWarn = Date.now();
  console.log('  [telegram] Koneksi keluar ke Telegram putus (' + err + '). Laporan DISIMPAN di antrean & dikirim otomatis saat koneksi pulih.');
  console.log('             Jika server ini jalan di HP: biarkan aplikasi IDE tampil (mode jendela/floating), matikan penghemat baterai & beri izin data latar belakang.');
}
async function flushQueue() {
  if (flushing || !tgQueue.length) return; flushing = true;
  while (tgQueue.length) {
    const it = tgQueue[0];
    const r = await tgSend(TG_TOKEN, TG_CHAT, '🕓 <i>tertunda · terjadi pukul ' + waktu(it.at) + '</i>\n' + it.msg);
    if (r.ok || !isNetworkError(r)) { tgQueue.shift(); if (r.ok) await new Promise((x) => setTimeout(x, 1100)); else console.log('  [telegram] dibuang:', r.error); }
    else { warnOffline(r.error); break; }
  }
  flushing = false;
}
setInterval(flushQueue, 8000);

function logVisit(body, ip) {
  try { fs.appendFileSync(path.join(ROOT, 'visits.log'), JSON.stringify({ at: new Date().toISOString(), ip, ev: body.ev, d: body.data, step: body.step, t: body.t, sid: body.sid }) + '\n'); } catch (e) { /* abaikan */ }
}
async function handleTrack(body, ip) {
  const msg = buildMessage(body, { ip });
  if (!msg) return { ok: true };
  logVisit(body, ip); // semua kejadian tersimpan juga di visits.log
  if (body.ev === 'message') console.log('  💬 PESAN DARI DIA:', String((body.data || {}).text || '').slice(0, 300));
  if (tgQueue.length) { tgQueue.push({ msg, at: Date.now() }); flushQueue(); return { ok: true, queued: true }; } // jaga urutan
  const r = await tgSend(TG_TOKEN, TG_CHAT, msg);
  if (r.ok) return r;
  if (isNetworkError(r)) { warnOffline(r.error); if (tgQueue.length < 500) tgQueue.push({ msg, at: Date.now() }); return { ok: true, queued: true }; }
  console.log('  [telegram] GAGAL kirim (' + body.ev + '):', r.error);
  return r;
}

async function handleApi(req, res, url) {
  try {
    if (req.method === 'GET' && url.pathname === '/api/config') return send(res, 200, publicConfig(readConfig()));

    if (req.method === 'POST' && url.pathname === '/api/verify') {
      const ip = req.socket.remoteAddress || 'x';
      if (limited(ip)) return send(res, 429, { ok: false, error: 'Terlalu banyak percobaan, tunggu sebentar ya.' });
      const body = JSON.parse((await readBody(req, 2000)) || '{}');
      const code = String((readConfig().pin || {}).code || '');
      return send(res, 200, { ok: !!code && safeEq(String(body.pin || ''), code) });
    }

    if (req.method === 'GET' && url.pathname === '/api/track') {
      const out = { configured: !!(TG_TOKEN && TG_CHAT) };
      if (url.searchParams.get('test')) Object.assign(out, await tgSend(TG_TOKEN, TG_CHAT, '✅ Tes: bot terhubung dan siap melapor 💙'));
      return send(res, 200, out);
    }
    if (req.method === 'POST' && url.pathname === '/api/track') {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'x').toString().split(',')[0].trim();
      if (trackLimited(ip)) return send(res, 429, { ok: false });
      let b = {}; try { b = JSON.parse((await readBody(req, 4000)) || '{}'); } catch (e) { return send(res, 400, { ok: false }); }
      const r = await handleTrack(b, ip);
      return send(res, 200, { ok: !!r.ok, error: r.ok ? undefined : r.error });
    }

    if (url.pathname === '/api/admin/config') {
      if (!adminAllowed(req)) return send(res, 403, { error: 'Akses admin ditolak. Set ADMIN_KEY atau buka dari localhost.' });
      if (req.method === 'GET') return send(res, 200, readConfig());
      if (req.method === 'PUT') {
        const cfg = JSON.parse(await readBody(req));
        if (!cfg || typeof cfg !== 'object' || !cfg.pin || !cfg.pin.code) return send(res, 400, { error: 'Config tidak valid (pin.code wajib).' });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
        return send(res, 200, { ok: true });
      }
    }
    return send(res, 404, { error: 'Not found' });
  } catch (e) {
    return send(res, 400, { error: String(e.message || e) });
  }
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const isAdminReq = rel === '/admin';
  const file = isAdminReq ? path.join(ROOT, 'admin', 'admin.html') : path.normalize(path.join(PUBLIC, rel));
  if ((!isAdminReq && !file.startsWith(PUBLIC)) || /(^|[\\/])\./.test(rel) || /\.(env|log)$/.test(rel)) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found');
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const isAdmin = path.basename(file) === 'admin.html';
    const secHdr = isAdmin ? { ...SEC, 'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'" } : SEC;
    const cache = 'no-cache'; // selalu cek ke server; murah karena pakai ETag -> 304 bila tidak berubah
    const etag = `W/"${st.size}-${Math.floor(st.mtimeMs)}"`;
    const cacheHdr = { 'ETag': etag, 'Last-Modified': st.mtime.toUTCString() };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ...secHdr, ...cacheHdr, 'Cache-Control': cache }); return res.end(); }
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
      if (start >= st.size || end >= st.size) { start = Math.min(start, st.size - 1); end = st.size - 1; }
      res.writeHead(206, { ...secHdr, ...cacheHdr, 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': cache });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...secHdr, ...cacheHdr, 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': cache });
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  serveStatic(req, res, url);
}).listen(PORT, () => {
  console.log(`\n  Website ultah jalan di  http://localhost:${PORT}`);
  console.log(`  Admin / edit isi        http://localhost:${PORT}/admin`);
  console.log(`  Notifikasi Telegram     ${TG_TOKEN && TG_CHAT ? 'mencoba terhubung...' : 'MATI (isi .env)'}`);
  if (TG_TOKEN && TG_CHAT) tgSend(TG_TOKEN, TG_CHAT, '✅ Server website ulang tahun menyala. Bot siap melapor 💙').then((r) => console.log(r.ok ? '  Telegram: TERHUBUNG (cek pesan di bot)\n' : isNetworkError(r) ? '  Telegram: koneksi internet keluar sedang putus (' + r.error + ') - laporan akan diantre & dikirim otomatis saat pulih\n' : '  Telegram: GAGAL -> ' + r.error + '\n  (pastikan kamu sudah tekan /start di bot & chat id benar)\n'));
});
