import { useMemo, useState } from 'react';
import * as G from '../../game/state.ts';
import { surnameOf } from '../../data/names.ts';
import { formation } from '../../data/formations.ts';
import { Icon } from '../components/Icon.tsx';

/**
 * The team sheet, the way it is actually handed to a team: chalk on the old
 * board in the dressing room, minutes before kickoff. The shape drawn in chalk, eleven
 * names on it, the bench scribbled underneath, and the door to the pitch. It
 * is also where the sheet is last changed, because this is the moment a
 * manager actually looks at his side: see TeamsheetScreen below.
 *
 * The chalk is type and CSS, not an image: every name leans a little
 * differently (a deterministic jitter off the name itself, so the board does
 * not twitch between renders), the lines are dashed and slightly rotated, and
 * the whole thing sits in a wooden frame on the dressing room wall.
 */
/**
 * The last word on the eleven, in the room where it is read out.
 *
 * The board used to be a poster: here is your side, good luck. A manager
 * who saw the sheet and wanted one change had to walk back out of the
 * tunnel to the squad screen and come in again, which is why the change was
 * usually not made. The same board now takes the change: tap the man going
 * off, tap the man coming on, and the chalk is redrawn.
 *
 * Nothing new decides what is legal. Every swap goes through the same rule
 * the squad screen uses, so a keeper cannot be left out of goal and a man
 * who is suspended cannot be walked onto the pitch from here either, and
 * when the rule says no it says why rather than doing nothing.
 */
export function TeamsheetScreen({ gs, onGo, onSwap, onMove }: {
  gs: G.GameState;
  onGo: () => void;
  /** a starter out, a bench man in */
  onSwap: (starterId: string, benchId: string) => void;
  /** two of the eleven trading shirts */
  onMove: (aId: string, bId: string) => void;
}) {
  const [picked, setPicked] = useState<{ id: string; from: 'eleven' | 'bench' } | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const fx = G.playerFixture(gs)!;
  const myId = G.club(gs).id;
  const opp = gs.league.clubs.find(c => c.id === (fx.homeId === myId ? fx.awayId : fx.homeId))!;
  const form = formation(gs.tactic?.formation);
  const eleven = useMemo(() => G.lineup(gs), [gs]);
  const bench = G.mySquad(gs).bench;
  const captainId = G.currentCaptainId(gs);

  /**
   * One tap picks a man, the second says what happens to him.
   *
   * It reads in both directions on purpose: nobody thinks "out first, then
   * in". Two of the eleven trade shirts, a bench man and a starter trade
   * places, and a second tap on the same man puts the chalk down.
   */
  const tap = (id: string, from: 'eleven' | 'bench') => {
    setRefused(null);
    if (!picked) { setPicked({ id, from }); return; }
    if (picked.id === id) { setPicked(null); return; }
    if (picked.from === from) {
      if (from === 'eleven') { onMove(picked.id, id); setPicked(null); return; }
      setPicked({ id, from });                 // still choosing who comes on
      return;
    }
    const starterId = picked.from === 'eleven' ? picked.id : id;
    const benchId = picked.from === 'eleven' ? id : picked.id;
    const out = eleven.find(p => p.id === starterId);
    const on = bench.find(p => p.id === benchId);
    if (!out || !on) { setPicked(null); return; }
    const no = G.swapBlockedReason(out, on, gs);
    if (no) { setRefused(no); setPicked(null); return; }
    onSwap(starterId, benchId);
    setPicked(null);
  };

  return (
    <div className="screen pad stack pad-b chalk-room" style={{ gap: 14, minHeight: '100%' }}>
      <div className="stack" style={{ alignItems: 'center', gap: 4, marginTop: 10, maxWidth: 330 }}>
        <span className="label-cap">חדר ההלבשה</span>
        {/* what the moment is, and then how the board works. The second line
            is the whole reason anybody finds out it can be tapped at all. */}
        <p style={{
          margin: 0, textAlign: 'center', fontSize: 14.5, lineHeight: 1.45,
          fontWeight: 600, color: 'var(--ink)', textWrap: 'balance',
        }}>
          רגע לפני שעולים למגרש זה הזמן לבחור את ההרכב.
        </p>
        <p className="hint" style={{ margin: 0, textAlign: 'center' }}>
          לחץ על שחקן בהרכב ואז על מי שייכנס במקומו.
        </p>
      </div>

      <div className="chalk-frame">
        <div className="chalk-board">
          <div className="chalk-title">ההרכב מול {opp.short}</div>
          <div className="chalk-shape num">{form.label}</div>

          <div className="chalk-pitch">
            {/* the pitch, three chalk strokes: the outline, the halfway line, the circle */}
            <svg viewBox="0 0 100 118" preserveAspectRatio="none" className="chalk-lines" aria-hidden="true">
              <g fill="none" stroke="rgba(236,232,220,.34)" strokeWidth="0.7" strokeLinecap="round" strokeDasharray="3.5 2.2">
                <rect x="3" y="3" width="94" height="112" rx="1.5" transform="rotate(-.4 50 59)" />
                <line x1="4" y1="60" x2="96" y2="59" />
                <circle cx="50" cy="59.5" r="10.5" transform="rotate(2 50 59.5)" />
              </g>
            </svg>

            {eleven.map((p, i) => {
              const slot = form.slots[i];
              if (!slot || !p) return null;
              const top = slot.line === 'GK' ? 90 : 79 - slot.d * 66;
              const left = slot.y * 100;
              return (
                <button key={p.id} type="button" className="chalk-man"
                  data-picked={picked?.id === p.id ? '1' : '0'}
                  aria-label={`${p.name}, ${p.position}`}
                  onClick={() => tap(p.id, 'eleven')}
                  style={{
                  top: `${top}%`, left: `${Math.max(9, Math.min(91, left))}%`,
                  transform: `translate(-50%,-50%) rotate(${lean(p.name)}deg)`,
                  animationDelay: `${0.12 + i * 0.07}s`,
                }}>
                  <span className="chalk-ring" aria-hidden="true" />
                  <span className="chalk-name">
                    {p.id === captainId && <span className="chalk-cap num">C </span>}
                    {surnameOf(p.name)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="chalk-bench">
            <span className="chalk-bench-cap">ספסל: </span>
            {bench.map(p => (
              <button key={p.id} type="button" className="chalk-sub"
                data-picked={picked?.id === p.id ? '1' : '0'}
                aria-label={`${p.name}, ${p.position}, על הספסל`}
                onClick={() => tap(p.id, 'bench')}>
                {surnameOf(p.name)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {refused && (
        <p className="hint" aria-live="polite" style={{
          margin: 0, textAlign: 'center', color: 'var(--loss)', fontWeight: 700,
        }}>{refused}</p>
      )}

      <div className="spacer" />
      <button className="btn" style={{ animation: 'riseIn .4s var(--ease-out) 1s both' }} onClick={onGo}>
        למשחק <Icon name="chevron" size={17} />
      </button>
    </div>
  );
}

/**
 * How much a name leans on the board, minus two to plus two degrees. Hashed
 * off the name so the same sheet always looks the same, chalk does not move
 * between glances.
 */
function lean(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ((h % 41) - 20) / 10;
}
