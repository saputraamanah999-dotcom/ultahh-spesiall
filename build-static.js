// Opsional: bikin versi STATIS (folder dist/) untuk Netlify / GitHub Pages / hosting file biasa.
// PIN tidak ditulis polos, tapi di-hash (SHA-256 + salt) dan dicek di browser.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const dist = path.join(__dirname, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
(function copy(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    fs.statSync(s).isDirectory() ? copy(s, d) : fs.copyFileSync(s, d);
  }
})(path.join(__dirname, 'public'), dist);
const code = String(cfg.pin.code), salt = crypto.randomBytes(8).toString('hex');
const pub = JSON.parse(JSON.stringify(cfg));
pub.pin = Object.assign({}, cfg.pin, { length: code.length, salt, hash: crypto.createHash('sha256').update(salt + code).digest('hex') });
delete pub.pin.code;
fs.writeFileSync(path.join(dist, 'config.public.json'), JSON.stringify(pub, null, 2));
try { fs.unlinkSync(path.join(dist, 'admin.html')); } catch (e) {}
console.log('Selesai -> folder dist/ (upload folder ini ke hosting statis)');
