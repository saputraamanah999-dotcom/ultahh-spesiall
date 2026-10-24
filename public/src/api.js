// Mode server: /api/config + /api/verify.  Mode statis (build-static): /config.public.json + hash di browser.
let staticMode = false;
let cfgCache = null;

export async function loadConfig() {
  try {
    const r = await fetch('/api/config', { cache: 'no-store' });
    if (!r.ok) throw new Error('no api');
    cfgCache = await r.json();
  } catch (e) {
    const r = await fetch('/config.public.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('Config tidak ditemukan');
    cfgCache = await r.json();
    staticMode = true;
  }
  return cfgCache;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(pin) {
  if (staticMode) {
    const { salt, hash } = cfgCache.pin;
    return { ok: (await sha256(salt + pin)) === hash };
  }
  try {
    const r = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
    const j = await r.json();
    if (r.status === 429) return { ok: false, error: j.error };
    return { ok: !!j.ok };
  } catch (e) {
    return { ok: false, error: 'Koneksi bermasalah, coba lagi ya.' };
  }
}
