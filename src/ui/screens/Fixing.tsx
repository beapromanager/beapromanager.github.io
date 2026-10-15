import { useEffect, useMemo, useRef, useState } from 'react';
import * as G from '../../game/state.ts';
import { overall } from '../../engine/matchEngine.ts';
import { Meters, formatMoney } from '../components/bits.tsx';
import { Icon } from '../components/Icon.tsx';
import { Crest } from '../components/Crest.tsx';
import { asset } from '../asset.ts';
import { FIX_SITUATIONS, FIX_MATCH_LINES, FIX_SUSPENSE, FIX_CAUGHT_TEXT, FIX_CLEAR_TEXT, FIX_CLIPS } from '../../data/fixingText.ts';

/**
 * "The owner asks to sell a match" (Itzik, 14.10). Three screens, one event:
 *  1. the request: a picture of the place and the owner's whisper, two answers;
 *  2. the match, played for him: the minutes run, the commentary shows how a team loses on purpose;
 *  3. the verdict: the wait, the envelope, and either a knock on the door or the money.
 * It is a cautionary choice and never dressed up as a reward.
 */

const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* a phone that will not */ } };
const slots = (t: string, s: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => s[k] ?? '');

const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

/* ------------------------------------------- 0. the owner meets someone (five seconds, before the request) */

const INTRO_MS = 5000;
const THOUGHT_AT = 3200;

function FixIntro({ n, onEnd }: { n: number; onEnd: () => void }) {
  const c = FIX_CLIPS[n];
  const [thought, setThought] = useState(false);
  useEffect(() => {
    const a = window.setTimeout(() => setThought(true), THOUGHT_AT);
    const b = window.setTimeout(onEnd, INTRO_MS);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [onEnd]);
  const name = `/fix/meet0${n + 1}`;
  return (
    <div className="fx-intro" onClick={onEnd}>
      <video className="fx-intro-vid" src={asset(`${name}.mp4`)} poster={asset(`${name}.webp`)} autoPlay muted playsInline preload="auto" aria-hidden="true" />
      <span className="fx-intro-shade" aria-hidden="true" />
      <div className="fx-intro-copy">
        <span className="fx-kick">הבעלים בדרך</span>
        <p className="fx-intro-title">{c.title}</p>
        {thought && <p className="fx-intro-thought">{c.thought}</p>}
      </div>
      <span className="fx-intro-bar" aria-hidden="true"><i style={{ animationDuration: `${INTRO_MS}ms` }} /></span>
      <button className="fx-intro-skip" onClick={e => { e.stopPropagation(); onEnd(); }}>דלג</button>
    </div>
  );
}

/* ---------------------------------------------------------------- 1. the request */

export function FixOfferScreen({ gs, onChoose, onContinue }: {
  gs: G.GameState; onChoose: (i: number) => void; onContinue: () => void;
}) {
  const d = gs.dilemma;
  if (!d || !d.image) return null;
  const answered = gs.pendingOutcome != null;
  const sit = FIX_SITUATIONS.find(s => s.id === d.id);
  // a clip of the owner meeting someone comes first, once, and never twice in a row: it moves on with every request
  const clip = (gs.fixLog.seen.length + gs.seasonSeed) % FIX_CLIPS.length;
  const [intro, setIntro] = useState(!answered && !reducedMotion());
  if (intro) return <FixIntro n={clip} onEnd={() => setIntro(false)} />;
  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="fx-offer">
        <div className="fx-hero">
          <img src={asset(d.image)} alt="" />
          <span className="fx-hero-shade" aria-hidden="true" />
          <div className="fx-hero-copy">
            <span className="fx-kick">הבעלים רוצה אותך לשנייה</span>
            <h1 className="fx-title">{sit?.title ?? ''}</h1>
            {d.tag && <span className="fx-tag">{d.tag}</span>}
          </div>
        </div>

        <div className="fx-body stack">
          <div className="fx-quote">
            <div className="fx-who">הבעלים</div>
            {d.text}
          </div>

          {!answered && (
            <div className="stack" style={{ gap: 10 }}>
              <button className="btn fx-yes" onClick={() => onChoose(0)}>{d.options[0].label}</button>
              <button className="btn dark" onClick={() => onChoose(1)}>{d.options[1].label}</button>
              <p className="hint" style={{ textAlign: 'center', margin: 0 }}>זאת שאלה אחת, ואין דרך חזרה ממנה.</p>
            </div>
          )}

          {answered && (
            <>
              <div className="fx-reply">{gs.pendingOutcome}</div>
              <button className="btn" onClick={onContinue}>הלאה לטקטיקה <Icon name="chevron" size={17} /></button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- 2. the match he sold */

export function FixedMatchScreen({ gs, onDone }: { gs: G.GameState; onDone: (r: ReturnType<typeof G.fixedMatchResult>) => void }) {
  const result = useMemo(() => G.fixedMatchResult(gs), []);   // eslint-disable-line react-hooks/exhaustive-deps
  const fx = G.playerFixture(gs)!;
  const home = gs.league.clubs.find(c => c.id === fx.homeId)!;
  const away = gs.league.clubs.find(c => c.id === fx.awayId)!;
  const sit = FIX_SITUATIONS.find(s => s.id === gs.fix?.id);
  const star = useMemo(() => {
    const sq = G.mySquad(gs);
    const best = [...sq.starters].sort((a, b) => overall(b) - overall(a))[0];
    return best ? best.name.split(' ').slice(-1)[0] : 'החלוץ';
  }, [gs]);
  const goals = useMemo(() => result.events.filter(e => e.type === 'goal' || e.type === 'penalty_goal').map(e => ({ minute: e.minute, home: e.teamId === fx.homeId })), [result, fx.homeId]);
  const lines = useMemo(() => {
    // six lines, a different set every time, in a stable order for this save
    const pool = [...FIX_MATCH_LINES];
    let h = (gs.seasonSeed + gs.week * 31) >>> 0;
    const out: string[] = [];
    while (out.length < 6 && pool.length) { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; out.push(pool.splice(h % pool.length, 1)[0]); }
    return out;
  }, [gs.seasonSeed, gs.week]);
  const stops = [7, 21, 36, 52, 66, 80];

  const [minute, setMinute] = useState(0);
  const done = minute >= 90;
  const tick = useRef<number | null>(null);
  useEffect(() => {
    tick.current = window.setInterval(() => setMinute(m => Math.min(90, m + 1)), 110);
    return () => { if (tick.current) window.clearInterval(tick.current); };
  }, []);
  useEffect(() => { if (done && tick.current) { window.clearInterval(tick.current); buzz([30, 60, 30]); } }, [done]);

  const score = (isHome: boolean) => goals.filter(g => g.home === isHome && g.minute <= minute).length;
  const shown = stops.map((m, i) => (minute >= m ? lines[i] : null)).filter((x): x is string => !!x).slice(-3);

  return (
    <div className="fx-match">
      {sit && <img className="fx-match-bg" src={asset(sit.image)} alt="" aria-hidden="true" />}
      <span className="fx-match-shade" aria-hidden="true" />
      <div className="fx-match-front stack">
        <div className="fx-kick" style={{ textAlign: 'center' }}>המשחק שמכרת</div>
        <div className="fx-board">
          <div className="fx-side"><Crest club={home} size={44} /><span>{home.short}</span></div>
          <div className="fx-score num" dir="ltr">{score(true)} - {score(false)}</div>
          <div className="fx-side"><Crest club={away} size={44} /><span>{away.short}</span></div>
        </div>
        <div className="fx-clock num" dir="ltr">{minute}&apos;</div>
        <div className="fx-lines" aria-live="polite">
          {shown.map((l, i) => <div key={l} className="fx-line" style={{ ['--i' as string]: i }}>{slots(l, { star })}</div>)}
        </div>
        <div className="spacer" />
        {!done && <button className="btn dark btn-sm" onClick={() => setMinute(90)}>דלג לשריקה</button>}
        {done && (
          <>
            <div className="fx-final">שריקת הסיום</div>
            <button className="btn" onClick={() => onDone(result)}>להמשיך <Icon name="chevron" size={17} /></button>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 3. the verdict */

export function FixVerdictScreen({ gs, onResolve }: { gs: G.GameState; onResolve: () => void }) {
  const f = gs.fix;
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const total = FIX_SUSPENSE.length;
  useEffect(() => {
    if (open || step >= total) return;
    const t = window.setTimeout(() => { setStep(s => s + 1); buzz(40); }, 1500);
    return () => window.clearTimeout(t);
  }, [step, open, total]);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!open || !f || f.caught) return;
    let n = 0;
    const id = window.setInterval(() => { n += 1; setCount(Math.round((f.payout * Math.min(1, n / 40)))); if (n >= 40) window.clearInterval(id); }, 35);
    return () => window.clearInterval(id);
  }, [open, f]);
  if (!f) return null;

  const reveal = () => { setOpen(true); buzz(f.caught ? [200, 80, 200, 80, 400] : [60, 40, 60]); };
  const txt = f.caught ? FIX_CAUGHT_TEXT : FIX_CLEAR_TEXT;
  const body = f.caught ? txt.body : txt.body.replace('{sum}', formatMoney(f.payout));

  if (!open) {
    return (
      <div className="fx-verdict" data-state="wait">
        <img className="fx-verdict-bg" src={asset('/fix/suspense.webp')} alt="" aria-hidden="true" />
        <span className="fx-verdict-shade" aria-hidden="true" />
        <div className="fx-verdict-front stack">
          <div className="fx-kick" style={{ textAlign: 'center' }}>אחרי הצפירה</div>
          <div className="fx-wait" aria-live="polite">
            {FIX_SUSPENSE.slice(0, step).map((l, i) => <p key={i} className="fx-wait-line" style={{ ['--i' as string]: 0 }}>{l}</p>)}
          </div>
          <div className="spacer" />
          {step >= total
            ? <button className="btn fx-yes" onClick={reveal}>פתח את המעטפה</button>
            : <div className="fx-beat" aria-hidden="true"><span /><span /><span /></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="fx-verdict" data-state={f.caught ? 'caught' : 'clear'}>
      <img className="fx-verdict-bg" src={asset(f.caught ? '/fix/caught.webp' : '/fix/clear.webp')} alt="" aria-hidden="true" />
      <span className="fx-verdict-shade" aria-hidden="true" />
      <span className="fx-flash" aria-hidden="true" />
      <div className="fx-verdict-front stack">
        <div className="fx-kick" style={{ textAlign: 'center' }}>{f.caught ? 'נתפסת' : 'לא נתפסת'}</div>
        <h1 className="fx-verdict-t">{txt.title}</h1>
        {!f.caught && <div className="fx-sum num" dir="ltr">+{formatMoney(count)}</div>}
        <div className="fx-letter">
          {body.split('\n').map((l, i) => <p key={i}>{l}</p>)}
        </div>
        <div className="fx-owner"><span>הבעלים</span>{txt.ownerLine}</div>
        <div className="spacer" />
        <button className="btn" onClick={onResolve}>{f.caught ? 'לצאת מהמשרד' : 'להמשיך'} <Icon name="chevron" size={17} /></button>
      </div>
    </div>
  );
}
