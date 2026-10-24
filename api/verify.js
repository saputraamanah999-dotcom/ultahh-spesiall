const crypto = require('crypto');
const { readConfig } = require('../lib/config');
const eq = (a, b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(), crypto.createHash('sha256').update(String(b)).digest());
const tries = new Map(); // rate-limit sederhana per instance
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim(), now = Date.now();
  const arr = (tries.get(ip) || []).filter((t) => now - t < 60000); arr.push(now); tries.set(ip, arr);
  if (arr.length > 8) return res.status(429).json({ ok: false, error: 'Terlalu banyak percobaan, tunggu sebentar ya.' });
  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const code = String((readConfig().pin || {}).code || '');
  res.status(200).json({ ok: !!code && eq(String((body || {}).pin || ''), code) });
};
