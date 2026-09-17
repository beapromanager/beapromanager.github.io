import { useEffect, useRef } from 'react';
import type { LiveState, Side } from '../../game/liveMatch.ts';
import type { Club } from '../../data/clubs.ts';
import { formation, fillFormation } from '../../data/formations.ts';
import { matchKits } from '../../data/kits.ts';
import { PitchSim } from '../../game/pitchSim.ts';
import type { PitchSlot } from '../../game/pitchSim.ts';

/**
 * The live 2D pitch.
 *
 * All the football lives in game/pitchSim.ts, which is plain data in and plain
 * data out so it can be driven ninety minutes at a time from a Node harness
 * (scripts/pitch-check.mts). This file only wires it to the match.
 *
 * The pitch LEADS. It is handed one move at a time through `play` and reports
 * back through `onPlayed` on the frame the ball arrives; only then does the
 * screen around it move the score and print the line. It used to be the other
 * way round, reading the event list itself after the engine had already flipped
 * the scoreboard, so the banner said GOAL while the ball was still on halfway.
 *
 * Positions are written straight to the DOM, so a 60fps pitch costs no React
 * renders.
 */

/** how many ghosts follow the ball */
const TRAIL = 7;

const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export interface PitchPlay { id: number; home: boolean; scored: boolean }

export function LivePitch({ st, home, away, myId, play = null, onPlayed }: {
  st: LiveState; home: Club; away: Club; myId: string;
  /** the move the pitch should act out next, or null when there is nothing on */
  play?: PitchPlay | null;
  /** called on the frame the ball arrives, with the id of the move that ended */
  onPlayed?: (id: number, scored: boolean) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLSpanElement>());
  const ballEl = useRef<HTMLSpanElement>(null);
  const netEl = useRef<HTMLDivElement>(null);
  const trailEls = useRef<HTMLSpanElement[]>([]);
  const stRef = useRef(st); stRef.current = st;

  // home wears home, away changes if the two would clash, so no green on green
  const kits = matchKits(home, away);
  const fHome = formation(st.home.tactic.formation);
  const fAway = formation(st.away.tactic.formation);
  // the manager's eleven are drawn in the shirts he handed out; the AI is seated by fit
  const seat = (s: typeof st.home, f: typeof fHome) => (s.isPlayer ? s.onPitch : fillFormation(s.onPitch, f));
  const slots: PitchSlot[] = [
    ...seat(st.home, fHome).map((p, i) => ({ id: `h${p.id}`, home: true, i, fm: fHome })),
    ...seat(st.away, fAway).map((p, i) => ({ id: `a${p.id}`, home: false, i, fm: fAway })),
  ];
  const slotsRef = useRef(slots); slotsRef.current = slots;
  const playRef = useRef(play); playRef.current = play;
  const playedRef = useRef(onPlayed); playedRef.current = onPlayed;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;

    const box = { w: el.clientWidth, h: el.clientHeight };
    const ro = new ResizeObserver(() => { box.w = el.clientWidth; box.h = el.clientHeight; });
    ro.observe(el);

    const sim = new PitchSim();
    sim.setSlots(slotsRef.current);

    // which move is on the pitch right now, so one instruction is acted on once
    let onPitch: number | null = null;
    let netFlash = 0;
    let netRight = true;
    const trail: { x: number; y: number }[] = [];

    sim.onPlayed = scored => {
      const id = onPitch; onPitch = null;
      if (scored) { netFlash = 0.9; netRight = sim.B.x > 0.5; }
      if (id !== null) playedRef.current?.(id, scored);
    };

    let raf = 0;
    let stopFallback: (() => void) | null = null;
    let last = performance.now();

    const write = (n: HTMLElement, x: number, y: number, size: number) => {
      n.style.transform = `translate3d(${x * box.w - size / 2}px, ${y * box.h - size / 2}px, 0)`;
    };

    const frame = (now: number) => {
      const s = stRef.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const off = s.phase === 'halftime' || s.phase === 'done';

      sim.setSlots(slotsRef.current);

      // if the pitch is mid move it refuses, and we simply ask again next frame
      const want = playRef.current;
      if (want && want.id !== onPitch && sim.event(want.home, want.scored)) onPitch = want.id;

      const all = sim.step(dt, t, s.possession, off);

      for (const { sl, p } of all) {
        const node = nodes.current.get(sl.id);
        if (node) {
          const me = (sl.home ? s.home : s.away).id === myId;
          write(node, p.x, p.y, me ? 13 : 11);
        }
      }
      if (ballEl.current) write(ballEl.current, sim.B.x, sim.B.y, 9);

      // A short comet behind the ball. Six spans, and it is the single thing
      // that turns a sliding dot into a struck football.
      trail.unshift({ x: sim.B.x, y: sim.B.y });
      if (trail.length > TRAIL) trail.length = TRAIL;
      for (let i = 0; i < trailEls.current.length; i++) {
        const n = trailEls.current[i], q = trail[i + 1];
        if (!n) continue;
        if (!q || off) { n.style.opacity = '0'; continue; }
        const size = Math.max(2, 8 - i * 0.9);
        n.style.opacity = String((1 - i / TRAIL) * 0.45);
        n.style.width = n.style.height = `${size}px`;
        write(n, q.x, q.y, size);
      }

      // and the net, when one actually goes in
      const g = netEl.current;
      if (g) {
        if (netFlash > 0) {
          netFlash = Math.max(0, netFlash - dt);
          g.style.opacity = String(Math.min(1, netFlash / 0.35));
          g.style.left = netRight ? 'auto' : '0';
          g.style.right = netRight ? '0' : 'auto';
        } else if (g.style.opacity !== '0') g.style.opacity = '0';
      }

      raf = requestAnimationFrame(frame);
    };

    if (reduceMotion) {
      // Nothing animates, so nothing can report back. Release whatever is handed
      // in, otherwise the scoreboard waits on a frame that never comes.
      const rel = window.setInterval(() => {
        const w = playRef.current;
        if (w && w.id !== onPitch) { onPitch = w.id; playedRef.current?.(w.id, w.scored); }
      }, 150);
      stopFallback = () => window.clearInterval(rel);
      for (const sl of slotsRef.current) {
        const node = nodes.current.get(sl.id);
        const slot = sl.fm.slots[sl.i] ?? sl.fm.slots[sl.fm.slots.length - 1];
        if (node) write(node, sl.home ? 0.06 + slot.d * 0.4 : 0.94 - slot.d * 0.4, 0.09 + slot.y * 0.82, 11);
      }
      if (ballEl.current) write(ballEl.current, 0.5, 0.5, 9);
    } else {
      raf = requestAnimationFrame(frame);
    }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); stopFallback?.(); };
  }, [myId]);

  return (
    <div ref={wrap} role="img" aria-label="מפת המגרש החי" style={{
      position: 'relative', width: '100%', aspectRatio: '100 / 62', borderRadius: 'var(--r-md)',
      overflow: 'hidden', border: '1px solid rgba(255,255,255,.09)',
      background: 'repeating-linear-gradient(90deg, #1f7a43 0 10%, #1b6e3c 10% 20%)',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,.4)',
    }}>
      <svg viewBox="0 0 100 62" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
        <g fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="0.4">
          <rect x="2" y="2" width="96" height="58" />
          <line x1="50" y1="2" x2="50" y2="60" />
          <circle cx="50" cy="31" r="8.5" />
          <circle cx="50" cy="31" r="0.7" fill="rgba(255,255,255,.28)" stroke="none" />
          <rect x="2" y="16" width="13" height="30" />
          <rect x="85" y="16" width="13" height="30" />
          <rect x="2" y="24" width="5" height="14" />
          <rect x="93" y="24" width="5" height="14" />
        </g>
        <rect x="0.4" y="27" width="1.6" height="8" fill="rgba(255,255,255,.5)" />
        <rect x="98" y="27" width="1.6" height="8" fill="rgba(255,255,255,.5)" />
      </svg>

      {/* the goal that just went in, lit on the side the ball is on */}
      <div ref={netEl} aria-hidden="true" style={{
        position: 'absolute', top: '38%', bottom: '38%', width: '8%', right: 0,
        background: 'linear-gradient(90deg,rgba(255,255,255,.95),rgba(255,255,255,.1))',
        opacity: 0, zIndex: 1, pointerEvents: 'none', filter: 'blur(2px)',
      }} />

      {Array.from({ length: TRAIL - 1 }, (_, i) => (
        <span key={`t${i}`} aria-hidden="true"
          ref={n => { if (n) trailEls.current[i] = n; }}
          style={{
            position: 'absolute', left: 0, top: 0, width: 7, height: 7, borderRadius: '50%',
            background: '#fff', opacity: 0, willChange: 'transform,opacity', zIndex: 2,
          }} />
      ))}

      {slots.map(sl => {
        const side: Side = sl.home ? st.home : st.away;
        const kit = sl.home ? kits.home : kits.away;
        const me = side.id === myId;
        return (
          <span key={sl.id} ref={n => { if (n) nodes.current.set(sl.id, n); else nodes.current.delete(sl.id); }}
            aria-hidden="true" style={{
              position: 'absolute', left: 0, top: 0,
              width: me ? 13 : 11, height: me ? 13 : 11, borderRadius: '50%',
              background: kit.shirt, border: `1.5px solid ${me ? '#fff' : kit.trim}`,
              boxShadow: me ? '0 0 7px rgba(255,255,255,.5)' : '0 1px 3px rgba(0,0,0,.5)',
              willChange: 'transform', zIndex: 3,
            }} />
        );
      })}

      <span ref={ballEl} aria-hidden="true" style={{
        position: 'absolute', left: 0, top: 0, width: 9, height: 9, borderRadius: '50%',
        background: '#fff', border: '1px solid rgba(0,0,0,.55)',
        boxShadow: '0 0 8px rgba(255,255,255,.8)', willChange: 'transform', zIndex: 4,
      }} />
    </div>
  );
}
