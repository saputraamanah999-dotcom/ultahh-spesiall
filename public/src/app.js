import { loadConfig } from './api.js';
import { initAudio, play, duck } from './audio.js';
import { setCtx, preload, sleep, fmt } from './util.js';
import { sweepIn, sweepOut, sweepAssets } from './sweep.js';
import * as S from './scenes.js';
import { track } from './track.js';
import { preloadList } from './flowers.js';

track('open', {}, { once: true, setStep: 'baru dibuka' }); // langsung terdeteksi saat halaman dibuka

function setVh() { document.documentElement.style.setProperty('--vh', innerHeight * 0.01 + 'px'); }
addEventListener('resize', setVh); setVh();

async function main() {
  const cfg = await loadConfig();
  setCtx({ name: cfg.recipient.name, sender: cfg.sender.name });
  document.title = fmt(cfg.site.title);
  initAudio(cfg.music);

  const photoUrls = [...(cfg.lovePhotos || []).map((p) => p.url), ...cfg.photos.map((p) => p.url)];
  preload([...sweepAssets(), ...preloadList(), '/assets/deco/cake.webp', '/assets/deco/bouquet.webp', '/assets/deco/wax-seal.webp', '/assets/paper/cream.webp', '/assets/paper/cloth.webp', '/assets/paper/letter.webp', ...photoUrls.slice(0, 16)]);

  const theme = cfg.intro.sweepColor || 'red';
  let first = true;
  for (;;) {
    S.clearStage();

    // 1) INTRO amplop -> bunga menyembur menutupi layar
    const { scene: introSc, anchor } = await S.introScene(cfg, play);
    await sweepIn({ theme, mode: 'burst', anchor });
    introSc.remove();

    // 2) KUNCI PIN (di balik bunga sudah dipasang)
    const lockP = S.lockScene(cfg);
    await sleep(60);
    await sweepOut();
    const lockSc = await lockP;

    // 3) berhasil -> bunga merah menyapu dari kanan-atas ke bawah
    await sweepIn({ theme, mode: 'diag' });
    lockSc.remove();
    const helloP = S.helloScene(cfg);
    await sleep(60);
    await sweepOut();
    await helloP;

    // 4) kue, tiup lilin, kegelapan
    const cakeSc = await S.cakeScene(cfg, { duck });

    // 5) wish -> 6) hati memori -> 7) scrapbook -> 8) surat -> 9) kartu
    await S.leave(cakeSc, 900);
    await S.leave(await S.wishScene(cfg), 700);
    await S.leave(await S.memoriesScene(cfg), 700);
    await S.leave(await S.scrapbookScene(cfg), 700);
    await S.leave(await S.letterScene(cfg), 700);

    let again = false;
    for (;;) {
      const { sc, choice } = await S.cardScene(cfg);
      if (choice === 'again') { await S.leave(sc, 500); again = true; break; }
      // 10) finale buket (sapuan bunga biru)
      await sweepIn({ theme: 'blue', mode: 'diag' });
      sc.remove();
      const finP = S.finaleScene(cfg);
      await sleep(60);
      await sweepOut();
      const r = await finP;
      if (r.choice === 'again') { await S.leave(r.sc, 500); again = true; break; }
      await S.leave(r.sc, 500); // "Back to card" -> ulangi kartu
    }
    if (again) first = false;
  }
}

main().catch((e) => {
  console.error(e);
  document.getElementById('stage').innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif">Ups, ada masalah memuat halaman 😢<br><small>' + String(e.message || e) + '</small></div>';
});
