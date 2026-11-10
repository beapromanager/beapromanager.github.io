/**
 * The summit's sounds (R11): optional, and OFF until the manager turns them on. A clean install makes no sound at
 * all. Everything is made here from scratch with WebAudio (a low crowd swell for the entrance, a short original
 * rising phrase with the crowd for the trophy): no file is loaded, and nothing borrowed from any real competition's
 * anthem. The audio engine is created only after he has touched the screen, and nothing plays while the tab is
 * hidden. No information is ever given by sound alone: every sound sits on something already shown.
 */
const KEY = 'beapro.sound';

export function soundOn(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
export function setSound(on: boolean): void {
  try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* a phone that will not keep it stays silent */ }
}

let touched = false;
if (typeof window !== 'undefined') {
  const mark = () => { touched = true; };
  window.addEventListener('pointerdown', mark, { once: true, capture: true });
  window.addEventListener('keydown', mark, { once: true, capture: true });
}

let ctx: AudioContext | null = null;
function engine(): AudioContext | null {
  if (!soundOn() || !touched || typeof document === 'undefined' || document.hidden) return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = ctx ?? new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

/** a crowd: filtered noise that swells and falls */
function crowd(ac: AudioContext, at: number, len: number, peak: number) {
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf;
  const band = ac.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 700; band.Q.value = 0.6;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + len * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(band).connect(g).connect(ac.destination);
  src.start(at); src.stop(at + len);
}

/** one soft note */
function note(ac: AudioContext, at: number, freq: number, len: number, peak: number) {
  const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(ac.destination);
  o.start(at); o.stop(at + len + 0.02);
}

export type SummitSound = 'entrance' | 'trophy';

/** Plays nothing unless sounds are on, he has touched the screen, and the tab is in front. Returns whether it played. */
export function playSummit(what: SummitSound): boolean {
  const ac = engine();
  if (!ac) return false;
  const t = ac.currentTime + 0.02;
  if (what === 'entrance') { crowd(ac, t, 2.4, 0.09); return true; }
  // the trophy: the summit's own four rising notes over the crowd
  crowd(ac, t, 4.2, 0.12);
  [392, 523.25, 659.25, 783.99].forEach((f, i) => note(ac, t + 0.35 + i * 0.32, f, 0.9, 0.11));
  note(ac, t + 1.7, 1046.5, 1.6, 0.09);
  return true;
}
