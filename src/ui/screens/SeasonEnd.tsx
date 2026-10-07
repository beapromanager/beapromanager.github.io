import { useEffect, useRef, useState } from 'react';
import { asset } from '../asset.ts';
import * as G from '../../game/state.ts';
import { sortedTable } from '../../game/state.ts';
import { TOP_TIER } from '../../game/career.ts';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';
import { formatMoney } from '../components/bits.tsx';
import { LEAGUE_NAMES } from '../../data/clubs.ts';
import { ROUND_IN } from '../../game/euro.ts';

/**
 * End of a season, which is now a milestone in a long climb rather than the end
 * of the game. It has to answer three things at a glance: where did we finish,
 * where are we going next, and what happened to the men who got us here.
 */
export function SeasonEnd({ gs, onContinue }: { gs: G.GameState; onContinue: () => void }) {
  const table = sortedTable(gs.league);
  const myPos = table.findIndex(s => s.clubId === gs.clubId) + 1;
  const teams = table.length;
  const c = G.club(gs);
  // a promotion earned on the pitch is denied when the ground is too small
  const gate = G.stadiumGate(gs);
  const wouldPromote = myPos <= 2 && c.tier < TOP_TIER;
  const blocked = wouldPromote && !!gate && !gate.meets;
  const champion = myPos === 1;
  const promoted = wouldPromote && !blocked;
  const relegated = myPos >= teams && c.tier > 1;
  const nextTier = Math.max(1, Math.min(TOP_TIER, c.tier + (promoted ? 1 : 0) - (relegated ? 1 : 0)));

  // Europe is promised only while its door is open for players; shut, the title is simply the title
  const europe = G.euroDoorOpen();
  const euroVerdict = G.euroSeasonVerdict(gs);
  const headline = blocked
    ? `${champion ? 'אלופים, אבל ה' : 'ה'}אצטדיון קטן מדי ל${LEAGUE_NAMES[gate!.nextTier]}. נשארים לעוד עונה.`
    : champion && c.tier >= TOP_TIER
      ? (europe ? 'אלופי המדינה. עכשיו הולכים על אירופה.' : 'אלופי המדינה.')
      : champion
        ? `אלופים. עולים ל${LEAGUE_NAMES[nextTier]} עם הכתר על הראש.`
        : promoted
          ? `עלייה ל${LEAGUE_NAMES[nextTier]}. משימת העונה הושלמה.`
          : relegated
            ? `ירידה ל${LEAGUE_NAMES[nextTier]}. עונה לשכוח.`
            : myPos <= 5
              ? 'עונה מכובדת. בשנה הבאה הולכים על העלייה.'
              : 'נשארנו בליגה. יש על מה לעבוד.';

  const accent = blocked ? 'var(--loss)' : champion ? 'var(--gold)' : promoted ? 'var(--win)' : relegated ? 'var(--loss)' : 'var(--ink-dim)';
  const fade = (pct: number) => `color-mix(in srgb, ${accent} ${pct}%, transparent)`;

  // the WOW: a trophy lift plays over the table, but only when there is
  // something to celebrate. A blocked promotion is not a party.
  const [celebrating, setCelebrating] = useState((champion || promoted) && !blocked);

  return (
    <div className="screen pad stack pad-b" style={{ gap: 13, minHeight: '100%' }}>
      <div className="stack" style={{ alignItems: 'center', gap: 8, marginTop: 18 }}>
        <div style={{
          width: 68, height: 68, borderRadius: 22, display: 'grid', placeItems: 'center',
          background: `radial-gradient(100% 100% at 50% 0%, ${fade(30)}, transparent 70%), var(--surface-2)`,
          border: `1px solid ${fade(40)}`, animation: 'pop .5s var(--ease-out)',
        }}>
          <Icon name={blocked ? 'alert' : champion ? 'trophy' : promoted ? 'star' : relegated ? 'alert' : 'flag'} size={32} color={accent} />
        </div>
        <h1 className="h1" style={{ marginTop: 4 }}>סוף עונה <span className="num">{gs.season}</span></h1>
        <p className="sub">{LEAGUE_NAMES[c.tier]} · {gs.profile.name}</p>
      </div>

      <div className="tile-hero" style={{ padding: 16, textAlign: 'center', borderColor: fade(40) }}>
        <div className="row" style={{ justifyContent: 'center', gap: 14 }}>
          <Crest club={c} size={46} />
          <div style={{ textAlign: 'start' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1, color: accent }}>
              מקום <span className="num">{myPos}</span>
            </div>
            <div className="sub" style={{ marginTop: 3 }}>{c.name}</div>
          </div>
        </div>
        <div style={{ marginTop: 11, fontWeight: 700, fontSize: 15.5 }}>{headline}</div>

        {nextTier !== c.tier && (
          <div className="row" style={{ justifyContent: 'center', gap: 9, marginTop: 12 }}>
            <span className="chip" style={{ background: 'rgba(255,255,255,.05)', color: 'var(--ink-dim)' }}>{LEAGUE_NAMES[c.tier]}</span>
            <Icon name="chevron" size={15} color={accent} />
            <span className="chip" style={{ background: fade(18), color: accent, border: `1px solid ${fade(40)}` }}>{LEAGUE_NAMES[nextTier]}</span>
          </div>
        )}
      </div>

      {euroVerdict && <EuroSeasonCard v={euroVerdict} />}

      <div className="label-cap">הטבלה הסופית</div>
      <div className="tile-flat" style={{ padding: 0, overflow: 'hidden' }}>
        {table.map((s, i) => {
          const club = gs.league.clubs.find(cl => cl.id === s.clubId)!;
          const me = s.clubId === gs.clubId;
          const up = i < 2 && c.tier < TOP_TIER;
          const down = i === table.length - 1 && c.tier > 1;
          return (
            <div key={s.clubId} className="row" style={{
              justifyContent: 'space-between', padding: '10px 13px',
              borderTop: i ? '1px solid var(--line)' : undefined,
              background: me ? 'rgba(233,185,73,.11)' : up ? 'rgba(47,169,107,.06)' : down ? 'rgba(226,72,77,.06)' : 'transparent',
              borderInlineStart: me ? '2px solid var(--gold)' : up ? '2px solid var(--win)' : down ? '2px solid var(--loss)' : '2px solid transparent',
            }}>
              <div className="row" style={{ gap: 10 }}>
                <b className="num" style={{ width: 18, color: 'var(--ink-faint)', fontSize: 14 }}>{i + 1}</b>
                <Crest club={club} size={24} />
                <span style={{ fontWeight: me ? 800 : 500, fontSize: 14.5 }}>{club.short}</span>
              </div>
              <b className="num" style={{ fontSize: 16 }}>{s.pts}</b>
            </div>
          );
        })}
      </div>

      <div className="spacer" />
      <button className="btn" onClick={onContinue}>
        לעונה <span className="num">{gs.season + 1}</span> <Icon name="chevron" size={17} />
      </button>
      <p className="hint" style={{ textAlign: 'center' }}>
        {blocked
          ? 'הרחב את האצטדיון עד לדרישת הליגה מעל, ובעונה הבאה העלייה שלך.'
          : c.tier < TOP_TIER ? 'שתי המקומות הראשונים עולים ליגה, האחרון יורד.' : europe ? 'בליגת העל רק מקום ראשון פותח את הדרך לאירופה.' : 'בליגת העל רק מקום ראשון הוא אליפות.'}
      </p>

      {celebrating && (
        <Celebration
          champion={champion} atTop={champion && c.tier >= TOP_TIER} europe={europe}
          tier={c.tier} nextTier={nextTier}
          onDone={() => setCelebrating(false)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------ the season in Europe */

/**
 * How the season in Europe went, in the night's own blue and silver, only for
 * a manager who was in it. It reads the verdict and writes nothing: the cup
 * was closed and chronicled when the last league round ended.
 */
function EuroSeasonCard({ v }: { v: NonNullable<ReturnType<typeof G.euroSeasonVerdict>> }) {
  const won = v.outcome === 'won';
  const legs = v.played === 1 ? 'משחק אחד' : `${v.played} משחקים`;
  const headline = won ? 'הגביע אצלנו' : v.outcome === 'cut' ? `העונה נגמרה ${ROUND_IN[v.round]}` : `הדרך נגמרה ${ROUND_IN[v.round]}`;
  return (
    <div className="tile-flat" style={{
      padding: '13px 15px', textAlign: 'center',
      background: 'linear-gradient(180deg,#0f1626,#070b14)', border: `1px solid ${won ? 'var(--gold)' : '#2b3a55'}`,
    }}>
      <div className="label-cap" style={{ color: '#7f93b4' }}>ליגת אירופה</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1.1, marginTop: 5, color: won ? 'var(--gold)' : '#CFE0FF' }}>{headline}</div>
      <div className="sub" style={{ marginTop: 6 }}>
        {legs}{v.prize > 0 ? ` · פרסים ${formatMoney(v.prize)}` : ''}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ the WOW */

/** Champion art by the stage the club is on, tier 1 as the safe fallback. */
function championImg(tier: number): string {
  const band = tier >= 6 ? 'tier3' : tier >= 5 ? 'tier2' : 'tier1';
  return asset(`/celebration/champion-${band}.webp`);
}

interface Confetti { x: number; y: number; w: number; h: number; vx: number; vy: number; rot: number; vr: number; c: string; }
const CONFETTI_COLORS = ['#e9b949', '#f4d06f', '#ffffff', '#c99a2e', '#fff3cf'];
const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * The trophy lift. A tier appropriate celebration photo pushes in under a rain
 * of gold confetti, a floodlight flash reveals the wordmark, and a tap drops it
 * to show the final table underneath. Same cinematic grammar as the cold open.
 */
export function Celebration({ champion, atTop, europe = true, tier, nextTier, onDone }: {
  champion: boolean; atTop: boolean; europe?: boolean; tier: number; nextTier: number; onDone: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [imgOk, setImgOk] = useState(true);
  const [shown, setShown] = useState(false);   // drives the push in and title
  const done = useRef(false);
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };

  const word = atTop ? 'אלופי המדינה' : champion ? 'אלופים' : 'עלייה';
  const sub = atTop ? (europe ? 'עכשיו הולכים על אירופה' : 'האליפות היא שלנו')
    : `עולים ל${LEAGUE_NAMES[nextTier]}`;

  // preload so the push in never starts on a blank frame
  useEffect(() => {
    const im = new Image();
    im.onload = () => setShown(true);
    im.onerror = () => { setImgOk(false); setShown(true); };
    im.src = championImg(tier);
  }, [tier]);

  // the confetti rain
  useEffect(() => {
    if (reduceMotion) return;
    const cv = canvas.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const fit = () => { cv.width = cv.clientWidth; cv.height = cv.clientHeight; };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(cv);

    const N = 150;
    const bits: Confetti[] = Array.from({ length: N }, () => ({
      x: Math.random() * cv.width,
      y: Math.random() * -cv.height,          // start above the top, rain in
      w: 5 + Math.random() * 6, h: 8 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 120,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 6,
      c: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }));

    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const b of bits) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
        if (b.y > cv.height + 20) { b.y = -20; b.x = Math.random() * cv.width; }
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        ctx.fillStyle = b.c;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <div onClick={finish} role="button" aria-label="חגיגת אליפות, הקש להמשך" style={{
      position: 'fixed', inset: 0, zIndex: 80, overflow: 'hidden', cursor: 'pointer',
      background: '#05070c',
    }}>
      {/* the photo, pushing in */}
      {imgOk && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url('${championImg(tier)}')`, backgroundSize: 'cover', backgroundPosition: 'center 30%',
          opacity: shown ? 1 : 0,
          transform: shown ? 'scale(1.12)' : 'scale(1.02)',
          transition: 'opacity .8s ease, transform 6s linear',
        }} />
      )}

      {/* grade, a gold wash and a vignette to seat the type */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 80% at 50% 12%, color-mix(in srgb, var(--gold) 22%, transparent), transparent 55%), linear-gradient(180deg, rgba(5,7,12,.35) 0%, transparent 30%, transparent 52%, rgba(5,7,12,.9) 100%)',
      }} />

      {/* the floodlight flash on entry */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen',
        background: 'radial-gradient(120% 90% at 50% 25%, #fff, #fff6e6 40%, transparent 72%)',
        opacity: shown ? 0 : 0.9, transition: 'opacity .6s ease-in .1s',
      }} />

      <canvas ref={canvas} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* cinemascope bars */}
      {[0, 1].map(b => (
        <div key={b} aria-hidden="true" style={{
          position: 'absolute', insetInline: 0, [b === 0 ? 'top' : 'bottom']: 0,
          height: shown ? '7%' : 0, background: '#000',
          transition: 'height .6s var(--ease-out)', pointerEvents: 'none',
        }} />
      ))}

      {/* the wordmark */}
      <div style={{
        position: 'absolute', insetInline: 0, bottom: '13%', textAlign: 'center', pointerEvents: 'none',
        opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(16px) scale(1.08)',
        transition: 'opacity .8s ease .35s, transform .8s var(--ease-out) .35s',
      }}>
        <div style={{ fontSize: 30, marginBottom: 6 }}>🏆</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(44px, 15vw, 72px)',
          color: '#fff', lineHeight: .9, letterSpacing: '-.02em',
          textShadow: '0 4px 34px rgba(0,0,0,.7), 0 0 40px color-mix(in srgb, var(--gold) 45%, transparent)',
        }}>{word}</div>
        <div style={{
          marginTop: 10, fontSize: 16, fontWeight: 800, letterSpacing: '.06em', color: 'var(--gold)',
          textShadow: '0 2px 12px rgba(0,0,0,.8)',
        }}>{sub}</div>
      </div>

      <div style={{
        position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)', insetInline: 0,
        textAlign: 'center', fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,.62)',
        opacity: shown ? 1 : 0, transition: 'opacity 1s ease 1.2s', pointerEvents: 'none',
      }}>הקש להמשך ‹</div>
    </div>
  );
}

/**
 * The summer. One quiet screen between two seasons that tells you what a year
 * did to the men who play for you: who grew, who slowed down, who hung up the
 * boots, and which kid came up to take a shirt.
 */
export function PreSeasonScreen({ gs, onStart }: { gs: G.GameState; onStart: () => void }) {
  const r = gs.lastReport;
  const c = G.club(gs);
  if (!r) return null;
  // wages are paid week by week during the season now, so the summer books are
  // the prize money against what the coming squad will cost you every week.
  // report.wages is already the weekly bill.
  const weekly = r.wages;
  return (
    <div className="screen pad stack pad-b" style={{ gap: 13, minHeight: '100%' }}>
      <div className="row" style={{ gap: 10, marginTop: 10 }}>
        <Icon name="calendar" size={22} color="var(--gold)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="h2">הקיץ</div>
          <div className="sub" style={{ marginTop: 2 }}>
            לפני עונה <span className="num">{gs.season}</span> · {LEAGUE_NAMES[c.tier]}
          </div>
        </div>
      </div>

      <div className="tile-hero" style={{ padding: 14 }}>
        <div className="label-cap" style={{ marginBottom: 10 }}>המאזן</div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Money label="פרס עונה" value={r.purse} color="var(--win)" />
          <Money label="בקופה" value={gs.meters.money} color="var(--gold-hi)" />
          <Money label="שכר לשבוע" value={-weekly} color="var(--loss)" />
        </div>
        <div className="hint" style={{ margin: '9px 0 0', textAlign: 'center' }}>
          השכר יורד כל מחזור, יחד עם תחזוקת המגרש והאבטחה.
        </div>
        {/* DRAFT WORDING, Itzik's to correct */}
        {(r.purseEarlier ?? 0) > 0 && (
          <div className="hint" style={{ margin: '5px 0 0', textAlign: 'center' }}>
            ועוד {formatMoney(r.purseEarlier!)} מפרס העונה נכנסו כבר במהלך העונה.
          </div>
        )}
      </div>

      <div className="label-cap">מה שהשנה עשתה לסגל</div>
      <div className="tile" style={{ padding: '12px 13px' }}>
        {r.risers.length === 0 && r.fallers.length === 0 && r.retired.length === 0 && r.joined.length === 0 && (
          <div className="sub">קיץ שקט. אותה חבורה, שנה אחת יותר מנוסה.</div>
        )}
        {r.risers.length > 0 && (
          <Group icon="flame" color="var(--win)" title="פרצו קדימה"
            items={r.risers.map(x => ({ name: x.name, from: x.from, to: x.to }))} />
        )}
        {r.fallers.length > 0 && (
          <Group icon="alert" color="var(--ink-dim)" title="השנים מתחילות להיראות"
            items={r.fallers.map(x => ({ name: x.name, from: x.from, to: x.to }))} />
        )}
        {r.retired.length > 0 && (
          <Group icon="boot" color="var(--gold)" title="תלו את הנעליים"
            items={r.retired.map(x => ({ name: x.name, note: `בן ${x.age}` }))} />
        )}
        {r.joined.length > 0 && (
          <Group icon="star" color="var(--sky)" title="עלו מהנוער" items={r.joined.map(name => ({ name }))} />
        )}
      </div>

      <div className="spacer" />
      <button className="btn" onClick={onStart}>
        <Icon name="handshake" size={18} /> לחלון הקיץ
      </button>
    </div>
  );
}

function Money({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="stack" style={{ alignItems: 'center', gap: 3, flex: 1, minWidth: 0 }}>
      <span className="score-face" style={{ fontSize: 19, color }}>
        {value < 0 ? `-${formatMoney(Math.abs(value))}` : formatMoney(value)}
      </span>
      <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 700 }}>{label}</span>
    </div>
  );
}

function Group({ icon, color, title, items }: {
  icon: 'flame' | 'alert' | 'boot' | 'star'; color: string; title: string;
  items: { name: string; from?: number; to?: number; note?: string }[];
}) {
  return (
    <div style={{ marginTop: 9 }}>
      <div className="row" style={{ gap: 7, marginBottom: 5 }}>
        <Icon name={icon} size={14} color={color} />
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{title}</span>
      </div>
      <div className="stack" style={{ gap: 3 }}>
        {items.map((it, i) => (
          <div key={i} className="row" style={{ justifyContent: 'space-between', gap: 10, fontSize: 14, color: 'var(--ink-dim)' }}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
            {/* the rating change reads left to right, immune to RTL, and the
                diagonal arrow shows up or down so the direction is never in doubt */}
            {it.from != null && it.to != null ? (
              <span dir="ltr" className="num" style={{ fontWeight: 700, flex: 'none' }}>
                {it.from} <span style={{ color, fontWeight: 900 }}>{it.to >= it.from ? '↗' : '↘'}</span> {it.to}
              </span>
            ) : it.note ? (
              <span style={{ color: 'var(--ink-faint)', flex: 'none' }}>{it.note}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
