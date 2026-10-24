// Pengaman ringan: cegah salin teks, klik kanan, simpan gambar, pintasan devtools & view-source,
// serta kunci layar kalau devtools terdeteksi terbuka.
// CATATAN JUJUR: apa pun yang dikirim ke browser tidak bisa 100% disembunyikan; ini menghalangi
// orang biasa. Hal yang benar-benar rahasia (PIN) memang dicek di server.
const local = /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.|10\.)/.test(location.hostname);

const stop = (e) => { if (e.target && e.target.closest && e.target.closest('textarea,input') && !/^(contextmenu|drop)$/.test(e.type)) return; e.preventDefault(); e.stopPropagation(); return false; };
['contextmenu', 'copy', 'cut', 'paste', 'selectstart', 'dragstart', 'drop'].forEach((ev) => document.addEventListener(ev, stop, { capture: true }));
document.addEventListener('keydown', (e) => {
  const k = (e.key || '').toLowerCase(), c = e.ctrlKey || e.metaKey;
  const bad =
    e.key === 'F12' ||
    (c && e.shiftKey && ['i', 'j', 'c', 'k', 'm'].includes(k)) ||
    (c && ['u', 's', 'p', 'a', 'c', 'x'].includes(k)) ||
    (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k));
  if (bad) stop(e);
}, true);
// cegah long-press "simpan gambar" & seret
document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
// (anti zoom dobel-tap dilakukan lewat CSS touch-action:manipulation agar ketukan cepat tidak hilang)

// ---- deteksi devtools (dilewati di localhost supaya kamu tetap bisa ngetes) ----
let veil = null;
function lock(on) {
  if (on && !veil) {
    veil = document.createElement('div');
    veil.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#030a1b;color:#c9ddff;display:grid;place-items:center;text-align:center;padding:30px;font:500 18px/1.5 Georgia,serif';
    veil.textContent = 'Kado ini hanya untuk dinikmati 💙 Tutup alat pengembang untuk melanjutkan.';
    document.documentElement.append(veil);
  } else if (!on && veil) { veil.remove(); veil = null; }
}
if (!local) {
  const wide = () => (outerWidth - innerWidth > 170) || (outerHeight - innerHeight > 190);
  setInterval(() => {
    let open = wide();
    const t = performance.now();
    (function () { debugger; })(); // berhenti sendiri kalau devtools terbuka -> selisih waktu besar
    if (performance.now() - t > 120) open = true;
    lock(open);
  }, 900);
}
