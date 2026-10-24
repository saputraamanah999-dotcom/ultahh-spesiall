// Membaca config.json (dipakai fungsi Vercel). PIN bisa di-override lewat env PIN_CODE.
const fs = require('fs'), path = require('path');
function readConfig() {
  const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config.json'), 'utf8'));
  if (process.env.PIN_CODE) cfg.pin.code = String(process.env.PIN_CODE);
  return cfg;
}
// Versi alamat aset: pakai waktu-ubah file bila ada, jika tidak pakai id deployment Vercel (berubah tiap deploy)
function versionAssets(v) {
  const dep = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || '';
  if (typeof v === 'string' && v.startsWith('/assets/') && !v.includes('?')) {
    try { return v + '?v=' + Math.floor(fs.statSync(path.join(process.cwd(), 'public', v)).mtimeMs / 1000).toString(36); } catch (e) { return dep ? v + '?v=' + String(dep).slice(-8) : v; }
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
module.exports = { readConfig, publicConfig };
