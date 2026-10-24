// Logika bersama untuk server lokal (server.js) DAN Vercel (api/*.js): format pesan + kirim ke Telegram.
const https = require('https');

const EVENTS = {
  open:        ['🌐', 'DIA MEMBUKA WEBSITE'],
  env_tap:     ['✉️', 'Mengetuk amplop'],
  pin_wrong:   ['🔒', 'Salah memasukkan PIN'],
  pin_ok:      ['🔓', 'PIN BENAR, kunci terbuka'],
  hello_tap:   ['👋', 'Menekan sapaan "hi, pretty"'],
  ready_yes:   ['✅', 'Jawab "are you ready?" → YES'],
  ready_no:    ['😤', 'Jawab "are you ready?" → NO'],
  cake_view:   ['🎂', 'Sampai di kue'],
  candle_out:  ['🕯️', 'Berhasil meniup lilin'],
  wish:        ['🌠', 'MEMILIH WISH'],
  memories:    ['💞', 'Melihat hati foto memori'],
  photo_zoom:  ['🖼️', 'Membuka foto (zoom)'],
  book_open:   ['📖', 'Membuka buku scrapbook'],
  book_page:   ['📄', 'Membaca halaman scrapbook'],
  book_end:    ['🏁', 'Sampai halaman terakhir scrapbook'],
  letter_view: ['💌', 'Membuka surat'],
  letter_done: ['📜', 'Selesai membaca surat'],
  card_view:   ['💙', 'Sampai di kartu "Happy Birthday"'],
  bouquet:     ['💐', 'Menekan "Buka bunga penutup"'],
  finished:    ['🎉', 'SELESAI! Dia sudah sampai di akhir'],
  bouquet_tap: ['🌹', 'Mengetuk buket bunga'],
  back_card:   ['↩️', 'Kembali ke kartu'],
  restart:     ['🔁', 'Mengulang dari awal'],
  message:     ['💬', 'DIA MENGIRIM PESAN UNTUKMU'],
  leave:       ['👋', 'Keluar / menutup halaman'],
  back:        ['🔙', 'Kembali ke halaman'],
};

const clean = (v, n = 160) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').slice(0, n);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dur = (s) => { s = Math.max(0, Number(s) || 0); return s >= 3600 ? `${Math.floor(s / 3600)}j ${Math.floor((s % 3600) / 60)}m` : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}d` : `${s}d`; };

/** body = JSON dari browser, geo = {country, city, ip} (opsional) */
function buildMessage(body, geo = {}) {
  const ev = clean(body.ev, 24);
  const meta = EVENTS[ev];
  if (!meta) return null;
  const d = body.data && typeof body.data === 'object' ? body.data : {};
  const dv = body.dev && typeof body.dev === 'object' ? body.dev : {};
  const st = body.stats && typeof body.stats === 'object' ? body.stats : {};
  let extra = '';
  if (ev === 'wish') extra = `\n✨ Wish: <b>${esc(clean(d.text))}</b>`;
  if (ev === 'message') extra = `\n📝 <i>${esc(clean(d.text, 800))}</i>`;
  if (ev === 'pin_wrong') extra = `\n🔢 Percobaan ke-${Number(d.n) || '?'}: <code>${esc(clean(d.pin, 12))}</code>`;
  if (ev === 'book_page' || ev === 'photo_zoom') extra = `\n📍 ${esc(clean(d.label, 40))}`;
  if (ev === 'leave') extra = `\n📌 ${esc(clean(d.reason, 40))}`;

  let summary = '';
  if (ev === 'finished' || ev === 'leave') {
    summary = `\n\n📊 <b>Ringkasan</b>` +
      `\n• Wish: ${st.wish ? '<b>' + esc(clean(st.wish)) + '</b>' : '(belum memilih)'}` +
      `\n• Salah PIN: ${Number(st.wrong) || 0}x · Jawab NO: ${Number(st.no) || 0}x` +
      `\n• Halaman scrapbook dilihat: ${Number(st.pages) || 0}/${Number(st.pagesTotal) || 5}` +
      `\n• Surat dibaca: ${st.letter ? 'ya' : 'belum'} · Buket: ${st.finished ? 'sampai' : 'belum'}` +
      (st.msg ? `\n• Pesan untukmu: <i>${esc(clean(st.msg, 300))}</i>` : '');
  }

  const lines = [`${meta[0]} <b>${meta[1]}</b>${extra}${summary}`, ''];
  lines.push(`⏱ ${dur(body.t)} sejak dibuka · tahap: ${esc(clean(body.step, 40))}`);
  if (ev === 'open' || ev === 'finished' || ev === 'leave') {
    lines.push(`📱 <b>${esc(clean(dv.model || dv.summary, 80))}</b>`);
    if (dv.os) lines.push(`⚙️ ${esc(clean(dv.os, 50))} · ${esc(clean(dv.browser, 40))}`);
    lines.push(`🖥 Layar ${esc(clean(dv.screen, 30))} · ${esc(clean(dv.lang, 12))} · ${esc(clean(dv.tz, 30))}${dv.net ? ' · ' + esc(clean(dv.net, 10)) : ''}`);
    if (geo.country || geo.city) lines.push(`🌍 ${esc(clean([geo.city, geo.country].filter(Boolean).join(', '), 60))}`);
    if (ev === 'open' && dv.inapp) lines.push(`📲 Dibuka dari dalam aplikasi: ${esc(clean(dv.inapp, 20))}`);
  } else {
    lines.push(`📱 ${esc(clean(dv.summary || dv.model, 60))}`);
  }
  lines.push(`#${esc(clean(body.sid, 8))}`);
  return lines.join('\n');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripTags = (t) => String(t).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Jalur koneksi: DNS biasa dulu, lalu IP Telegram langsung (bila DNS/IP tertentu diblokir atau ditolak jaringan)
const ROUTES = [
  { hostname: 'api.telegram.org' },
  { hostname: '149.154.167.220', servername: 'api.telegram.org' },
  { hostname: '149.154.166.110', servername: 'api.telegram.org' },
  { hostname: '2001:67c:4e8:f004::9', servername: 'api.telegram.org' },
];
function sendOnce(token, chat, text, html, route = ROUTES[0]) {
  return new Promise((resolve) => {
    const payload = { chat_id: chat, text, disable_web_page_preview: true };
    if (html) payload.parse_mode = 'HTML';
    const data = JSON.stringify(payload);
    const rq = https.request({ hostname: route.hostname, servername: route.servername, path: `/bot${token}/sendMessage`, method: 'POST',
      headers: { 'Host': 'api.telegram.org', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }, timeout: 9000 }, (r) => {
      let b = ''; r.on('data', (c) => (b += c));
      r.on('end', () => {
        try {
          const j = JSON.parse(b);
          if (j.ok) return resolve({ ok: true });
          resolve({ ok: false, error: j.description || ('HTTP ' + r.statusCode), retryAfter: j.parameters && j.parameters.retry_after });
        } catch (e) { resolve({ ok: false, error: 'HTTP ' + r.statusCode, network: r.statusCode >= 500 }); }
      });
    });
    rq.on('error', (e) => resolve({ ok: false, error: e.message, network: true }));
    rq.on('timeout', () => { rq.destroy(); resolve({ ok: false, error: 'timeout', network: true }); });
    rq.end(data);
  });
}

/** Kirim ke Telegram dengan ketahanan: tunggu bila kena batas kecepatan (429), kirim ulang sebagai teks biasa bila format HTML
 *  ditolak, dan coba lagi bila jaringan putus. Mengembalikan Promise {ok, error} (TIDAK pernah throw). */
async function tgSend(token, chat, text, { maxWait = 4000 } = {}) {
  if (!token || !chat) return { ok: false, error: 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum di-set' };
  let html = true, last = { ok: false, error: 'unknown' }, ri = 0;
  for (let i = 0; i < 6; i++) {
    last = await sendOnce(token, chat, html ? text : stripTags(text), html, ROUTES[ri % ROUTES.length]);
    if (last.ok) return last;
    if (last.retryAfter) { if (last.retryAfter * 1000 > maxWait) return last; await sleep(last.retryAfter * 1000 + 250); continue; }
    if (html && /parse entities|can't parse|unsupported start tag/i.test(last.error || '')) { html = false; continue; }
    if (last.network) { ri++; await sleep(500); continue; } // ganti jalur koneksi
    return last;
  }
  return last;
}

module.exports = { EVENTS, buildMessage, tgSend, clean, isNetworkError: (r) => !r.ok && (r.network || /ECONN|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|timeout/i.test(r.error || '')) };
