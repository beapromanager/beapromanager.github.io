import { useMemo, useState } from 'react';
import { surnameOf } from '../../data/names.ts';
import * as G from '../../game/state.ts';
import type { PreEvent } from '../../game/state.ts';
import type { Player } from '../../engine/matchEngine.ts';
import type { Squad } from '../../data/squadGen.ts';
import { LEAGUE_NAMES } from '../../data/clubs.ts';
import { PRE_ROUNDS } from '../../game/preseason.ts';
import { overall } from '../../engine/matchEngine.ts';
import { assignTraits } from '../../data/personalities.ts';
import { Meters, formatMoney, StatBox } from '../components/bits.tsx';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';
import { Portal } from '../components/Portal.tsx';
import { RoundTurn } from '../components/RoundTurn.tsx';
import { Stepper } from '../components/Stepper.tsx';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { ovrColor, LINE_OF, LINE_LABEL, LINE_COLOR } from './Squad.tsx';

/**
 * The summer board, and the first screen a new manager really works with. It has
 * two jobs: make it unmistakable that this is the transfer window and no football
 * is played yet, and let you actually read your squad, line by line, so you can
 * see the holes you are here to fill.
 */
export function PreSeasonMarket({
  gs, firstCareer, onOpenMarket, onResolveDeparture, onRenew, onRelease, onDismissOutcome, onTakeCourse, onAdvance,
}: {
  gs: G.GameState;
  firstCareer: boolean;
  onOpenMarket: (line?: G.MarketLine) => void;
  onResolveDeparture: (kind: 'star' | 'young', optionIndex: number) => void;
  onRenew: (playerId: string) => void;
  onRelease: (playerId: string) => void;
  onDismissOutcome: () => void;
  onTakeCourse: () => void;
  onAdvance: () => void;
}) {
  const c = G.club(gs);
  const sq = G.mySquad(gs);
  const avg = Math.round(sq.starters.reduce((s, p) => s + overall(p), 0) / sq.starters.length);
  const size = G.squadSize(gs);
  const events = G.preseasonEvents(gs);
  const lastRound = gs.preWeek >= PRE_ROUNDS;
  const blocked = G.preseasonBlockedReason(gs);
  // a round the manager never touched, and the calendar beat that follows
  const [nudge, setNudge] = useState(false);
  const [turning, setTurning] = useState<{ from: number; to: number } | null>(null);

  /**
   * The continue button. A summer round left completely untouched gets one
   * question first, because the window is the only part of the year when the
   * squad can actually be changed and skipping it in silence is expensive.
   * Asked once per round, never twice, and never on the way into the season
   * itself where the choice has already been made.
   */
  function tryAdvance() {
    if (blocked) return;
    if (!lastRound && G.summerUntouched(gs)) { setNudge(true); return; }
    goOn();
  }

  function goOn() {
    setNudge(false);
    if (lastRound) { onAdvance(); return; }
    // advance first so the beat lands on the round the manager is entering
    const from = gs.preWeek;
    onAdvance();
    setTurning({ from, to: from + 1 });
  }

  const [card, setCard] = useState<Player | null>(null);
  const traits = useMemo(() => assignTraits([...sq.starters, ...sq.bench]), [sq]);

  // an answered piece of business shows its outcome, same grammar as the inbox
  if (gs.pendingOutcome != null) {
    return (
      <>
        <Meters {...gs.meters} gems={gs.gems} />
        <div className="screen pad stack pad-b" style={{ gap: 13 }}>
          <span className="eyebrow" style={{ marginTop: 2 }}>קיץ · מחזור {gs.preWeek} מתוך {PRE_ROUNDS}</span>
          <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'riseIn var(--t-mid) var(--ease-out)' }}>
            <div style={{
              background: 'linear-gradient(180deg,var(--grass),#1E7C4C)', color: '#04180C',
              borderRadius: '18px 5px 18px 18px', padding: '12px 15px', fontSize: 15.5,
              maxWidth: '86%', fontWeight: 700, lineHeight: 1.55, boxShadow: 'var(--e2)',
            }}>
              {gs.pendingOutcome}
            </div>
          </div>
          <div className="spacer" />
          <button className="btn" onClick={onDismissOutcome}>
            המשך <Icon name="chevron" size={17} />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 13, minHeight: '100%' }}>
        {firstCareer && <Stepper current={6} />}

        {/* The banner. No football is played here, this is the window, three rounds. */}
        <div className="tile-hero" style={{ padding: '16px 16px 15px', marginTop: firstCareer ? 2 : 6 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="eyebrow">אין משחקים · רק העברות</span>
            <RoundDots round={gs.preWeek} />
          </div>
          <h1 className="h1" style={{ fontSize: 'clamp(32px,10vw,44px)', lineHeight: 1 }}>חלון העברות</h1>
          <div className="row" style={{ gap: 8, marginTop: 11 }}>
            <span className="chip" style={{ background: 'rgba(233,185,73,.16)', color: 'var(--gold)', fontSize: 14 }}>
              מחזור קיץ <span className="num">{gs.preWeek}</span> מתוך <span className="num">{PRE_ROUNDS}</span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-dim)' }}>
              {gs.preWeek === 1 ? 'בונים את הקבוצה' : gs.preWeek === 2 ? 'סוגרים חוזים' : 'קריאה אחרונה'}
            </span>
          </div>
          <p className="sub" style={{ marginTop: 10 }}>
            {lastRound
              ? 'המחזור האחרון לפני שריקת הפתיחה. סגור את כל החוזים, ואז יוצאים לעונה.'
              : `העונה עוד לא התחילה. יש לך ${PRE_ROUNDS - gs.preWeek + 1} מחזורי קיץ להעברות, חוזים ובניית סגל, ורק אחריהם משחקים.`}
          </p>

          {/* the club, with its three headline numbers built into the banner */}
          <div className="row" style={{ gap: 11, marginTop: 15, marginBottom: 12 }}>
            <Crest club={c} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15.5 }}>{c.name}</div>
              <div className="sub" style={{ fontSize: 13 }}>{c.strength}</div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <StatBox label="תקציב" value={formatMoney(gs.meters.money)} color="var(--gold)" />
            <StatBox label="ממוצע סגל" value={String(avg)} />
            <StatBox label="שחקנים" value={String(size)} />
          </div>
        </div>

        {/* the badge you are missing for this division, the summer's first job */}
        <CourseCard gs={gs} onTake={onTakeCourse} />

        {/* the squad, so the manager can see what he has and where the holes are */}
        <SquadPanel squad={sq} onOpen={setCard} onNeed={onOpenMarket} />

        {/* the desk: sagas and expiring deals */}
        {events.length > 0 && (
          <>
            <div className="label-cap">על הפרק</div>
            <div className="stack" style={{ gap: 10 }}>
              {events.map(ev => (
                ev.kind === 'renew'
                  ? <RenewCard key={ev.id} ev={ev} onRenew={() => onRenew(ev.player.id)} onRelease={() => onRelease(ev.player.id)} />
                  : <DepartureCard key={ev.id} ev={ev} onPick={oi => onResolveDeparture(ev.kind as 'star' | 'young', oi)} />
              ))}
            </div>
          </>
        )}

        {/* the open market, reachable every round */}
        <button className="tile select" onClick={() => onOpenMarket()} style={{
          textAlign: 'start', display: 'flex', gap: 12, alignItems: 'center',
          borderColor: 'color-mix(in srgb, var(--win) 34%, transparent)',
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--win) 8%, var(--surface-2)), var(--surface))',
        }}>
          <span style={{
            width: 42, height: 42, borderRadius: 12, flex: 'none', display: 'grid', placeItems: 'center',
            background: 'color-mix(in srgb, var(--win) 16%, transparent)', border: '1px solid color-mix(in srgb, var(--win) 32%, transparent)',
          }}>
            <Icon name="handshake" size={21} color="var(--win)" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>שוק ההעברות</div>
            <div style={{ fontSize: 13.5, color: 'var(--win)', fontWeight: 600, marginTop: 2 }}>
              {gs.market.length} שחקנים חופשיים · קנייה, מכירה ושחרור
            </div>
          </div>
          <Icon name="chevron" size={17} color="var(--ink-faint)" />
        </button>

        <div className="spacer" />
        <button className="btn" onClick={tryAdvance} disabled={!!blocked}>
          {blocked
            ? <>{blocked}</>
            : lastRound
              ? <>יוצאים לעונה <Icon name="whistle" size={18} /></>
              : <>סיימתי, למחזור הקיץ הבא <Icon name="chevron" size={17} /></>}
        </button>
        {blocked ? (
          <p className="hint" style={{ textAlign: 'center', color: 'var(--loss)', fontWeight: 700 }}>
            כל שחקן שהחוזה שלו נגמר חייב תשובה, חידוש או שחרור.
          </p>
        ) : !lastRound && (
          <p className="hint" style={{ textAlign: 'center' }}>
            נשארו <span className="num">{PRE_ROUNDS - gs.preWeek}</span> מחזורי קיץ לפני שהליגה מתחילה
          </p>
        )}

        {nudge && (
          <UnusedRound
            name={gs.profile.nickname || gs.profile.name}
            left={PRE_ROUNDS - gs.preWeek}
            onMarket={() => { setNudge(false); onOpenMarket(); }}
            onAnyway={goOn}
          />
        )}
        {turning && (
          <RoundTurn from={turning.from} to={turning.to} of={PRE_ROUNDS}
            note="השוק התרענן, יש שמות חדשים"
            onDone={() => setTurning(null)} />
        )}
      </div>

      {card && (
        <PlayerCard p={card} club={c} season={gs.seasonStats[card.id]} career={G.careerOf(gs, card.id)}
          traits={traits.get(card.id) ?? []} onClose={() => setCard(null)} />
      )}
    </>
  );
}

/* -------------------------------------------------------------- the squad */

const LINES = ['gk', 'def', 'mid', 'atk'] as const;
/** A healthy squad wants roughly this many bodies per line. Below it we nudge. */
const IDEAL: Record<(typeof LINES)[number], number> = { gk: 2, def: 5, mid: 4, atk: 3 };
const surname = surnameOf;

/** The squad read line by line, with thin areas flagged so gaps are obvious.
 *  A flagged line, or the header summary, jumps straight to the market filtered
 *  to exactly the position that is short. */
function SquadPanel({ squad, onOpen, onNeed }: {
  squad: Squad; onOpen: (p: Player) => void; onNeed: (line: G.MarketLine) => void;
}) {
  const all = [...squad.starters, ...squad.bench];
  const grouped = LINES.map(key => ({
    key, label: LINE_LABEL[key], color: LINE_COLOR[key], min: IDEAL[key],
    players: all.filter(p => LINE_OF[p.position] === key).sort((a, b) => overall(b) - overall(a)),
  }));
  const gaps = grouped.filter(l => l.players.length < l.min);

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="label-cap">הסגל שלך</div>
        {gaps.length > 0
          ? <button onClick={() => onNeed(gaps[0].key)} className="chip" style={{ background: 'color-mix(in srgb, var(--loss) 16%, transparent)', color: 'var(--loss)' }}>
              חסר: {gaps.map(g => g.label).join(' · ')} <Icon name="chevron" size={13} color="var(--loss)" />
            </button>
          : <span className="chip" style={{ background: 'color-mix(in srgb, var(--win) 15%, transparent)', color: 'var(--win)' }}>סגל מאוזן</span>}
      </div>
      <div className="tile" style={{ padding: '4px 12px 10px' }}>
        {grouped.map((l, i) => (
          <div key={l.key} style={{ padding: '11px 0 9px', borderTop: i ? '1px solid var(--line)' : undefined }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 9 }}>
              <div className="row" style={{ gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: l.color, flex: 'none' }} />
                <b style={{ fontSize: 14.5 }}>{l.label}</b>
                <span className="num" style={{ color: 'var(--ink-faint)', fontSize: 13, fontWeight: 800 }}>{l.players.length}</span>
              </div>
              {l.players.length < l.min && (
                <button onClick={() => onNeed(l.key)} className="chip" style={{
                  background: 'color-mix(in srgb, var(--loss) 15%, transparent)', color: 'var(--loss)', fontSize: 12,
                }}>
                  צריך תגבור <Icon name="handshake" size={12} color="var(--loss)" />
                </button>
              )}
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
              {l.players.map(p => <PlayerChip key={p.id} p={p} onClick={() => onOpen(p)} />)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** One player as a tappable pill: rating, name, position. */
function PlayerChip({ p, onClick }: { p: Player; onClick: () => void }) {
  const o = overall(p);
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 7px',
      background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: '9px 9px 9px 3px',
    }}>
      <b className="num" style={{ color: ovrColor(o), fontWeight: 900, fontSize: 14 }}>{o}</b>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{surname(p.name)}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-faint)' }}>{p.position}</span>
    </button>
  );
}

/* -------------------------------------------------------------- the cards */

/** A transfer saga, framed like a message from the player. */
function DepartureCard({ ev, onPick }: { ev: PreEvent; onPick: (optionIndex: number) => void }) {
  const p = ev.player;
  const o = overall(p);
  const star = ev.kind === 'star';
  const accent = star ? 'var(--loss)' : 'var(--sky)';
  const label = star ? 'רוצה לעלות ליגה' : 'רוצה חוזה חדש';
  const msg = star
    ? `יש עליי קבוצה מליגה בכירה יותר. אני מרגיש שהגיע הזמן שלי להתקדם. תשקול את זה.`
    : `מאמן, אני נותן הכל על המגרש. מגיע לי חוזה שמכבד אותי. אל תיתן לי סיבה לחפש במקום אחר.`;
  const options = star
    ? [{
      // down in the amateur divisions the fee is pocket money and the rest of
      // the deal is a washing machine, which is both funnier and truer
      label: ev.sweetener
        ? `מכור: ${formatMoney(ev.amount)} + ${ev.sweetener}`
        : `מכור תמורת ${formatMoney(ev.amount)}`,
      tone: 'money' as const,
    }, { label: 'חסום, הוא נשאר', tone: 'hold' as const }]
    : [{ label: `תן העלאה, ${formatMoney(ev.amount)}`, tone: 'money' as const }, { label: 'סרב, שיוכיח קודם', tone: 'hold' as const }];

  return (
    <div className="tile" style={{ padding: '12px 13px', borderColor: `color-mix(in srgb, ${accent} 36%, transparent)` }}>
      <div className="row" style={{ gap: 11, alignItems: 'center' }}>
        <span style={{
          width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center', flex: 'none',
          background: 'linear-gradient(180deg,var(--surface-3),var(--surface))', border: `1px solid ${accent}44`,
        }}>
          <Icon name={star ? 'flame' : 'star'} size={19} color={accent} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: accent, marginTop: 2 }}>{label}</div>
        </div>
        <div style={{ textAlign: 'center', flex: 'none' }}>
          <div className="score-face" style={{ fontSize: 22, color: ovrColor(o), lineHeight: 1 }}>{o}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 700 }}>{p.position} · גיל {p.age}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '11px 0 12px' }}>
        <div style={{
          background: 'var(--surface-3)', color: 'var(--ink-dim)',
          borderRadius: '5px 16px 16px 16px', padding: '10px 13px', fontSize: 14.5, lineHeight: 1.5,
          maxWidth: '92%', fontWeight: 600,
        }}>{msg}</div>
      </div>

      <div className="row" style={{ gap: 9 }}>
        {options.map((opt, oi) => (
          <button key={oi} className={opt.tone === 'money' ? 'btn' : 'btn dark'}
            style={{ flex: 1, padding: '12px 10px', fontSize: 15 }}
            onClick={() => onPick(oi)}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** An out of contract player, renew or let him walk. */
function RenewCard({ ev, onRenew, onRelease }: { ev: PreEvent; onRenew: () => void; onRelease: () => void }) {
  const p = ev.player;
  const o = overall(p);
  return (
    <div className="tile" style={{ padding: '12px 13px', borderColor: 'color-mix(in srgb, var(--gold) 30%, transparent)' }}>
      <div className="row" style={{ gap: 11, alignItems: 'center', marginBottom: 11 }}>
        <span style={{
          width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center', flex: 'none',
          background: 'linear-gradient(180deg,var(--surface-3),var(--surface))', border: '1px solid color-mix(in srgb, var(--gold) 40%, transparent)',
        }}>
          <Icon name="clipboard" size={19} color="var(--gold)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold)', marginTop: 2 }}>החוזה נגמר</div>
        </div>
        <div style={{ textAlign: 'center', flex: 'none' }}>
          <div className="score-face" style={{ fontSize: 22, color: ovrColor(o), lineHeight: 1 }}>{o}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 700 }}>{p.position} · גיל {p.age}</div>
        </div>
      </div>
      <div className="row" style={{ gap: 9 }}>
        <button className="btn" style={{ flex: 2, padding: '12px 10px', fontSize: 15 }} onClick={onRenew}>
          חדש חוזה · {formatMoney(ev.amount)}
        </button>
        <button className="btn dark" style={{ flex: 1, padding: '12px 10px', fontSize: 15 }} onClick={onRelease}>
          שחרר
        </button>
      </div>
    </div>
  );
}

/** Three dots that fill as the summer runs down. */
/**
 * The coaching badge this division demands. It is a hard gate, the season will
 * not open without it, so it sits at the top of the summer board in red until
 * it is done.
 */
function CourseCard({ gs, onTake }: { gs: G.GameState; onTake: () => void }) {
  const course = G.courseOnOffer(gs);
  if (!course) return null;
  const blocked = G.courseBlockedReason(gs);
  const tierName = LEAGUE_NAMES[G.club(gs).tier];

  return (
    <div className="tile" style={{
      padding: '14px 15px',
      borderColor: 'color-mix(in srgb, var(--loss) 45%, transparent)',
      background: 'linear-gradient(180deg, color-mix(in srgb, var(--loss) 9%, var(--surface-2)), var(--surface))',
    }}>
      <div className="row" style={{ gap: 10, marginBottom: 8 }}>
        <Icon name="clipboard" size={19} color="var(--loss)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 16.5 }}>{course.course}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--loss)', marginTop: 2 }}>
            חובה כדי לפתוח עונה ב{tierName}
          </div>
        </div>
      </div>
      <p className="sub" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{course.blurb}</p>
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <StatBox label="עלות" value={formatMoney(course.cost)} color="var(--gold)" />
        <StatBox label="אימון" value={`+${course.gain.training}`} />
        <StatBox label="מנטלי" value={`+${course.gain.mental}`} />
      </div>
      <button className="btn" style={{ marginTop: 11 }} disabled={!!blocked} onClick={onTake}>
        {blocked ?? `צא ל${course.course} · הפוך ל${course.name}`}
      </button>
    </div>
  );
}

function RoundDots({ round }: { round: number }) {
  return (
    <span className="row" style={{ gap: 5 }}>
      {Array.from({ length: PRE_ROUNDS }, (_, i) => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: 4,
          background: i < round ? 'var(--gold)' : 'var(--surface-3)',
          border: i < round ? 'none' : '1px solid var(--line)',
        }} />
      ))}
    </span>
  );
}


/**
 * One question before a wasted round.
 *
 * Not a warning and not a block: the manager may well have decided to stand
 * pat, and the second button says so without argument. It exists because the
 * summer is three rounds long and a manager who walks through all three without
 * touching anything has usually not understood that he could.
 */
function UnusedRound({ name, left, onMarket, onAnyway }: {
  name: string; left: number; onMarket: () => void; onAnyway: () => void;
}) {
  return (
    <Portal>
      <div className="sheet-scrim" onClick={onAnyway}>
        <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="מחזור קיץ שלא נוצל">
          <div className="sheet-grip" />
          <div className="row" style={{ gap: 11, alignItems: 'flex-start' }}>
            <Icon name="alert" size={22} color="var(--gold)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="h2" style={{ fontSize: 19 }}>{name}, לא עשית כלום המחזור הזה</div>
              <p className="hint" style={{ margin: '6px 0 0' }}>
                חלון ההעברות הוא הזמן היחיד בשנה לשנות את הסגל, ואתה עומד לוותר על מחזור שלם ממנו.
                {left > 1
                  ? <> נשארו לך עוד <span className="num">{left}</span> מחזורים.</>
                  : <> זה המחזור האחרון לפני שהליגה מתחילה.</>}
              </p>
            </div>
          </div>
          <button className="btn" style={{ marginTop: 15 }} onClick={onMarket}>
            <Icon name="handshake" size={17} /> קח אותי לשוק
          </button>
          <button className="btn dark" style={{ marginTop: 8 }} onClick={onAnyway}>
            אני יודע, תמשיך למחזור הבא
          </button>
        </div>
      </div>
    </Portal>
  );
}
