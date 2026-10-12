import { useEffect, useRef, useState } from 'react';
import * as G from '../../game/state.ts';
import { DAILY_WEEK, GOLD_EVERY, GOLD_LIFT, rewardFor } from '../../game/daily.ts';
import type { DailyReward } from '../../game/daily.ts';
import { Icon } from '../components/Icon.tsx';
import { Gem } from '../components/Gem.tsx';
import { Portal } from '../components/Portal.tsx';

/**
 * The daily gift (Itzik, 12.10): a table of seven, today's gift lit and pressable, the rest grey and dead, the ones
 * already taken ticked. Press today's and the club's president hands it over in a celebration. Tomorrow the tick
 * is on today's and the next one is lit. Only the day's own gift is a button at all; the others are not elements
 * that take a press, and the engine refuses anything that is not today's besides.
 */

const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** 20000 -> "20K", 1500 -> "1.5K" */
export function moneyShort(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* ---------------------------------------------------------------- the hub card */

export function DailyHubCard({ gs, onOpen }: { gs: G.GameState; onOpen: () => void }) {
  const v = G.dailyViewOf(gs);
  const lit = v.canClaim;
  const line = lit ? 'המתנה של היום מחכה לך'
    : v.claimedToday ? `נלקחה. מחר ${v.todayPos >= DAILY_WEEK ? 'מתחילים שבוע חדש' : 'יום ' + (v.todayPos + 1)}`
    : 'שחק מחזור והמתנה של היום נפתחת';
  return (
    <button className="daily-card" data-lit={lit ? '1' : '0'} onClick={onOpen}>
      <span className="daily-card-ico"><Icon name="star" size={22} color={lit ? '#1B1305' : 'var(--gold)'} /></span>
      <span style={{ flex: 1, textAlign: 'start', minWidth: 0 }}>
        <span className="daily-card-t">המתנה היומית</span>
        <span className="daily-card-s">{line}</span>
      </span>
      <span className="daily-card-day">
        יום <span className="num" dir="ltr">{v.todayPos}/{DAILY_WEEK}</span>
      </span>
    </button>
  );
}

/* --------------------------------------------------------------- the table */

function Glyph({ r, size = 22 }: { r: DailyReward; size?: number }) {
  return (
    <span className="daily-glyphs">
      {r.pack && <span className="daily-pack"><Icon name="star" size={size - 4} color="#1B1305" /></span>}
      {r.money > 0 && !r.pack && <Icon name="coins" size={size} color="var(--gold-hi)" />}
      {r.gems > 0 && <span className="daily-gemstack">{Array.from({ length: r.gems }, (_, i) => <Gem key={i} size={size - 2} />)}</span>}
    </span>
  );
}

/** what a gift says about itself, one thing a line, so no mix of Hebrew and numbers has to be ordered by the browser */
function Lines({ r }: { r: DailyReward }) {
  return (
    <span className="daily-lab">
      {r.pack && <span>חבילת חיזוק</span>}
      {r.money > 0 && <span dir="ltr">+₪{moneyShort(r.money)}</span>}
      {r.gems > 0 && <span>{r.gems === 1 ? 'יהלום' : `${r.gems} יהלומים`}</span>}
    </span>
  );
}

export function DailyGiftSheet({ gs, onClaim, onClose }: {
  gs: G.GameState;
  onClaim: () => void;
  onClose: () => void;
}) {
  const v = G.dailyViewOf(gs);
  const tier = G.club(gs).tier;
  const days = Array.from({ length: DAILY_WEEK }, (_, i) => i + 1);
  const toGold = v.goldIn;
  const shown = v.claimedToday ? gs.daily.streak : v.nextStreak - 1;   // days of the run already in the bank
  const goldPct = Math.min(100, ((shown % GOLD_EVERY) / GOLD_EVERY) * 100);
  const [lit, setLit] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setLit(true), 60); return () => clearTimeout(t); }, []);

  const stateOf = (pos: number): 'taken' | 'today' | 'later' =>
    pos <= v.claimedUpTo ? 'taken' : pos === v.todayPos && !v.claimedToday ? 'today' : 'later';

  return (
    <Portal>
      <div className="daily-scrim" role="dialog" aria-modal="true" aria-label="המתנה היומית" data-lit={lit ? '1' : '0'}>
        <div className="daily-glow" aria-hidden="true" />
        <div className="daily-wrap">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="daily-title">המתנה היומית</h1>
              <p className="daily-sub">מנשיא המועדון, על כל יום שאתה מגיע ומשחק</p>
            </div>
            <button className="daily-x" onClick={onClose} aria-label="סגור">✕</button>
          </div>

          <div className="daily-streak" data-broken={v.broken ? '1' : '0'}>
            <Icon name="flame" size={18} color={v.broken ? 'var(--loss)' : 'var(--gold)'} />
            {v.broken
              ? <span>הרצף נשבר. מתחילים שוב מיום 1</span>
              : v.streak > 0
                ? <span>רצף של <b className="num">{v.streak}</b> {v.streak === 1 ? 'יום' : 'ימים'}</span>
                : <span>היום מתחיל הרצף שלך</span>}
          </div>

          <div className="daily-grid">
            {days.map(pos => {
              const st = stateOf(pos);
              const r = rewardFor(tier, pos);
              const body = (
                <>
                  <span className="daily-day">יום <span className="num">{pos}</span></span>
                  <Glyph r={r} size={pos === DAILY_WEEK ? 30 : 24} />
                  <Lines r={r} />
                  {st === 'taken' && <span className="daily-tick" aria-label="נלקח">✓</span>}
                  {st === 'today' && !v.canClaim && <span className="daily-lock">שחק מחזור</span>}
                  {st === 'today' && v.canClaim && <span className="daily-tap">לחץ</span>}
                </>
              );
              // only today's own gift is ever a button; the others do not take a press
              return st === 'today' ? (
                <button key={pos} className="daily-tile" data-state="today" data-wide={pos === DAILY_WEEK ? '1' : '0'}
                  data-ready={v.canClaim ? '1' : '0'} onClick={v.canClaim ? onClaim : undefined} aria-disabled={!v.canClaim}>
                  {body}
                </button>
              ) : (
                <div key={pos} className="daily-tile" data-state={st} data-wide={pos === DAILY_WEEK ? '1' : '0'} aria-disabled="true">
                  {body}
                </div>
              );
            })}
          </div>

          <div className="daily-gold">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="daily-gold-t"><Icon name="trophy" size={16} color="var(--gold)" /> <b className="num">{GOLD_EVERY}</b> ימים ברצף, בלי להחמיץ אחד</span>
              <span className="daily-gold-n num" dir="ltr">{shown % GOLD_EVERY}/{GOLD_EVERY}</span>
            </div>
            <div className="daily-bar"><span style={{ width: `${goldPct}%` }} /></div>
            <div className="daily-gold-s">
              {toGold === 0 ? 'שחקן זהב מחכה לך היום' : `עוד ${toGold} ${toGold === 1 ? 'יום' : 'ימים'} לשחקן זהב, ${GOLD_LIFT} נקודות מעל הליגה שלך`}
            </div>
          </div>

          <div className="spacer" />
          {v.canClaim ? (
            <button className="btn daily-cta" onClick={onClaim}><Icon name="star" size={19} /> קח את המתנה של היום</button>
          ) : v.claimedToday ? (
            <button className="btn dark" disabled style={{ opacity: .7 }}>נלקחה. מחר מחכה לך עוד אחת</button>
          ) : (
            <button className="btn dark" onClick={onClose}><Icon name="whistle" size={18} /> שחק מחזור כדי לפתוח</button>
          )}
        </div>
      </div>
    </Portal>
  );
}

/* --------------------------------------------------------------- the WOW */

interface Bit { x: number; y: number; w: number; h: number; vx: number; vy: number; rot: number; vr: number; c: string }
const GOLDS = ['#e9b949', '#f4d06f', '#ffffff', '#c99a2e', '#fff3cf'];

/** the moment of taking it: gold rain, a flash, the gift popping out of a ring, the sum counting up */
export function DailyClaim({ reward, streak, gold, onDone }: {
  reward: DailyReward; streak: number; gold: boolean; onDone: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState(false);
  const [sum, setSum] = useState(0);
  const [ready, setReady] = useState(false);
  const done = useRef(false);
  const finish = () => { if (ready && !done.current) { done.current = true; onDone(); } };

  useEffect(() => {
    const t = window.setTimeout(() => setOn(true), 40);
    const r = window.setTimeout(() => setReady(true), 1300);
    try { navigator.vibrate?.([18, 40, 28]); } catch { /* a phone without it */ }
    return () => { clearTimeout(t); clearTimeout(r); };
  }, []);

  // the sum counts up to what is in the purse
  useEffect(() => {
    if (reward.money <= 0) return;
    if (reduceMotion) { setSum(reward.money); return; }
    const t0 = performance.now(); let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0 - 350) / 900);
      setSum(Math.round(reward.money * (k <= 0 ? 0 : 1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reward.money]);

  // the rain
  useEffect(() => {
    if (reduceMotion) return;
    const cv = canvas.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const fit = () => { cv.width = cv.clientWidth; cv.height = cv.clientHeight; };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(cv);
    const N = gold ? 190 : 130;
    const bits: Bit[] = Array.from({ length: N }, () => ({
      x: Math.random() * cv.width, y: Math.random() * -cv.height,
      w: 5 + Math.random() * 6, h: 8 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 40, vy: 70 + Math.random() * 140,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 7,
      c: GOLDS[Math.floor(Math.random() * GOLDS.length)],
    }));
    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const b of bits) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
        if (b.y > cv.height + 20) { b.y = -20; b.x = Math.random() * cv.width; }
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [gold]);

  const what: string[] = [];
  if (reward.gems > 0) what.push(reward.gems === 1 ? 'יהלום אחד' : `${reward.gems} יהלומים`);
  if (reward.pack && !gold) what.push('חבילת חיזוק');
  if (gold) what.push('שחקן זהב');

  return (
    <Portal>
      <div className="dwow" data-on={on ? '1' : '0'} onClick={finish} role="button" aria-label="קיבלת מתנה, הקש להמשך">
        <div className="dwow-flash" aria-hidden="true" />
        <canvas ref={canvas} className="dwow-rain" aria-hidden="true" />
        <div className="dwow-center">
          <div className="dwow-chip">יום <span className="num">{streak}</span> ברצף</div>
          <div className="dwow-ring" aria-hidden="true">
            <span className="dwow-ring-in">
              {gold ? <Icon name="trophy" size={64} color="#1B1305" />
                : reward.pack ? <Icon name="star" size={64} color="#1B1305" />
                : reward.money > 0 ? <Icon name="coins" size={64} color="#1B1305" /> : <Gem size={64} />}
            </span>
          </div>
          <div className="dwow-big">{gold ? 'שחקן זהב!' : reward.pack ? 'חבילה מהנשיא!' : 'מתנה מהנשיא!'}</div>
          {reward.money > 0 && <div className="dwow-sum num">+₪{sum.toLocaleString('en-US')}</div>}
          {what.length > 0 && <div className="dwow-what">{what.map((w, i) => <span key={i} className="dwow-pill">{w}</span>)}</div>}
          <div className="dwow-go" style={{ opacity: ready ? 1 : 0 }}>הקש להמשך ‹</div>
        </div>
      </div>
    </Portal>
  );
}
