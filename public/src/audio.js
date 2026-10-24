const bgm = document.getElementById('bgm');
const btn = document.getElementById('music-btn');
let ready = false;

export function initAudio(music) {
  if (!music || !music.url) return;
  bgm.src = music.url;
  bgm.loop = music.loop !== false;
  bgm.volume = music.volume ?? 0.7;
  btn.title = music.title || 'Musik';
  btn.addEventListener('click', () => (bgm.paused ? play() : pause()));
  bgm.addEventListener('play', sync); bgm.addEventListener('pause', sync);
  ready = true;
}
function sync() {
  btn.classList.toggle('muted', bgm.paused);
  btn.classList.toggle('playing', !bgm.paused);
}
export function play() {
  if (!ready) return;
  btn.classList.remove('hidden');
  bgm.play().catch(() => { btn.classList.add('muted'); });
  sync();
}
export function pause() { bgm.pause(); sync(); }
export function duck(v) { if (ready) bgm.volume = v; }
