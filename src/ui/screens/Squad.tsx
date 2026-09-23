import { useEffect, useMemo, useRef, useState } from 'react';
import * as G from '../../game/state.ts';
import type { Player, Position } from '../../engine/matchEngine.ts';
import { overall } from '../../engine/matchEngine.ts';
import { ovrColor } from '../../game/cards.ts';
import type { Trait } from '../../data/personalities.ts';
import { headlineTrait, assignTraits, renderLine, TONE_COLOR, isFriendTrait } from '../../data/personalities.ts';
import { surnameOf } from '../../data/names.ts';
import type { Squad } from '../../data/squadGen.ts';
import { Crest } from '../components/Crest.tsx';
import { Kit } from '../components/Kit.tsx';
import { homeKit } from '../../data/kits.ts';
import { Icon } from '../components/Icon.tsx';
import { Meters } from '../components/bits.tsx';
import { TopBack } from '../components/TopBack.tsx';
import { Stepper } from '../components/Stepper.tsx';
import { CoachGuide } from '../components/CoachGuide.tsx';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { Portal } from '../components/Portal.tsx';
import { ShapeMap } from '../components/ShapeMap.tsx';
import { LineupPitch } from '../components/LineupPitch.tsx';
import { scrollToTop, edgeScrollSpeed } from '../scroll.ts';
import { formation, roleFit, ROLE_LABEL, FORMATIONS, effectiveOverall } from '../../data/formations.ts';
import type { FormationId, SlotRole } from '../../data/formations.ts';

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

/**
 * One of the two he brought with him.
 *
 * A friend is an ordinary player in every other respect, which is the problem:
 * without a mark he is just another name in a list of eighteen, and the whole
 * reason he is here is that he is not. The badge is the shirt, because the
 * shirt is what he was given on the screen where he was named.
 */
export function FriendMark({ size = 18 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 5, flex: 'none',
      display: 'inline-grid', placeItems: 'center', verticalAlign: 'middle',
      background: 'rgba(233,185,73,.16)', border: '1px solid rgba(233,185,73,.45)',
    }} title={FRIEND_MARK} aria-label={FRIEND_MARK}>
      <Icon name="shirt" size={size * 0.62} color="var(--gold)" />
    </span>
  );
}

/** what the badge says, and what the card calls the line he came with */
export const FRIEND_MARK = 'בא איתך';

/** the chip on a man the manager gave his word to this week */
const PROMISED = 'הבטחת לו';

export function PlayerRow({ p, traits, state, onOpen, swap, onSwap, captain, mark, role }: {
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
  /** why he is not playing this round, when he is not: the chip text */
  mark?: string | null;
  /** the shirt he wears on the sheet, when he is on it; red name when it is not his */
  role?: SlotRole | null;
}) {
  const o = overall(p);
  const line = LINE_OF[p.position];
  const fit = role ? roleFit(p.position, role) : 'natural';
  const shown = role ? effectiveOverall(p, role, o) : o;
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
        <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: fit === 'out' ? 'var(--loss)' : fit === 'covers' ? 'var(--gold-hi)' : undefined }}>
          {captain && <><CaptainMark size={16} /> </>}
          {isFriendTrait(trait) && <><FriendMark size={15} /> </>}
          {p.name}
          {role && fit !== 'natural' && <span className="chip" style={{ marginInlineStart: 6, background: fit === 'out' ? 'rgba(226,72,77,.18)' : 'rgba(233,185,73,.16)', color: fit === 'out' ? 'var(--loss)' : 'var(--gold-hi)' }}>{ROLE_LABEL[role]}</span>}
          {young && <span className="chip" style={{ marginInlineStart: 6, background: 'rgba(51,194,122,.18)', color: 'var(--win)' }}>כישרון</span>}
          {mark && <span className="chip" style={{ marginInlineStart: 6, background: mark === 'מורחק' ? 'rgba(226,72,77,.18)' : mark === PROMISED ? 'rgba(233,185,73,.18)' : 'rgba(255,255,255,.08)', color: mark === 'מורחק' ? 'var(--loss)' : mark === PROMISED ? 'var(--gold-hi)' : 'var(--ink-faint)' }}>{mark}</span>}
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
      <div className="score-face" style={{ fontSize: 26, color: ovrColor(shown), width: 34, textAlign: 'center' }}>{shown}</div>
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

/**
 * The squad room.
 *
 * The pitch is the team sheet: every shirt is a slot, and the manager decides
 * who wears it. A tap on any man opens his numbers in a low panel that leaves
 * the pitch in view; a second tap on the same man, or the button on the
 * panel, opens the full card. Nobody has to open a card to learn who a man is.
 *
 * Moving men is a drag: a shirt or a bench row picked up follows the finger,
 * the shirts and rows it can land on light up, and the goal, the one shirt
 * that does not move, is marked as closed. A tap is still a tap (a drag needs
 * six pixels of travel), and the two tap way of swapping stays for anyone who
 * prefers it. Two men on the pitch change shirts; a man from the bench takes
 * the shirt of the man he replaces.
 *
 * Anyone can wear any outfield shirt. A man in a shirt that is not his has a
 * red name and a lower number, the number the match will actually use, and
 * the panel says so in words.
 */
export function SquadScreen({ gs, firstTime, onSwap, onMove, onFormation, onPart, onDone }: {
  gs: G.GameState;
  firstTime: boolean;
  onSwap: (starterId: string, benchId: string) => void;
  /** two men on the pitch change shirts */
  onMove: (aId: string, bId: string) => void;
  onFormation: (id: FormationId) => void;
  /** let a man go from his card, the way the card offered */
  onPart?: (playerId: string, kind: G.PartKind) => void;
  onDone: () => void;
}) {
  const c = G.club(gs);
  const sq = G.mySquad(gs);
  const [picked, setPicked] = useState<string | null>(null);   // armed for a swap, the two tap way
  const [flash, setFlash] = useState<string | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);     // whose numbers are open
  const [card, setCard] = useState<Player | null>(null);       // the open player card
  const [view, setView] = useState<'pitch' | 'list'>('pitch');
  // the fixed bench bar, measured rather than guessed: the drag has to know
  // which strip of the screen is a drop target and not a scroll trigger
  const benchBar = useRef<HTMLDivElement | null>(null);

  // one personality pass over the whole squad, so no two players repeat
  const traitMap = useMemo(() => assignTraits([...sq.starters, ...sq.bench], gs.friends), [sq, gs.friends]);
  const tr = (p: Player): Trait[] => traitMap.get(p.id) ?? [];
  const captainId = G.currentCaptainId(gs);
  // banned for the round, or the youth on the sheet who never plays
  // a place promised in the week is a chip on his row and a line at the top,
  // until the round settles whether the word was kept
  // a shirt promised on the phone counts from the moment it was promised, not
  // from the moment the week starts and moves it onto the sheet
  const promised = gs.matchMods.promised ?? gs.mate.promiseNext ?? null;
  const markOf = (p: Player): string | null =>
    G.isSuspended(gs, p.id) ? 'מורחק' : gs.emergencyYouth === p.id ? 'רשום בלבד' : gs.sitOut[p.id] ?? (promised?.id === p.id ? PROMISED : null);

  // serving a red, and therefore the reason the round will not start
  const bannedIds = useMemo(
    () => new Set([...sq.starters, ...sq.bench].filter(p => G.isSuspended(gs, p.id)).map(p => p.id)),
    [sq, gs]);

  const all = useMemo(() => [...sq.starters, ...sq.bench], [sq]);
  const byId = (id: string | null) => (id ? all.find(p => p.id === id) ?? null : null);
  const pickedPlayer = byId(picked);
  const sheetPlayer = byId(sheet);
  const avg = Math.round(sq.starters.reduce((s, p) => s + overall(p), 0) / sq.starters.length);
  const byLine = (line: 'gk' | 'def' | 'mid' | 'atk') => sq.starters.filter(p => LINE_OF[p.position] === line);

  // the sheet: who wears which shirt, the manager's own placing
  const form = formation(gs.tactic?.formation);
  const onPitch = useMemo(() => G.lineup(gs), [gs]);
  const isStarter = (id: string) => onPitch.some(p => p.id === id);
  const slotIndex = (id: string) => onPitch.findIndex(p => p.id === id);
  const roleOf = (id: string): SlotRole | null => { const i = slotIndex(id); return i >= 0 ? form.slots[i].role : null; };
  // the men in a slot that is not theirs, which is the thing a list cannot show
  const outOfPosition = useMemo(() => onPitch
    .map((p, i) => ({ name: p.name, pos: p.position, role: form.slots[i].role, fit: roleFit(p.position, form.slots[i].role) }))
    .filter(x => x.fit === 'out'), [onPitch, form]);

  /** Put a and b together: a swap across the line, or two shirts changing hands. */
  function join(aId: string, bId: string): boolean {
    const a = byId(aId), b = byId(bId);
    if (!a || !b || a.id === b.id) return false;
    const aOn = isStarter(a.id), bOn = isStarter(b.id);
    if (aOn && bOn) {
      const reason = G.moveBlockedReason(gs, a.id, b.id);
      if (reason) { setFlash(reason); return false; }
      onMove(a.id, b.id);
      setFlash(`${surnameOf(a.name)} ו${surnameOf(b.name)} החליפו חולצות.`);
      return true;
    }
    if (!aOn && !bOn) { setFlash('שניהם על הספסל. גרור אחד מהם על שחקן במגרש.'); return false; }
    const starter = aOn ? a : b, sub = aOn ? b : a;
    const reason = G.swapBlockedReason(starter, sub, gs);
    if (reason) { setFlash(reason); return false; }
    onSwap(starter.id, sub.id);
    setFlash(`${sub.name} נכנס במקום ${starter.name}.`);
    return true;
  }

  /**
   * A tap. Somebody armed: this man joins him. Nobody armed: his numbers open;
   * a second tap on the man whose numbers are open is the full card.
   */
  function tap(p: Player) {
    setFlash(null);
    if (picked) {
      if (picked === p.id) { setPicked(null); return; }
      if (join(picked, p.id)) setPicked(null);
      return;
    }
    if (sheet === p.id) { setCard(p); return; }
    setSheet(p.id);
  }

  // the list view keeps its side controls: arm a starter, then הכנס on the bench
  function armStarter(p: Player) {
    setFlash(null);
    setSheet(null);
    setPicked(picked === p.id ? null : p.id);
  }
  function subInBench(p: Player) {
    if (!pickedPlayer) { setFlash('קודם בחר שחקן מההרכב, לחץ על החצים שלידו'); return; }
    if (join(pickedPlayer.id, p.id)) setPicked(null);
  }

  /* ----------------------------------------------------------- the drag */
  const drag = useDrag({
    // the bench is nailed to the bottom of the screen, so the bottom of the
    // screen is a destination, not an edge to run from
    bottomInset: () => (view === 'pitch' ? benchBar.current?.offsetHeight ?? 0 : 0),
    canDrop: (fromId, toId) => {
      const a = byId(fromId), b = byId(toId);
      if (!a || !b || a.id === b.id) return false;
      const aOn = isStarter(a.id), bOn = isStarter(b.id);
      if (aOn && bOn) return !G.moveBlockedReason(gs, a.id, b.id);
      if (!aOn && !bOn) return false;
      return !G.swapBlockedReason(aOn ? a : b, aOn ? b : a, gs);
    },
    onDrop: (fromId, toId) => { setFlash(null); setSheet(null); setPicked(null); join(fromId, toId); },
    // let go over a shirt he cannot take: say why, the way a refused tap does
    onRefuse: (fromId, toId) => { setSheet(null); join(fromId, toId); },
    onTap: (id) => { const p = byId(id); if (p) tap(p); },
  });

  const dragging = byId(drag.fromId);

  return (
    <>
    {/* From the hub this is a room like the others: the meters ride on top and
        the way out sits where the thumb looks for it, not below eighteen names.
        On the first visit there is no hub yet, so neither belongs. */}
    {!firstTime && <Meters {...gs.meters} gems={gs.gems} />}
    <div className="screen pad stack pad-b" style={{ gap: 12, paddingBottom: view === 'pitch' ? 122 : undefined }}>
      {!firstTime && <TopBack onBack={onDone} />}
      {firstTime && <Stepper current={6} />}
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

      {promised && (() => {
        const kept = onPitch.some(p => p.id === promised.id);
        return (
          <div className="tile" style={{ padding: '10px 12px', borderColor: kept ? 'var(--win)' : 'var(--gold)', background: kept ? 'rgba(51,194,122,.10)' : 'rgba(233,185,73,.10)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name={kept ? 'handshake' : 'alert'} size={18} color={kept ? 'var(--win)' : 'var(--gold)'} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{`הבטחת ל${promised.name} מקום בהרכב.`}</div>
              <div className="hint" style={{ margin: 0 }}>{kept ? 'הוא בו. מילה זה מילה.' : 'הוא עוד לא בו. אם המשחק יתחיל בלעדיו, כל הסגל יזכור.'}</div>
            </div>
          </div>
        );
      })()}

      <div className="tile" style={{ padding: '10px 12px', background: pickedPlayer ? 'rgba(232,182,76,.12)' : 'var(--surface)', borderColor: pickedPlayer ? 'var(--gold)' : 'var(--line)' }}>
        <div className="row" style={{ gap: 10 }}>
          {/* a fresh message wins: a refused swap has to say why, and the
              standing prompt was hiding the reason */}
          <div style={{ flex: 1, fontSize: 14.5, fontWeight: 700 }} aria-live="polite">
            {flash
              ?? (pickedPlayer
                ? `${pickedPlayer.name} נבחר. לחץ על מי שמחליף אותו.`
                : 'גרור שחקן על שחקן אחר כדי להחליף. לחיצה פותחת את הנתונים שלו.')}
          </div>
          {pickedPlayer && (
            <button className="btn ghost btn-sm" style={{ width: 'auto', padding: '7px 13px' }}
              onClick={() => setPicked(null)}>בטל</button>
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
          {/* the shape, changeable from here and not only on the way to a match.
              A new shape seats the men by fit; he arranges from there */}
          <div className="row" style={{ gap: 7, alignItems: 'stretch' }}>
            {FORMATIONS.map(f => (
              <button key={f.id} className="form-pick" data-on={form.id === f.id ? '1' : '0'}
                onClick={() => { if (form.id !== f.id) { onFormation(f.id); setPicked(null); setSheet(null); setFlash(`עברתם ל-${f.label}. השחקנים יושבו מחדש, אפשר לסדר.`); } }}
                aria-pressed={form.id === f.id}>
                <ShapeMap f={f} on={form.id === f.id} />
                <span className="form-num num">{f.label}</span>
              </button>
            ))}
          </div>
          <LineupPitch formation={form} players={onPitch} kit={homeKit(c)}
            captainId={captainId} selectedId={picked ?? sheet} bannedIds={bannedIds}
            dragId={drag.fromId} overId={drag.overId} overOk={drag.overOk}
            onPointerDown={(p, e) => drag.start(p.id, e)} />
          {outOfPosition.length > 0 && (
            <p className="hint" style={{ margin: 0 }}>
              {outOfPosition.length === 1
                ? `${outOfPosition[0].name} משחק ${ROLE_LABEL[outOfPosition[0].role]} והוא ${POS_LABEL[outOfPosition[0].pos]}. היכולת שלו שם נפגעת.`
                : `${outOfPosition.length} שחקנים לא בתפקיד הטבעי שלהם. השם באדום מראה מי, והמספר על החולצה הוא מה שהמשחק ישתמש בו.`}
            </p>
          )}
        </>
      ) : (
        (['gk', 'def', 'mid', 'atk'] as const).map(line => (
          <Line key={line} title={LINE_LABEL[line]} color={LINE_COLOR[line]} players={byLine(line)}
            render={p => (
              <PlayerRow p={p} traits={tr(p)} state={picked === p.id ? 'selected' : 'idle'}
                captain={p.id === captainId} mark={markOf(p)} role={roleOf(p.id)}
                onOpen={() => tap(p)}
                swap={picked === p.id ? 'armed' : 'arm'} onSwap={() => armStarter(p)} />
            )} />
        ))
      )}

      {view === 'list' && <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink-dim)', marginTop: 4 }}>ספסל החילופים</div>}
      {view === 'pitch' ? (
        /* The bench rides the bottom of the screen. It used to sit in the flow
           under a pitch two screens tall, so moving a man meant carrying him
           through an auto-scroll; now the strip is always at the thumb, and a
           drag in either direction is never longer than the screen. The whole
           tile lifts the man: a sideways swipe pans the strip natively
           (touch-action) and cancels the drag, so the two gestures do not
           fight. A tap still opens his numbers. */
        <Portal><div className="bench-bar" ref={benchBar} role="list" aria-label="ספסל החילופים">
          <span className="bench-bar-cap">ספסל</span>
          <div className="bench-bar-row">
            {sq.bench.map(p => {
              const blocked = !!pickedPlayer && isStarter(pickedPlayer.id) && !!G.swapBlockedReason(pickedPlayer, p, gs);
              const over = drag.overId === p.id;
              const mk = markOf(p);
              return (
                <div key={p.id} className="bench-tile" data-drop-id={p.id} role="listitem"
                  data-on={picked === p.id || sheet === p.id ? '1' : '0'}
                  data-blocked={blocked ? '1' : '0'}
                  data-over={over ? (drag.overOk ? 'ok' : 'no') : '0'}
                  data-drag={drag.fromId === p.id ? '1' : '0'}
                  tabIndex={0} aria-label={`${p.name}, ${p.position}, דירוג ${overall(p)}`}
                  onPointerDown={e => drag.start(p.id, e)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(p); } }}>
                  <span className="bench-tile-pos" style={{ color: LINE_COLOR[LINE_OF[p.position]] }}>{p.position}</span>
                  <span className="bench-tile-ovr num" style={{ color: ovrColor(overall(p)) }}>{overall(p)}</span>
                  <span className="bench-tile-name">
                    {p.id === captainId && <span className="lineup-cap">C</span>}
                    {surnameOf(p.name)}
                  </span>
                  {mk && <span className="bench-tile-mark" data-red={bannedIds.has(p.id) ? '1' : '0'}>{mk}</span>}
                </div>
              );
            })}
          </div>
        </div></Portal>
      ) : (
        <div className="tile" style={{ padding: '4px 10px 8px' }}>
          {sq.bench.map(p => {
            const blocked = !!pickedPlayer && !!G.swapBlockedReason(pickedPlayer, p, gs);
            return (
              <PlayerRow key={p.id} p={p} traits={tr(p)}
                state={blocked ? 'blocked' : pickedPlayer ? 'target' : 'idle'}
                captain={p.id === captainId} mark={markOf(p)}
                onOpen={() => tap(p)}
                swap={pickedPlayer ? 'in' : 'off'} onSwap={() => subInBench(p)} />
            );
          })}
        </div>
      )}

      <div className="spacer" />
      <button className="btn" onClick={onDone}>{firstTime ? 'ממשיכים לשוק ההעברות' : 'חזרה'}</button>

      {/* The ghost under the finger, and it has to be UNDER the finger: it is
          fixed to the viewport, and .screen animates in with a transform, which
          quietly makes "fixed" mean "relative to the top of the screen". That
          put the man a hundred pixels off the thumb that was carrying him.
          Portal is how the rest of the game escapes this, see Portal.tsx. */}
      {dragging && drag.pos && (
        <Portal><div className="drag-ghost" style={{ left: drag.pos.x, top: drag.pos.y }} aria-hidden="true">
          <span className="lineup-shirt" style={{ background: homeKit(c).shirt, borderColor: homeKit(c).trim }}>
            <span className="lineup-ovr num" style={{ color: ovrColor(overall(dragging)) }}>{overall(dragging)}</span>
          </span>
          <span className="drag-ghost-name">{surnameOf(dragging.name)}</span>
        </div></Portal>
      )}

      {sheetPlayer && !card && (
        <PlayerSheet p={sheetPlayer} role={roleOf(sheetPlayer.id)} traits={tr(sheetPlayer)}
          captain={sheetPlayer.id === captainId} mark={markOf(sheetPlayer)}
          onCard={() => setCard(sheetPlayer)}
          onSwap={() => { setPicked(sheetPlayer.id); setSheet(null); setFlash(null); }}
          onClose={() => setSheet(null)} />
      )}

      {card && (
        <PlayerCard p={card} club={c} season={gs.seasonStats[card.id]} career={G.careerOf(gs, card.id)} traits={tr(card)}
          friend={gs.friends.find(x => x.id === card.id)}
          part={!firstTime && onPart ? {
            options: G.partOptions(gs, card.id), blocked: G.partBlockedReason(gs, card.id),
            onPart: kind => {
              const o = G.partOptions(gs, card.id).find(x => x.kind === kind);
              const who = card.name; onPart(card.id, kind); setCard(null); setSheet(null);
              const k = (n: number) => `₪${Math.round(n / 1000)}K`;
              setFlash(o
                ? `${who} עזב. ${k(o.fee)} לקופה${kind === 'friends' ? `, ${k(o.wage)} לשבוע ירדו מההוצאות` : ''}.`
                : `${who} עזב.`);
            },
          } : undefined}
          onClose={() => setCard(null)} />
      )}
    </div>
    </>
  );
}

/**
 * A man's numbers, in a low panel that leaves the pitch in view. The six
 * attributes as bars, the shirt he is in and what it costs him, and the two
 * things a manager does next: swap him, or read the whole card.
 */
function PlayerSheet({ p, role, traits, captain, mark, onCard, onSwap, onClose }: {
  p: Player; role: SlotRole | null; traits: Trait[]; captain: boolean; mark: string | null;
  onCard: () => void; onSwap: () => void; onClose: () => void;
}) {
  const o = overall(p);
  const fit = role ? roleFit(p.position, role) : 'natural';
  const eff = role ? effectiveOverall(p, role, o) : o;
  const isGk = p.position === 'GK';
  const rows: [string, number][] = isGk
    ? ([['diving', 'צלילה'], ['handling', 'תפיסה'], ['reflexes', 'רפלקסים'], ['positioning', 'מיקום'], ['kicking', 'בעיטה']] as const)
        .map(([k, label]) => [label, (p.gk as Record<string, number> | undefined)?.[k] ?? 50] as [string, number])
    : ([['pace', 'מהירות'], ['shooting', 'בעיטה'], ['passing', 'מסירה'], ['dribbling', 'כדרור'], ['defending', 'הגנה'], ['physical', 'פיזי']] as const)
        .map(([k, label]) => [label, p.attrs[k]] as [string, number]);
  const trait = traits[0] ?? null;

  return (
    <Portal>
      <div className="psheet" role="dialog" aria-label={`הנתונים של ${p.name}`}>
        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 17, lineHeight: 1.2 }}>
              {captain && <><CaptainMark size={16} /> </>}
              {isFriendTrait(trait) && <><FriendMark size={16} /> </>}{p.name}
            </div>
            <div className="sub" style={{ fontSize: 13.5, marginTop: 2 }}>
              <span style={{ color: LINE_COLOR[LINE_OF[p.position]], fontWeight: 800 }}>{POS_LABEL[p.position]}</span>
              <span style={{ opacity: .5 }}> · </span>גיל <span className="num">{p.age}</span>
              <span style={{ opacity: .5 }}> · </span>כושר <span className="num">{Math.round(p.fitness)}</span>
              {mark && <><span style={{ opacity: .5 }}> · </span><span style={{ color: mark === 'מורחק' ? 'var(--loss)' : 'var(--ink-faint)' }}>{mark}</span></>}
            </div>
            {trait && <div style={{ fontSize: 13.5, marginTop: 3 }}><span style={{ color: TONE_COLOR[trait.tone], fontWeight: 700 }}>{trait.label}</span><span style={{ opacity: .5 }}> · </span><span className="sub">{renderLine(trait, { ...p, name: surnameOf(p.name) })}</span></div>}
          </div>
          <div style={{ textAlign: 'center', flex: 'none' }}>
            <div className="score-face" style={{ fontSize: 30, color: ovrColor(eff), lineHeight: 1 }}>{eff}</div>
            {eff !== o && <div className="sub num" style={{ fontSize: 12, textDecoration: 'line-through' }}>{o}</div>}
          </div>
          <button className="psheet-x" onClick={onClose} aria-label="סגור">
            <Icon name="chevron" size={15} style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>

        {role && fit !== 'natural' && (
          <div className={`psheet-warn ${fit}`}>
            {fit === 'out'
              ? <>שים לב: {surnameOf(p.name)} לא בעמדה שלו. הוא {POS_LABEL[p.position]} ומשחק {ROLE_LABEL[role]}, והיכולת שלו כאן <b className="num">{eff}</b> במקום <b className="num">{o}</b>.</>
              : <>{surnameOf(p.name)} מכסה את {ROLE_LABEL[role]}, לא העמדה הטבעית שלו. היכולת כאן <b className="num">{eff}</b> במקום <b className="num">{o}</b>.</>}
          </div>
        )}

        <div className="psheet-grid">
          {rows.map(([label, v]) => (
            <div key={label} className="psheet-attr">
              <span className="psheet-attr-k">{label}</span>
              <span className="psheet-attr-bar"><i style={{ width: `${Math.max(4, Math.min(100, v))}%`, background: ovrColor(v) }} /></span>
              <span className="psheet-attr-v num" style={{ color: ovrColor(v) }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <button className="btn btn-sm" style={{ flex: 1 }} onClick={onSwap}><Icon name="sub" size={15} /> החלף</button>
          <button className="btn dark btn-sm" style={{ flex: 1 }} onClick={onCard}>הכרטיס המלא</button>
        </div>
      </div>
    </Portal>
  );
}

/**
 * Pick up, carry, drop. Pointer events, so one code path serves finger and
 * mouse. A press that travels under six pixels is a tap and is handed back as
 * one; past that the man is in the air, whatever the pointer is over that
 * carries a data-drop-id is the target, and letting go over a good one drops.
 * The page scrolls itself when the finger nears an edge, so a man can be
 * carried from the top of the pitch to the bench below it.
 */
function useDrag({ canDrop, onDrop, onRefuse, onTap, bottomInset }: {
  canDrop: (fromId: string, toId: string) => boolean;
  onDrop: (fromId: string, toId: string) => void;
  onRefuse: (fromId: string, toId: string) => void;
  onTap: (id: string) => void;
  /** how much of the bottom of the screen is a fixed drop target, not an edge */
  bottomInset?: () => number;
}) {
  const [fromId, setFromId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overOk, setOverOk] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const live = useRef<{ id: string; x0: number; y0: number; moved: boolean; over: string | null; ok: boolean; scroll: number | null; scrollSpeed: number } | null>(null);
  const cbs = useRef({ canDrop, onDrop, onRefuse, onTap, bottomInset }); cbs.current = { canDrop, onDrop, onRefuse, onTap, bottomInset };

  const targetAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    return el?.closest<HTMLElement>('[data-drop-id]')?.dataset.dropId ?? null;
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = live.current; if (!d) return;
      const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      if (!d.moved) {
        if (Math.hypot(dx, dy) < 6) return;
        d.moved = true;
        setFromId(d.id);
      }
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY });
      const t = targetAt(e.clientX, e.clientY);
      const over = t && t !== d.id ? t : null;
      const ok = over ? cbs.current.canDrop(d.id, over) : false;
      if (over !== d.over || ok !== d.ok) { d.over = over; d.ok = ok; setOverId(over); setOverOk(ok); }
      // the edges scroll the page so a man can reach a shirt that is off
      // screen, and the strip the bench occupies scrolls nothing, see scroll.ts
      const speed = edgeScrollSpeed(e.clientY, window.innerHeight, cbs.current.bottomInset?.() ?? 0);
      d.scrollSpeed = speed;
      if (speed && d.scroll === null) {
        const tick = () => { const dd = live.current; if (!dd || dd.scroll === null) return; window.scrollBy(0, dd.scrollSpeed); dd.scroll = requestAnimationFrame(tick); };
        d.scroll = requestAnimationFrame(tick);
      }
      if (!speed && d.scroll !== null) { cancelAnimationFrame(d.scroll); d.scroll = null; }
    };
    const up = (e: PointerEvent) => {
      const d = live.current; if (!d) return;
      live.current = null;
      if (d.scroll !== null) cancelAnimationFrame(d.scroll);
      document.body.classList.remove('dragging');
      if (!d.moved) { cbs.current.onTap(d.id); return; }
      const t = targetAt(e.clientX, e.clientY);
      setFromId(null); setOverId(null); setOverOk(false); setPos(null);
      if (t && t !== d.id) { if (cbs.current.canDrop(d.id, t)) cbs.current.onDrop(d.id, t); else cbs.current.onRefuse(d.id, t); }
    };
    const cancel = () => {
      const d = live.current; if (!d) return;
      live.current = null;
      if (d.scroll !== null) cancelAnimationFrame(d.scroll);
      document.body.classList.remove('dragging');
      setFromId(null); setOverId(null); setOverOk(false); setPos(null);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
  }, []);

  const start = (id: string, e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    live.current = { id, x0: e.clientX, y0: e.clientY, moved: false, over: null, ok: false, scroll: null, scrollSpeed: 0 };
    document.body.classList.add('dragging');
  };

  return { fromId, overId, overOk, pos, start };
}

const POS_LABEL: Record<string, string> = {
  GK: 'שוער', CB: 'בלם', LB: 'מגן שמאלי', RB: 'מגן ימני',
  CDM: 'קשר הגנתי', CM: 'קשר', CAM: 'קשר התקפי',
  LW: 'כנף שמאלית', RW: 'כנף ימנית', ST: 'חלוץ',
};

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
                <span style={{ display: 'block', fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isFriendTrait(t) && <><FriendMark size={15} /> </>}{p.name}
                </span>
                <span style={{ display: 'block', fontSize: 14.5, lineHeight: 1.45, color: t ? 'var(--ink-dim)' : 'var(--ink-faint)' }}>
                  {t
                    ? <><span style={{ color: TONE_COLOR[t.tone], fontWeight: 700 }}>{t.label}</span><span style={{ opacity: .5 }}> · </span>{renderLine(t, { ...p, name: surnameOf(p.name) })}</>
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
