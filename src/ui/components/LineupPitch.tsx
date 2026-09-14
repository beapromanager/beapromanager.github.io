import type { Player } from '../../engine/matchEngine.ts';
import { surnameOf } from '../../data/names.ts';
import { overall } from '../../engine/matchEngine.ts';
import type { Formation, FormationSlot } from '../../data/formations.ts';
import { ROLE_LABEL, roleFit } from '../../data/formations.ts';
import type { Kit } from '../../data/kits.ts';
import { ovrColor } from '../../game/cards.ts';

/**
 * The starting eleven, on a pitch.
 *
 * A team sheet as a list can tell you a man is a centre back. It cannot tell
 * you he is playing right back tonight because you have three centre backs and
 * no full back, which is exactly the thing a manager needs to see. Every shirt
 * here sits in its slot and says what that slot is, so the shape and the holes
 * in it are one glance.
 */

export interface LineupSlot {
  slot: FormationSlot;
  player: Player;
}

export function LineupPitch({ formation, players, kit, captainId, selectedId, onPick }: {
  formation: Formation;
  /** eleven, index for index with formation.slots */
  players: Player[];
  kit: Kit;
  captainId?: string | null;
  selectedId?: string | null;
  onPick?: (p: Player, slot: FormationSlot) => void;
}) {
  const label = shortNames(players);

  return (
    <div className="lineup-pitch">
      <svg viewBox="0 0 100 140" preserveAspectRatio="none" className="lineup-turf" aria-hidden="true">
        <g fill="none" stroke="rgba(255,255,255,.20)" strokeWidth="0.5">
          <rect x="2" y="2" width="96" height="136" />
          <line x1="2" y1="70" x2="98" y2="70" />
          <circle cx="50" cy="70" r="13" />
          {/* our box at the bottom, theirs at the top */}
          <rect x="24" y="118" width="52" height="20" />
          <rect x="38" y="130" width="24" height="8" />
          <rect x="24" y="2" width="52" height="20" />
          <rect x="38" y="2" width="24" height="8" />
        </g>
      </svg>

      {players.map((p, i) => {
        const slot = formation.slots[i];
        if (!slot || !p) return null;
        // d 0 is the back of the block and d 1 its front, so the deepest men
        // sit at the bottom of the picture and the team attacks upwards. The
        // keeper is pulled out of that scale: the engine keeps him level with
        // the centre backs because it stretches the block around play, but on a
        // still team sheet he has to be behind them or he lands on their heads.
        const top = slot.line === 'GK' ? 92 : 82 - slot.d * 70;
        const left = slot.y * 100;
        const fit = roleFit(p.position, slot.role);
        const on = selectedId === p.id;
        return (
          <button key={p.id} className="lineup-man" data-fit={fit} data-on={on ? '1' : '0'}
            style={{ top: `${top}%`, left: `${left}%` }}
            onClick={() => onPick?.(p, slot)}
            aria-label={`${p.name}, ${ROLE_LABEL[slot.role]}, דירוג ${overall(p)}${fit === 'out' ? ', לא בתפקידו' : ''}`}
            aria-pressed={on}>
            <span className="lineup-shirt" style={{ background: kit.shirt, borderColor: kit.trim }}>
              <span className="lineup-ovr num" style={{ color: ovrColor(overall(p)) }}>{overall(p)}</span>
            </span>
            <span className="lineup-role" data-fit={fit}>{slot.role}</span>
            <span className="lineup-name">
              {captainId === p.id && <span className="lineup-cap">C</span>}
              {label.get(p.id)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * What to write under each shirt. A family name is all that fits, but a squad
 * can easily hold two of them, and two identical labels on one pitch is worse
 * than a longer one, so a clash falls back to an initial and the family name.
 */
function shortNames(players: Player[]): Map<string, string> {
  const count = new Map<string, number>();
  for (const p of players) {
    const last = family(p.name);
    count.set(last, (count.get(last) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const p of players) {
    const last = family(p.name);
    const first = p.name.split(' ')[0];
    out.set(p.id, (count.get(last) ?? 0) > 1 && first !== last ? `${first[0]}. ${last}` : last);
  }
  return out;
}

const family = surnameOf;
