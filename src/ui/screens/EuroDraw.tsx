import { useState } from 'react';
import * as G from '../../game/state.ts';
import { ROUND_NAMES } from '../../game/euro.ts';
import { euroClub, asClub } from '../../data/europeClubs.ts';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';

/**
 * The draw, from the manager's seat. Itzik's rule: a POV mini-game, the user
 * presses to pull a ball, skippable. The draw itself was made in the summer
 * and lives in the save, so this screen reveals it one tie at a time and
 * never changes it: a reload shows the same eight ties in the same order.
 */
export function EuroDrawScreen({ gs, onDone }: { gs: G.GameState; onDone: () => void }) {
  const ties = gs.euro?.ties[0] ?? [];
  const [shown, setShown] = useState(0);
  const [rolling, setRolling] = useState(false);
  const me = G.club(gs);
  const clubOf = (id: string) => id === gs.clubId ? me : asClub(euroClub(id)!);
  const done = shown >= ties.length;
  const pull = () => {
    if (rolling || done) return;
    setRolling(true);
    window.setTimeout(() => { setShown(s => s + 1); setRolling(false); }, 900);
  };
  return (
    <div className="screen pad stack pad-b" style={{ gap: 14, minHeight: '100%' }}>
      <div className="match-hero" data-euro="1">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="label-cap" style={{ color: 'var(--euro, #6FA8FF)' }}>ליגת אירופה</span>
          <span className="chip chip-euro">הגרלת {ROUND_NAMES[0]}</span>
        </div>
        <p className="hint" style={{ margin: 0 }}>
          {done ? 'ההגרלה הושלמה. המשחק הראשון לפני המחזור השני.' : 'שישה עשר כדורים בקערה. לוחצים ומושכים.'}
        </p>
      </div>

      {!done && (
        <button className="eu-bowl" onClick={pull} disabled={rolling} aria-label="מושכים כדור">
          <span className="eu-ball" data-rolling={rolling ? '1' : '0'} aria-hidden="true" />
          <span className="eu-bowl-word">{rolling ? 'הכדור יוצא...' : `למשוך כדור (${ties.length - shown} זוגות נותרו)`}</span>
        </button>
      )}

      <div className="stack" style={{ gap: 8 }}>
        {ties.slice(0, shown).map((t, i) => {
          const mine = t.a === gs.clubId || t.b === gs.clubId;
          const a = clubOf(t.a), b = clubOf(t.b);
          return (
            <div key={i} className="eu-tie" data-mine={mine ? '1' : '0'} style={{ ['--i' as never]: i } as React.CSSProperties}>
              <div className="eu-tie-side"><Crest club={a} size={34} /><span>{a.short}</span></div>
              <span className="eu-tie-vs">{mine ? 'אתם' : 'נגד'}</span>
              <div className="eu-tie-side"><Crest club={b} size={34} /><span>{b.short}</span></div>
            </div>
          );
        })}
      </div>

      {done ? (
        <button className="btn" onClick={onDone}>לעץ המפעל <Icon name="chevron" size={17} /></button>
      ) : (
        <button className="btn dark" onClick={onDone}>דלג על ההגרלה</button>
      )}
    </div>
  );
}
