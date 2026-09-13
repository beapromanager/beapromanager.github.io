import { useMemo, useState } from 'react';
import * as G from '../../game/state.ts';
import type { Player, Position } from '../../engine/matchEngine.ts';
import { overall } from '../../engine/matchEngine.ts';
import { ovrColor } from '../../game/cards.ts';
import type { Trait } from '../../data/personalities.ts';
import { headlineTrait, assignTraits, renderLine, TONE_COLOR } from '../../data/personalities.ts';
import type { Squad } from '../../data/squadGen.ts';
import { Crest } from '../components/Crest.tsx';
import { Kit } from '../components/Kit.tsx';
import { homeKit } from '../../data/kits.ts';
import { Icon } from '../components/Icon.tsx';
import { Stepper } from '../components/Stepper.tsx';
import { CoachGuide } from '../components/CoachGuide.tsx';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { LineupPitch } from '../components/LineupPitch.tsx';
import { scrollToTop } from '../scroll.ts';
import { formation, fillFormation, roleFit, ROLE_LABEL } from '../../data/formations.ts';

export const LINE_OF: Record<Position, 'gk' | 'def' | 'mid' | 'atk'> = {
  GK: 'gk', CB: 'def', LB: 'def', RB: 'def',
  CDM: 'mid', CM: 'mid', CAM: 'mid',
  LW: 'atk', RW: 'atk', ST: 'atk',
};
export const LINE_LABEL = { gk: 'שוער', def: 'הגנה', mid: 'קישור', atk: 'התקפה' } as const;
export const LINE_COLOR = { gk: 'var(--pos-gk)', def: 'var(--pos-def)', mid: 'var(--pos-mid)', atk: 'var(--pos-atk)' } as const;

// one source of truth for the rating color, shared with the card system
export { ovrColor };

/** The little captain armband badge, an inline gold "C". */
export function CaptainMark({ size = 18 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 5, flex: 'none',
      display: 'inline-grid', placeItems: 'center', verticalAlign: 'middle',
      background: 'linear-gradient(180deg,var(--gold-hi),var(--gold))', color: '#1B1305',
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.62, lineHeight: 1,
    }} title="קפטן">C</span>
  );
}

export function PlayerRow({ p, traits, state, onOpen, swap, onSwap, captain, mark }: {
  p: Player;
  /** squad-assigned traits, falls back to standalone when omitted */
  traits?: Trait[];
  state?: 'idle' | 'selected' | 'target' | 'blocked';
  /** tap anywhere on the row body, opens the player card */
  onOpen?: () => void;
  /** show the swap side control, with its visual state */
  swap?: 'off' | 'arm' | 'armed' | 'in';
  onSwap?: () => void;
  /** wears the armband */
  captain?: boolean;
  /** why he is not playing this round, when he is not */
  mark?: 'banned' | 'sheet' | null;
}) {
  const o = overall(p);
  const line = LINE_OF[p.position];
  const young = p.age <= 21;
  const st = state ?? 'idle';
  const bg = st === 'selected' ? 'rgba(232,182,76,.18)'
    : st === 'target' ? 'rgba(51,194,122,.12)'
    : 'transparent';
  // an explicit array (even empty) is authoritative, only undefined falls back
  const trait = traits ? (traits[0] ?? null) : headlineTrait(p);

  const inner = (
    <>
      <span className="chip" style={{ background: 'rgba(255,255,255,.07)', color: LINE_COLOR[line], minWidth: 36, textAlign: 'center' }}>{p.position}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {captain && <><CaptainMark size={16} /> </>}
          {p.name}
          {young && <span className="chip" style={{ marginInlineStart: 6, background: 'rgba(51,194,122,.18)', color: 'var(--win)' }}>כישרון</span>}
          {mark === 'banned' && <span className="chip" style={{ marginInlineStart: 6, background: 'rgba(226,72,77,.18)', color: 'var(--loss)' }}>מורחק</span>}
          {mark === 'sheet' && <span className="chip" style={{ marginInlineStart: 6, background: 'rgba(255,255,255,.08)', color: 'var(--ink-faint)' }}>רשום בלבד</span>}
        </div>
        <div className="sub" style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {/* Pace and shooting used to follow the age here. Two numbers out of
              six, on a row that already carries the overall rating, telling a
              manager almost nothing and crowding out the line that says who the
              man actually is. His own card carries all six, one tap away. */}
          {trait
            ? <><span style={{ color: TONE_COLOR[trait.tone], fontWeight: 700 }}>{trait.label}</span>
                <span style={{ opacity: .5 }}> · </span>
                גיל <span className="num">{p.age}</span></>
            : <>גיל <span className="num">{p.age}</span></>}
        </div>
      </div>
      <div className="score-face" style={{ fontSize: 26, color: ovrColor(o), width: 34, textAlign: 'center' }}>{o}</div>
    </>
  );

  const bodyStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0,
    padding: '10px 8px', background: bg,
    textAlign: 'start', borderRadius: 8, opacity: st === 'blocked' ? 0.35 : 1,
    transition: 'background .15s ease',
  };

  const body = onOpen
    ? <button style={{ ...bodyStyle, minHeight: 56 }} onClick={onOpen}
        aria-label={`הכרטיס של ${p.name}, ${p.position}, דירוג ${o}`}>{inner}</button>
    : <div style={bodyStyle}>{inner}</div>;

  if (!swap || swap === 'off') {
    return <div style={{ display: 'flex', alignItems: 'stretch', borderTop: '1px solid var(--line)' }}>{body}</div>;
  }

  const swapColor = swap === 'armed' ? 'var(--gold)' : swap === 'in' ? 'var(--win)' : 'var(--ink-faint)';
  const swapLabel = swap === 'arm' ? `הוצא את ${p.name}` : swap === 'in' ? `הכנס את ${p.name}` : 'בטל החלפה';
  // The control says what it does. A bare arrow icon read as decoration: once a
  // starter is armed, the bench buttons say הכנס and the armed man says בטל,
  // and the swap stops needing to be explained in a banner above the list.
  const word = swap === 'armed' ? 'בטל' : swap === 'in' ? 'הכנס' : null;
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderTop: '1px solid var(--line)' }}>
      {body}
      <button onClick={onSwap} aria-label={swapLabel} disabled={st === 'blocked'}
        style={{
          flex: 'none', minWidth: word ? 62 : 44, minHeight: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          color: swapColor, borderRadius: 8, opacity: st === 'blocked' ? 0.3 : 1,
          fontWeight: 800, fontSize: 13,
          background: swap === 'armed' ? 'rgba(233,185,73,.14)' : swap === 'in' ? 'rgba(51,194,122,.14)' : 'transparent',
          border: swap === 'in' ? '1px solid rgba(51,194,122,.4)' : swap === 'armed' ? '1px solid rgba(233,185,73,.4)' : '1px solid transparent',
        }}>
        <Icon name="sub" size={word ? 14 : 18} />{word}
      </button>
    </div>
  );
}

function Line({ title, color, players, render }: {
  title: string; color: string; players: Player[]; render: (p: Player) => React.ReactNode;
}) {
  if (!players.length) return null;
  return (
    <div className="tile" style={{ padding: '4px 10px 8px' }}>
      <div className="row" style={{ gap: 8, padding: '8px 2px 2px' }}>
        <span style={{ width: 8, height: 8, borderRadius: 3, background: color }} />
        <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink-dim)' }}>{title}</span>
      </div>
      {players.map(p => <div key={p.id}>{render(p)}</div>)}
    </div>
  );
}

export function SquadScreen({ gs, firstTime, onSwap, onDone }: {
  gs: G.GameState;
  firstTime: boolean;
  onSwap: (starterId: string, benchId: string) => void;
  onDone: () => void;
}) {
  const c = G.club(gs);
  const sq = G.mySquad(gs);
  const [picked, setPicked] = useState<string | null>(null);   // a starter waiting for a sub
  const [flash, setFlash] = useState<string | null>(null);
  const [card, setCard] = useState<Player | null>(null);       // the open player card
  const [view, setView] = useState<'pitch' | 'list'>('pitch');

  // one personality pass over the whole squad, so no two players repeat
  const traitMap = useMemo(() => assignTraits([...sq.starters, ...sq.bench]), [sq]);
  const tr = (p: Player): Trait[] => traitMap.get(p.id) ?? [];
  const captainId = G.currentCaptainId(gs);
  // banned for the round, or the youth on the sheet who never plays
  const markOf = (p: Player): 'banned' | 'sheet' | null =>
    G.isSuspended(gs, p.id) ? 'banned' : gs.emergencyYouth === p.id ? 'sheet' : null;

  const pickedPlayer = picked ? [...sq.starters, ...sq.bench].find(p => p.id === picked) ?? null : null;
  const avg = Math.round(sq.starters.reduce((s, p) => s + overall(p), 0) / sq.starters.length);
  const byLine = (line: 'gk' | 'def' | 'mid' | 'atk') => sq.starters.filter(p => LINE_OF[p.position] === line);

  // the shape the manager picked, and who ends up in which shirt inside it
  const form = formation(gs.tactic?.formation);
  const onPitch = useMemo(() => fillFormation(sq.starters, form), [sq.starters, form]);
  // the men in a slot that is not theirs, which is the thing a list cannot show
  const outOfPosition = useMemo(() => onPitch
    .map((p, i) => ({ name: p.name, pos: p.position, role: form.slots[i].role, fit: roleFit(p.position, form.slots[i].role) }))
    .filter(x => x.fit === 'out'), [onPitch, form]);

  /**
   * One tap does everything, from either end. Nothing picked yet: this man is
   * picked. Somebody already picked: if one of the two is on the pitch and the
   * other on the bench, they change places; otherwise the pick simply moves.
   * A manager should not have to know which one to press first.
   */
  function tap(p: Player) {
    setFlash(null);
    if (picked === p.id) { setPicked(null); return; }
    const other = picked ? [...sq.starters, ...sq.bench].find(x => x.id === picked) ?? null : null;
    if (!other) { setPicked(p.id); return; }

    const onPitch = (x: Player) => sq.starters.some(s => s.id === x.id);
    if (onPitch(other) === onPitch(p)) { setPicked(p.id); return; }   // both sides the same, just move the pick

    const starter = onPitch(other) ? other : p;
    const sub = onPitch(other) ? p : other;
    const reason = G.swapBlockedReason(starter, sub, gs);
    if (reason) { setFlash(reason); return; }
    onSwap(starter.id, sub.id);
    setPicked(null);
    setFlash(`${sub.name} נכנס במקום ${starter.name}.`);
  }

  // the swap side icon arms a starter, then completes onto a bench player
  function armStarter(p: Player) {
    setFlash(null);
    setPicked(picked === p.id ? null : p.id);
  }
  function subInBench(p: Player) {
    if (!pickedPlayer) { setFlash('קודם בחר שחקן מההרכב, לחץ על החצים שלידו'); return; }
    const reason = G.swapBlockedReason(pickedPlayer, p, gs);
    if (reason) { setFlash(reason); return; }
    onSwap(pickedPlayer.id, p.id);
    setPicked(null);
    setFlash(`${p.name} נכנס במקום ${pickedPlayer.name}`);
  }

  return (
    <div className="screen pad stack pad-b" style={{ gap: 12 }}>
      {firstTime && <Stepper current={5} />}
      {firstTime && <CoachGuide text="אלה השחקנים שלך. שלושה שכדאי להכיר למעלה, כל השאר בלחיצה על השם." />}
      <div className="row" style={{ marginTop: 8 }}>
        <Crest club={c} size={46} />
        {/* the shirt these players pull on, beside the badge they play for */}
        <Kit kit={homeKit(c)} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="h2">הסגל שלך</div>
          <div className="sub" style={{ fontSize: 14 }}>
            {`${c.name} · ${G.squadSize(gs)} שחקנים`}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="score-face" style={{ fontSize: 31, color: 'var(--gold-hi)' }}>{avg}</div>
          <div className="sub" style={{ fontSize: 12.5 }}>ממוצע</div>
        </div>
      </div>

      {firstTime && <DressingRoom sq={sq} traitMap={traitMap} onOpen={setCard} />}

      <div className="tile" style={{ padding: '10px 12px', background: pickedPlayer ? 'rgba(232,182,76,.12)' : 'var(--surface)', borderColor: pickedPlayer ? 'var(--gold)' : 'var(--line)' }}>
        <div className="row" style={{ gap: 10 }}>
          {/* a fresh message wins: a refused swap has to say why, and the
              standing "who is picked" prompt was hiding the reason */}
          <div style={{ flex: 1, fontSize: 14.5, fontWeight: 700 }} aria-live="polite">
            {flash
              ?? (pickedPlayer
                ? `${pickedPlayer.name} נבחר. לחץ על מי שמחליף אותו.`
                : 'לחץ על שחקן במגרש או בספסל כדי להחליף ביניהם.')}
          </div>
          {pickedPlayer && (
            <button className="btn ghost btn-sm" style={{ width: 'auto', padding: '7px 13px' }}
              onClick={() => setCard(pickedPlayer)}>כרטיס</button>
          )}
        </div>
      </div>

      <div className="seg" role="tablist">
        <button role="tab" aria-selected={view === 'pitch'} data-on={view === 'pitch' ? '1' : '0'} onClick={() => { setView('pitch'); scrollToTop(); }}>המגרש</button>
        <button role="tab" aria-selected={view === 'list'} data-on={view === 'list' ? '1' : '0'} onClick={() => { setView('list'); scrollToTop(); }}>רשימה</button>
      </div>

      {/* the round will not start until this is fixed, so it is said here too */}
      {!firstTime && G.weekBlockedReason(gs) && (
        <div className="tile" style={{ padding: '10px 13px', borderColor: 'rgba(226,72,77,.45)', background: 'rgba(226,72,77,.08)', fontSize: 14, fontWeight: 700 }}>
          {G.weekBlockedReason(gs)}
        </div>
      )}

      {view === 'pitch' ? (
        <>
          <LineupPitch formation={form} players={onPitch} kit={homeKit(c)}
            captainId={captainId} selectedId={picked} onPick={tap} />
          {outOfPosition.length > 0 && (
            <p className="hint" style={{ margin: 0 }}>
              {outOfPosition.length === 1
                ? `${outOfPosition[0].name} משחק ${ROLE_LABEL[outOfPosition[0].role]} והוא לא ${outOfPosition[0].pos}. שקול להחליף.`
                : `${outOfPosition.length} שחקנים לא בתפקיד הטבעי שלהם. הסימון האדום במגרש מראה איפה.`}
            </p>
          )}
        </>
      ) : (
        (['gk', 'def', 'mid', 'atk'] as const).map(line => (
          <Line key={line} title={LINE_LABEL[line]} color={LINE_COLOR[line]} players={byLine(line)}
            render={p => (
              <PlayerRow p={p} traits={tr(p)} state={picked === p.id ? 'selected' : 'idle'}
                captain={p.id === captainId} mark={markOf(p)}
                onOpen={() => setCard(p)}
                swap={picked === p.id ? 'armed' : 'arm'} onSwap={() => armStarter(p)} />
            )} />
        ))
      )}

      <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink-dim)', marginTop: 4 }}>ספסל החילופים</div>
      {view === 'pitch' ? (
        <div className="stack" style={{ gap: 7 }}>
          {sq.bench.map(p => {
            const blocked = !!pickedPlayer && sq.starters.some(s => s.id === pickedPlayer.id)
              && !!G.swapBlockedReason(pickedPlayer, p, gs);
            return (
              <button key={p.id} className="bench-pick" data-on={picked === p.id ? '1' : '0'}
                data-blocked={blocked ? '1' : '0'} onClick={() => tap(p)}
                aria-pressed={picked === p.id}>
                <span className="chip" style={{ background: 'rgba(255,255,255,.06)', color: LINE_COLOR[LINE_OF[p.position]], minWidth: 36, justifyContent: 'center' }}>{p.position}</span>
                <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.id === captainId && <span className="lineup-cap">C</span>}{p.name}
                  {markOf(p) === 'banned' && <span className="chip" style={{ marginInlineStart: 6, background: 'rgba(226,72,77,.18)', color: 'var(--loss)' }}>מורחק</span>}
                  {markOf(p) === 'sheet' && <span className="chip" style={{ marginInlineStart: 6, background: 'rgba(255,255,255,.08)', color: 'var(--ink-faint)' }}>רשום בלבד</span>}
                </span>
                <span className="num" style={{ fontWeight: 900, fontSize: 17, color: ovrColor(overall(p)) }}>{overall(p)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="tile" style={{ padding: '4px 10px 8px' }}>
          {sq.bench.map(p => {
            const blocked = !!pickedPlayer && !!G.swapBlockedReason(pickedPlayer, p, gs);
            return (
              <PlayerRow key={p.id} p={p} traits={tr(p)}
                state={blocked ? 'blocked' : pickedPlayer ? 'target' : 'idle'}
                captain={p.id === captainId} mark={markOf(p)}
                onOpen={() => setCard(p)}
                swap={pickedPlayer ? 'in' : 'off'} onSwap={() => subInBench(p)} />
            );
          })}
        </div>
      )}

      <div className="spacer" />
      <button className="btn" onClick={onDone}>{firstTime ? 'ממשיכים לשוק ההעברות' : 'חזרה'}</button>

      {card && (
        <PlayerCard p={card} club={c} season={gs.seasonStats[card.id]} career={G.careerOf(gs, card.id)} traits={tr(card)} onClose={() => setCard(null)} />
      )}
    </div>
  );
}

/**
 * First meeting with the squad. Nobody remembers sixteen ratings, so the
 * introduction is the three men who stand out: the best three by rating, each
 * with his position, his number, and one line on who he is. The line is his
 * character when he has one, and what he is for the team when he does not,
 * so a plain squad still has three names to remember.
 */
function DressingRoom({ sq, traitMap, onOpen }: {
  sq: Squad; traitMap: Map<string, Trait[]>; onOpen: (p: Player) => void;
}) {
  const picks = [...sq.starters, ...sq.bench].sort((a, b) => overall(b) - overall(a)).slice(0, 3);
  const ROLE: Record<'gk' | 'def' | 'mid' | 'atk', string> = {
    gk: 'השוער מספר אחת. עליו הכל נשען.',
    def: 'העוגן מאחור. כשהוא בקו, ההגנה שקטה.',
    mid: 'המנוע בקישור. הכדור עובר דרכו.',
    atk: 'הכי מסוכן שלך מול השער.',
  };

  return (
    <div className="tile-hero" style={{ padding: '14px 14px 12px' }}>
      <div className="row" style={{ gap: 8, marginBottom: 11 }}>
        <Icon name="crowd" size={17} color="var(--gold)" />
        <span className="label-cap">שלושה שכדאי להכיר</span>
      </div>
      <div className="stack stagger" style={{ gap: 8 }}>
        {picks.map((p, i) => {
          const t = (traitMap.get(p.id) ?? [])[0];
          const o = overall(p);
          return (
            <button key={p.id} onClick={() => onOpen(p)}
              style={{ ...({ '--i': i } as React.CSSProperties), textAlign: 'start', display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 2px' }}>
              <span className="chip" style={{ background: 'rgba(255,255,255,.07)', color: LINE_COLOR[LINE_OF[p.position]], minWidth: 36, justifyContent: 'center' }}>{p.position}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                <span style={{ display: 'block', fontSize: 14.5, lineHeight: 1.45, color: t ? 'var(--ink-dim)' : 'var(--ink-faint)' }}>
                  {t
                    ? <><span style={{ color: TONE_COLOR[t.tone], fontWeight: 700 }}>{t.label}</span><span style={{ opacity: .5 }}> · </span>{renderLine(t, { ...p, name: p.name.split(' ').slice(-1)[0] })}</>
                    : ROLE[LINE_OF[p.position]]}
                </span>
              </span>
              <span className="score-face" style={{ fontSize: 26, color: ovrColor(o), width: 34, textAlign: 'center' }}>{o}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
