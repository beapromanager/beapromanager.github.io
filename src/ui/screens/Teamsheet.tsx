import { useMemo } from 'react';
import * as G from '../../game/state.ts';
import { surnameOf } from '../../data/names.ts';
import { formation } from '../../data/formations.ts';
import { Icon } from '../components/Icon.tsx';

/**
 * The team sheet, the way it is actually handed to a team: chalk on the old
 * board in the dressing room, minutes before kickoff. Nothing here is edited,
 * that already happened in the squad room. This screen is the ritual: the
 * shape drawn in chalk, eleven names on it, the bench scribbled underneath,
 * and the door to the pitch.
 *
 * The chalk is type and CSS, not an image: every name leans a little
 * differently (a deterministic jitter off the name itself, so the board does
 * not twitch between renders), the lines are dashed and slightly rotated, and
 * the whole thing sits in a wooden frame on the dressing room wall.
 */
export function TeamsheetScreen({ gs, onGo }: { gs: G.GameState; onGo: () => void }) {
  const fx = G.playerFixture(gs)!;
  const myId = G.club(gs).id;
  const opp = gs.league.clubs.find(c => c.id === (fx.homeId === myId ? fx.awayId : fx.homeId))!;
  const form = formation(gs.tactic?.formation);
  const eleven = useMemo(() => G.lineup(gs), [gs]);
  const bench = G.mySquad(gs).bench;
  const captainId = G.currentCaptainId(gs);

  return (
    <div className="screen pad stack pad-b chalk-room" style={{ gap: 14, minHeight: '100%' }}>
      <div className="stack" style={{ alignItems: 'center', gap: 4, marginTop: 10 }}>
        <span className="label-cap">חדר ההלבשה</span>
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
                <div key={p.id} className="chalk-man" style={{
                  top: `${top}%`, left: `${Math.max(9, Math.min(91, left))}%`,
                  transform: `translate(-50%,-50%) rotate(${lean(p.name)}deg)`,
                  animationDelay: `${0.12 + i * 0.07}s`,
                }}>
                  <span className="chalk-ring" aria-hidden="true" />
                  <span className="chalk-name">
                    {p.id === captainId && <span className="chalk-cap num">C </span>}
                    {surnameOf(p.name)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="chalk-bench">
            <span className="chalk-bench-cap">ספסל: </span>
            {bench.map(p => surnameOf(p.name)).join(', ')}
          </div>
        </div>
      </div>

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
