import { useEffect, useRef, useState } from 'react';
import { useSummitAsset } from '../summitAsset.ts';
import { buzz } from '../haptics.ts';
import { Portal } from './Portal.tsx';
import { ShareMoment } from './ShareMoment.tsx';

/**
 * The summit won (R5). The trophy rises among fireworks and the camera turns around it (Itzik's clip,
 * trophy/ceremony.mp4, five to six seconds), then "אלופי אירופה" in foil, the season under it, and the share.
 * It plays once: a tap during the rise jumps to the end, a tap at the end (or the button) closes it.
 * Without the clip the same rise is drawn: a gold cup on SVG lifting and turning, fireworks and foil confetti on a
 * canvas. Under reduced motion the cup and the title are simply there. The phone buzzes once, the summit's own
 * pattern, through the same buzz every other moment uses.
 */
export const CEREMONY_MS = 5600;
export const BUZZ_TROPHY = [60, 80, 60, 80, 200];
/** foil confetti: 150 pieces, 90 on a phone that looks weak */
export const CONFETTI_FULL = 150;
export const CONFETTI_LIGHT = 90;

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const weak = () => {
  const n = navigator as Navigator & { deviceMemory?: number };
  return (n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 2;
};

export const confettiCount = (isWeak: boolean): number => (isWeak ? CONFETTI_LIGHT : CONFETTI_FULL);

function foil(): string[] {
  const cs = getComputedStyle(document.documentElement);
  return ['--el-g1', '--el-g2', '--el-g3', '--el-g4', '--el-ink'].map(n => cs.getPropertyValue(n).trim());
}

function sky(cv: HTMLCanvasElement, fireworks: boolean): () => void {
  const ctx = cv.getContext('2d');
  if (!ctx) return () => {};
  const fit = () => { cv.width = cv.clientWidth; cv.height = cv.clientHeight; };
  fit();
  const pal = foil();
  const bits = Array.from({ length: confettiCount(weak()) }, () => ({
    x: Math.random() * cv.width, y: Math.random() * -cv.height,
    w: 4 + Math.random() * 6, h: 7 + Math.random() * 8,
    vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 110,
    rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 6, c: pal[Math.floor(Math.random() * pal.length)],
  }));
  const bursts: { x: number; y: number; t: number; c: string }[] = [];
  let raf = 0, last = performance.now(), next = 300;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (fireworks) {
      next -= dt * 1000;
      if (next <= 0) { bursts.push({ x: cv.width * (0.2 + Math.random() * 0.6), y: cv.height * (0.12 + Math.random() * 0.3), t: 0, c: pal[Math.floor(Math.random() * pal.length)] }); next = 450 + Math.random() * 400; }
      for (const b of bursts) {
        b.t += dt;
        const r = b.t * 140, a = Math.max(0, 1 - b.t / 1.2);
        ctx.globalAlpha = a; ctx.fillStyle = b.c;
        for (let k = 0; k < 18; k++) {
          const ang = (k / 18) * Math.PI * 2;
          ctx.beginPath(); ctx.arc(b.x + Math.cos(ang) * r, b.y + Math.sin(ang) * r + b.t * b.t * 30, 2.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      while (bursts.length && bursts[0].t > 1.2) bursts.shift();
      ctx.globalAlpha = 1;
    }
    for (const b of bits) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
      if (b.y > cv.height + 20) { b.y = -20; b.x = Math.random() * cv.width; }
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
      ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const ro = new ResizeObserver(fit); ro.observe(cv);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); };
}

/** The cup, drawn: the gradients are the summit's own (EliteDefs), no colour of its own. */
function Cup() {
  return (
    <svg viewBox="0 0 120 150" width="150" height="188" aria-hidden="true">
      <path d="M30 14h60v28c0 22-13 38-30 40-17-2-30-18-30-40z" fill="url(#el-gold)" stroke="var(--el-g4)" strokeWidth="1.5" />
      <path d="M30 22H14c0 18 8 28 20 30M90 22h16c0 18-8 28-20 30" fill="none" stroke="url(#el-gold)" strokeWidth="6" strokeLinecap="round" />
      <path d="M54 82h12v22H54z" fill="url(#el-gold)" />
      <path d="M38 104h44l6 14H32z" fill="url(#el-gold)" stroke="var(--el-g1)" strokeWidth="1" />
      <rect x="28" y="118" width="64" height="18" rx="3" fill="var(--el-bg3)" stroke="url(#el-gold)" strokeWidth="2" />
      <path d="M42 24c-2 12 2 26 10 32" fill="none" stroke="var(--el-shine)" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function TrophyCeremony({ season, share, onDone }: { season: number; share?: { text: string; link: string } | null; onDone: () => void }) {
  const still = reduced();
  const clip = useSummitAsset('trophy/ceremony');
  const [broken, setBroken] = useState(false);
  const [atEnd, setAtEnd] = useState(still);
  const cv = useRef<HTMLCanvasElement>(null);
  const buzzed = useRef(false);
  const useClip = clip.ready && !broken && !still;
  const drawn = (clip.failed || broken) && !still;

  useEffect(() => {
    if (!buzzed.current) { buzzed.current = true; buzz(BUZZ_TROPHY); }
  }, []);
  useEffect(() => {
    if (atEnd) return;
    const t = window.setTimeout(() => setAtEnd(true), CEREMONY_MS);
    return () => window.clearTimeout(t);
  }, [atEnd]);
  useEffect(() => {
    if (still || !cv.current) return;
    return sky(cv.current, drawn || atEnd);
  }, [still, drawn, atEnd]);

  return (
    <Portal>
      <div className="el-ceremony" data-summit="1" data-end={atEnd ? '1' : '0'} data-testid="trophy-ceremony" role="button" aria-label="טקס הגביע, הקש להמשך"
        onClick={() => (atEnd ? onDone() : setAtEnd(true))}>
        {useClip && !atEnd && (
          <video className="el-ceremony-media" src={clip.src ?? undefined} poster={clip.poster ?? undefined} autoPlay muted playsInline
            onEnded={() => setAtEnd(true)} onError={() => setBroken(true)} />
        )}
        {(drawn || still || atEnd) && (
          <div className="el-ceremony-cup" data-rise={still || atEnd ? '0' : '1'}><Cup /></div>
        )}
        <canvas ref={cv} className="el-ceremony-sky" aria-hidden="true" />
        {atEnd && (
          <div className="el-ceremony-words" onClick={e => e.stopPropagation()}>
            <div className="el-title el-foil-text" style={{ fontSize: 40 }}>אלופי אירופה</div>
            <div className="el-ceremony-sub">פסגת אירופה · עונה <span className="num">{season}</span></div>
            <div className="row" style={{ gap: 10, justifyContent: 'center', marginTop: 18 }}>
              {share && <ShareMoment text={share.text} link={share.link} />}
              <button className="btn dark" onClick={onDone}>המשך</button>
            </div>
          </div>
        )}
      </div>
    </Portal>
  );
}
