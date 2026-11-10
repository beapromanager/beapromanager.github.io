import { useEffect, useRef, useState } from 'react';
import type { SummitEntranceData } from '../../game/state.ts';
import { entranceAssetId } from '../../data/summitAssets.ts';
import { useSummitAsset } from '../summitAsset.ts';
import { Portal } from './Portal.tsx';
import { playSummit } from '../sound.ts';

/**
 * The beat before a summit night (R3): from high above a full ground, the stands lit by the home end's fires, the
 * home club's name in the middle of the grass and the ground's name under it, then a straight cut to the match. No
 * fade: the layer is simply gone. A tap anywhere cuts early. Under reduced motion it is one still frame, shorter.
 *
 * The clip is Itzik's (entrance/<club>.mp4 from HIGGSFIELD-SUMMIT.md); until it is there, the canvas below draws the
 * same shot: the bowl, the crowd, the pitch and its chalk, and the fires in the club's own colours. The words are
 * always the code's, in Hebrew, never baked into a picture.
 */
export const SUMMIT_ENTRANCE_MS = 2600;
export const SUMMIT_ENTRANCE_STILL_MS = 1500;

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** the summit's own colours, read off its tokens so the canvas never carries a colour of its own */
function tokens() {
  const cs = getComputedStyle(document.documentElement);
  const t = (n: string) => cs.getPropertyValue(n).trim();
  return {
    bg: t('--el-bg0'), stand: t('--el-bg2'), standHi: t('--el-bg3'), gold: t('--el-g3'), line: t('--el-g1'),
    grassA: t('--el-grass-a'), grassB: t('--el-grass-b'), chalk: t('--el-chalk'), crowd: t('--el-crowd'), crowdHi: t('--el-crowd-hi'),
    smoke: t('--el-smoke'),
  };
}

/** a small seeded stream, so the crowd sits in the same seats on every showing */
function stream(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

/**
 * The ground from above. The still part (the bowl, its tiers, the crowd, the pitch and its chalk, the floodlight
 * pools) is drawn once; every frame lays it down a touch closer and burns the fires over it: a row of flares in each
 * end stand with their smoke drifting off, and scarves catching the light here and there in the crowd.
 */
function drawGround(cv: HTMLCanvasElement, flares: string[], final: boolean, seed: number, still: boolean): () => void {
  const ctx = cv.getContext('2d');
  if (!ctx) return () => {};
  const T = tokens();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const rnd = stream(seed);
  const rx = w * 0.7, ry = h * 0.6;            // the bowl runs off the edges: a camera low enough to fill the frame
  const pw = Math.min(w * 0.6, h * 0.4), ph = pw * 1.55;
  const inPitch = (x: number, y: number, pad: number) => Math.abs(x) < pw / 2 + pad && Math.abs(y) < ph / 2 + pad;
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

  // the still part, once
  const base = document.createElement('canvas');
  base.width = cv.width; base.height = cv.height;
  const b = base.getContext('2d')!;
  b.setTransform(dpr, 0, 0, dpr, 0, 0);
  b.fillStyle = T.bg; b.fillRect(0, 0, w, h);
  b.translate(w / 2, h / 2);
  const bowl = b.createRadialGradient(0, 0, pw * 0.4, 0, 0, Math.max(rx, ry));
  bowl.addColorStop(0, T.standHi); bowl.addColorStop(1, T.stand);
  b.fillStyle = bowl; b.beginPath(); b.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); b.fill();
  b.strokeStyle = T.line; b.lineWidth = 1; b.globalAlpha = 0.28;
  for (const k of [0.62, 0.78, 0.94]) { b.beginPath(); b.ellipse(0, 0, rx * k, ry * k, 0, 0, Math.PI * 2); b.stroke(); }
  b.globalAlpha = 1;
  // the crowd: thousands of heads, warm and dim, a few in the club's colours
  for (let i = 0; i < 11000; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
    const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r;
    if (inPitch(x, y, 16)) continue;
    const scarf = rnd() < 0.06;
    b.fillStyle = scarf ? flares[Math.floor(rnd() * flares.length)] : rnd() < 0.5 ? T.crowd : T.crowdHi;
    b.globalAlpha = scarf ? 0.55 : 0.25 + rnd() * 0.35;
    b.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
  }
  b.globalAlpha = 1;
  // the pitch, mown in bands, under four pools of floodlight
  for (let i = 0; i < 12; i++) { b.fillStyle = i % 2 ? T.grassA : T.grassB; b.fillRect(-pw / 2, -ph / 2 + (ph / 12) * i, pw, ph / 12 + 0.5); }
  b.globalCompositeOperation = 'lighter';
  for (const [fx, fy] of corners) {
    const gx = fx * pw * 0.32, gy = fy * ph * 0.3;
    const pool = b.createRadialGradient(gx, gy, 0, gx, gy, pw * 0.7);
    pool.addColorStop(0, T.gold); pool.addColorStop(1, 'transparent');
    b.globalAlpha = 0.09; b.fillStyle = pool; b.fillRect(-pw / 2, -ph / 2, pw, ph);
  }
  b.globalCompositeOperation = 'source-over'; b.globalAlpha = 0.9;
  b.strokeStyle = T.chalk; b.fillStyle = T.chalk; b.lineWidth = 1.5;
  b.strokeRect(-pw / 2, -ph / 2, pw, ph);
  b.beginPath(); b.moveTo(-pw / 2, 0); b.lineTo(pw / 2, 0); b.stroke();
  b.beginPath(); b.arc(0, 0, pw * 0.15, 0, Math.PI * 2); b.stroke();
  for (const e of [-1, 1]) {
    b.strokeRect(-pw * 0.3, e < 0 ? -ph / 2 : ph / 2 - ph * 0.15, pw * 0.6, ph * 0.15);
    b.strokeRect(-pw * 0.13, e < 0 ? -ph / 2 : ph / 2 - ph * 0.055, pw * 0.26, ph * 0.055);
    b.beginPath(); b.arc(0, e * ph * 0.39, 1.6, 0, Math.PI * 2); b.fill();
  }
  b.beginPath(); b.arc(0, 0, 1.8, 0, Math.PI * 2); b.fill();
  b.globalAlpha = 1;
  // the floodlight masts at the four corners of the bowl
  b.globalCompositeOperation = 'lighter';
  for (const [fx, fy] of corners) {
    const mx = fx * rx * 0.62, my = fy * ry * 0.72;
    const glow = b.createRadialGradient(mx, my, 0, mx, my, 70);
    glow.addColorStop(0, T.gold); glow.addColorStop(1, 'transparent');
    b.globalAlpha = 0.35; b.fillStyle = glow; b.beginPath(); b.arc(mx, my, 70, 0, Math.PI * 2); b.fill();
  }
  b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1;

  // the fires: a row in each end stand, between the goal and the roof. In the final each end burns its own side.
  const standY = ph / 2 + (ry * 0.94 - ph / 2) * 0.45;
  const sources = [0, 1].flatMap(end => Array.from({ length: 7 }, (_, i) => ({
    end, x: (i / 6 - 0.5) * pw * 1.15 + (rnd() - 0.5) * 10, y: (end === 0 ? -1 : 1) * (standY + (rnd() - 0.5) * 16),
    colour: final ? flares[end] ?? flares[0] : flares[i % flares.length], ph: rnd() * 6,
  })));
  const smoke = sources.flatMap(s => Array.from({ length: 5 }, () => ({ s, life: rnd(), dx: 0.4 + rnd() * 0.8, size: 14 + rnd() * 18 })));
  const scarves = Array.from({ length: 160 }, () => {
    let x = 0, y = 0;
    do { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()); x = Math.cos(a) * rx * r; y = Math.sin(a) * ry * r; } while (inPitch(x, y, 16));
    return { x, y, c: flares[Math.floor(rnd() * flares.length)], tw: rnd() * 6 };
  });

  const frame = (t: number) => {
    const zoom = still ? 1.05 : 1 + Math.min(1, t / 2600) * 0.1;   // the camera sinks towards the grass
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = T.bg; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(cv.width / 2, cv.height / 2); ctx.scale(zoom, zoom); ctx.translate(-cv.width / 2, -cv.height / 2);
    ctx.drawImage(base, 0, 0);
    ctx.scale(dpr, dpr); ctx.translate(w / 2, h / 2);
    // smoke first, the fire over it
    for (const m of smoke) {
      const life = still ? m.life : (m.life + t / 2200) % 1;
      const x = m.s.x + life * 40 * m.dx, y = m.s.y + (m.s.end === 0 ? -1 : 1) * life * 26;
      const r = m.size * (0.6 + life);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, T.smoke); g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.34 * (1 - life); ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const s of sources) {
      const flick = still ? 1 : 0.8 + 0.2 * Math.sin(t / 70 + s.ph) * Math.sin(t / 113 + s.ph * 2);
      const r = 30 * flick;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      g.addColorStop(0, s.colour); g.addColorStop(0.35, s.colour); g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.75; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.95; ctx.fillStyle = T.chalk;
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.2 * flick, 0, Math.PI * 2); ctx.fill();
    }
    for (const c of scarves) {
      if (!still && Math.sin(t / 260 + c.tw) < 0.3) continue;
      ctx.globalAlpha = 0.6; ctx.fillStyle = c.c; ctx.fillRect(c.x - 1, c.y - 1, 2, 2);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.restore();
  };

  if (still) { frame(0); return () => {}; }
  let raf = 0; const t0 = performance.now();
  const loop = (now: number) => { frame(now - t0); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

export function SummitEntrance({ data, onDone }: { data: SummitEntranceData; onDone: () => void }) {
  const still = reduced();
  const clipId = entranceAssetId(data.homeId, data.final);
  const clip = useSummitAsset(clipId);
  const homeClip = clipId === 'entrance/home';
  const [broken, setBroken] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null);
  const ended = useRef(false);
  const end = () => { if (!ended.current) { ended.current = true; onDone(); } };
  const useClip = clip.ready && !broken;
  const useCanvas = clip.failed || broken;

  useEffect(() => {
    playSummit('entrance');   // silent unless he turned the sounds on
    const t = window.setTimeout(end, still ? SUMMIT_ENTRANCE_STILL_MS : SUMMIT_ENTRANCE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!useCanvas || !cv.current) return;
    return drawGround(cv.current, data.flares, data.final, data.title.length * 7919 + data.stadium.length, still);
  }, [useCanvas, data.flares, data.final, data.title, data.stadium, still]);

  return (
    <Portal>
      <div className="el-entrance" data-final={data.final ? '1' : '0'} onClick={end} role="presentation" data-testid="summit-entrance">
        {useClip && (still
          ? clip.poster && <img className="el-entrance-media" src={clip.poster} alt="" />
          : <video className="el-entrance-media" src={clip.src ?? undefined} poster={clip.poster ?? undefined} autoPlay muted playsInline
              onError={() => setBroken(true)} />)}
        {/* his own ground's clip burns white: his colours, which change from career to career, are laid over it */}
        {useClip && homeClip && (
          <div className="el-entrance-tint" aria-hidden="true"
            style={{ background: `linear-gradient(180deg, ${data.flares[0]} 0%, transparent 32%, transparent 68%, ${data.flares[1] ?? data.flares[0]} 100%)` }} />
        )}
        {useCanvas && <canvas ref={cv} className="el-entrance-media" aria-hidden="true" />}
        {(useClip || useCanvas) && (
          <div className="el-entrance-words">
            <div className="el-entrance-plate">
              <div className="el-entrance-title el-foil-text" style={{ fontSize: 28 }}>{data.title}</div>
              <div className="el-entrance-ground">{data.stadium}</div>
            </div>
          </div>
        )}
        <div className="el-entrance-skip">לחיצה מדלגת</div>
      </div>
    </Portal>
  );
}
