import { useEffect, useMemo, useRef, useState } from 'react';
import * as G from '../../game/state.ts';
import type { ReelData } from '../../game/summitMemory.ts';
import { reelScript, reelAt, REEL_MS } from '../../game/summitReel.ts';
import type { ReelScript } from '../../game/summitReel.ts';
import { summitShareText, shareLink } from '../../game/share.ts';
import { useSummitAsset } from '../summitAsset.ts';
import { svgToImage } from '../shareCard.ts';
import { Portal } from './Portal.tsx';
import { Crest } from './Crest.tsx';
import { SummitShare } from './SummitShare.tsx';

/**
 * Five seconds of his last summit win (R9), built from the match itself: the headline, his crest and club, the
 * score, the goals in order, the game's name and address. It plays here; where the browser can record a canvas it
 * can also be saved as a file, and where it cannot there is simply no such button, the picture card is the way to
 * send it. Under reduced motion it is the finished card, still. Like the share card it shows nothing of the summit's
 * clubs (summitReel.ts).
 */
const W = 540, H = 960;
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** the container the browser can record into, or null when it cannot record a canvas at all */
export function reelMime(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined' || !('captureStream' in HTMLCanvasElement.prototype)) return null;
  return ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(m => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } }) ?? null;
}

function tokens() {
  const cs = getComputedStyle(document.documentElement);
  const t = (n: string) => cs.getPropertyValue(n).trim();
  return { bg0: t('--el-bg0'), bg3: t('--el-bg3'), g1: t('--el-g1'), g2: t('--el-g2'), g3: t('--el-g3'), g4: t('--el-g4'), ink: t('--el-ink'), dim: t('--el-ink-dim') };
}

function drawFrame(c: CanvasRenderingContext2D, T: ReturnType<typeof tokens>, s: ReelScript, t: number, crest: CanvasImageSource | null, back: HTMLVideoElement | null) {
  const cx = W / 2;
  if (back && back.readyState >= 2) c.drawImage(back, 0, 0, W, H);
  else {
    const g = c.createRadialGradient(cx, 300, 30, cx, 420, 760);
    g.addColorStop(0, T.bg3); g.addColorStop(1, T.bg0);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // gold sparks drifting up
    c.fillStyle = T.g3;
    for (let i = 0; i < 40; i++) {
      const x = (i * 97) % W, y = H - (((i * 131) + t * (0.04 + (i % 5) * 0.012)) % H);
      c.globalAlpha = 0.15 + (i % 4) * 0.08; c.fillRect(x, y, 2.5, 2.5);
    }
    c.globalAlpha = 1;
  }
  c.globalAlpha = 0.38; c.fillStyle = T.bg0; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
  const on = reelAt(s, t);
  const ease = (from: number) => Math.max(0, Math.min(1, (t - from) / 350));
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl';
  const foil = c.createLinearGradient(0, 110, 0, 190);
  foil.addColorStop(0, T.g4); foil.addColorStop(0.55, T.g3); foil.addColorStop(1, T.g1);
  c.globalAlpha = ease(0); c.fillStyle = foil; c.font = '900 62px "Frank Ruhl Libre", serif';
  c.fillText(s.headline, cx, 150, W - 60);
  if (crest) c.drawImage(crest, cx - 75, 215, 150, 150);
  c.fillStyle = T.ink; c.font = '700 34px "Frank Ruhl Libre", serif'; c.fillText(s.club, cx, 400, W - 60);
  if (on.score) {
    c.globalAlpha = ease(800); c.direction = 'ltr'; c.fillStyle = foil; c.font = '900 110px "Frank Ruhl Libre", serif';
    const f2 = c.createLinearGradient(0, 450, 0, 540); f2.addColorStop(0, T.g4); f2.addColorStop(1, T.g2);
    c.fillStyle = f2; c.fillText(s.score, cx, 495);
    if (s.pens) { c.direction = 'rtl'; c.fillStyle = T.dim; c.font = '700 26px "Frank Ruhl Libre", serif'; c.fillText(s.pens, cx, 568); }
  }
  c.direction = 'rtl'; c.font = '700 28px Heebo, Rubik, sans-serif';
  for (let i = 0; i < on.goals; i++) {
    c.globalAlpha = ease(1500 + i * 450); c.fillStyle = s.goals[i].includes('שער ליריבה') ? T.dim : T.ink;
    c.fillText(s.goals[i], cx, 625 + i * 40, W - 80);
  }
  if (s.more && on.goals >= s.goals.length) { c.globalAlpha = 1; c.fillStyle = T.dim; c.fillText(s.more, cx, 625 + s.goals.length * 40); }
  if (on.footer) { c.globalAlpha = ease(4000); c.direction = 'ltr'; c.fillStyle = T.g3; c.font = '700 26px "Frank Ruhl Libre", serif'; c.fillText(s.footer, cx, H - 60); }
  c.globalAlpha = 1;
}

export function SummitReel({ gs, data, onClose }: { gs: G.GameState; data: ReelData; onClose: () => void }) {
  const me = G.club(gs);
  const script = useMemo(() => reelScript(data, me.name), [data, me.name]);
  const still = reduced();
  const cv = useRef<HTMLCanvasElement>(null);
  const crestBox = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const base = useSummitAsset('reel/win-base');
  const [run, setRun] = useState(0);            // bumped to play again
  const [recording, setRecording] = useState(false);
  const mime = useMemo(reelMime, []);

  useEffect(() => {
    const c = cv.current?.getContext('2d');
    if (!c) return;
    const T = tokens();
    let raf = 0, alive = true, crest: CanvasImageSource | null = null;
    svgToImage(crestBox.current?.querySelector('svg') ?? null).then(img => { crest = img; if (still && alive) drawFrame(c, T, script, REEL_MS, crest, null); });
    if (still) { drawFrame(c, T, script, REEL_MS, null, null); return () => { alive = false; }; }
    const t0 = performance.now();
    if (video.current) { try { video.current.currentTime = 0; void video.current.play(); } catch { /* the drawn background takes over */ } }
    const loop = (now: number) => {
      const t = Math.min(REEL_MS, now - t0);
      drawFrame(c, T, script, t, crest, base.ready ? video.current : null);
      if (t < REEL_MS && alive) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [script, run, still, base.ready]);

  function record() {
    if (!mime || !cv.current || recording) return;
    const stream = (cv.current as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: mime });
    const parts: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    rec.onstop = () => {
      setRecording(false);
      const url = URL.createObjectURL(new Blob(parts, { type: mime }));
      const a = document.createElement('a');
      a.href = url; a.download = `be-a-pro.${mime.startsWith('video/mp4') ? 'mp4' : 'webm'}`;
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    };
    setRecording(true);
    rec.start();
    setRun(r => r + 1);                          // the reel plays from its start while it is recorded
    window.setTimeout(() => { try { rec.stop(); } catch { setRecording(false); } }, REEL_MS + 150);
  }

  return (
    <Portal>
      <div className="el-reel" data-summit="1" data-testid="summit-reel" role="dialog" aria-label="תקציר חמש שניות">
        <div ref={crestBox} className="el-share-crest" aria-hidden="true"><Crest club={me} size={320} /></div>
        {base.ready && base.src && <video ref={video} src={base.src} muted playsInline style={{ display: 'none' }} />}
        <canvas ref={cv} width={W} height={H} className="el-reel-canvas" data-testid="reel-canvas" />
        <div className="row" style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!still && <button type="button" className="btn dark btn-sm" onClick={() => setRun(r => r + 1)} disabled={recording}>נגן שוב</button>}
          {!still && mime && <button type="button" className="btn btn-sm" onClick={record} disabled={recording}>{recording ? 'מקליט' : 'שמור סרטון'}</button>}
          <button type="button" className="btn dark btn-sm" onClick={onClose}>סגור</button>
        </div>
        <SummitShare club={me} link={shareLink()}
          card={{ headline: 'ניצחון בפסגה', club: me.name, season: data.season, score: data.score, pens: data.pens }}
          text={summitShareText('win', { club: me.name, season: data.season })} />
      </div>
    </Portal>
  );
}
