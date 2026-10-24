const { buildMessage, tgSend } = require('../lib/track-core');
const hits = new Map();
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  // Diagnosa: buka /api/track?test=1 di browser untuk tes koneksi bot (tampil error asli dari Telegram)
  if (req.method === 'GET') {
    const out = { configured: !!(token && chat) };
    if (req.query && req.query.test) Object.assign(out, await tgSend(token, chat, '✅ Tes dari Vercel: bot terhubung dan siap melapor 💙'));
    return res.status(200).json(out);
  }
  if (req.method !== 'POST') return res.status(405).end();
  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim(), now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000); arr.push(now); hits.set(ip, arr);
  if (arr.length > 90) return res.status(429).json({ ok: false });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false });
  const msg = buildMessage(body, { country: req.headers['x-vercel-ip-country'], city: decodeURIComponent(req.headers['x-vercel-ip-city'] || '') });
  let r = { ok: true };
  if (msg) r = await tgSend(token, chat, msg, { maxWait: 3000 }); // HARUS di-await: serverless berhenti begitu respon dikirim
  res.status(200).json({ ok: !!r.ok, error: r.ok ? undefined : r.error });
};
