import { useState } from 'react';
import * as G from '../../game/state.ts';
import { shootout, myTie, ROUND_NAMES } from '../../game/euro.ts';
import { createRng } from '../../engine/matchEngine.ts';
import { euroClub, asClub } from '../../data/europeClubs.ts';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';

/**
 * The shootout after a level tie. A plain, seeded replay for now: the kicks
 * in order, his side first, and one button. The POV screen Itzik asked for
 * (the shooter's eyes when he kicks, the keeper's when they do) replaces the
 * body of this screen; the state it hands back, [mine, theirs], stays.
 */
export function ShootoutScreen({ gs, onDone }: { gs: G.GameState; onDone: (score: [number, number]) => void }) {
  const [res] = useState(() => shootout(createRng(G.drawSeed(gs, 150_020 + (gs.euro?.round ?? 0)))));
  const [shown, setShown] = useState(0);
  const tie = gs.euro ? myTie(gs.euro, gs.clubId) : null;
  const opp = tie ? euroClub(tie.a === gs.clubId ? tie.b : tie.a) : null;
  const me = G.club(gs);
  const done = shown >= res.kicks.length;
  const tally = (i: 0 | 1) => res.kicks.slice(0, shown).filter(k => k[i]).length;
  return (
    <div className="screen pad stack pad-b" style={{ gap: 14, minHeight: '100%' }}>
      <div className="match-hero" data-euro="1">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <span className="label-cap" style={{ color: 'var(--euro, #6FA8FF)' }}>פנדלים</span>
          <span className="chip chip-euro">{ROUND_NAMES[gs.euro?.round ?? 0]}</span>
        </div>
        <div className="row" style={{ gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="stack" style={{ alignItems: 'center', gap: 6, flex: 1 }}>
            <Crest club={me} size={48} />
            <b style={{ fontSize: 14 }}>{me.short}</b>
          </div>
          <b className="num" style={{ fontSize: 30 }}>{tally(0)}:{tally(1)}</b>
          <div className="stack" style={{ alignItems: 'center', gap: 6, flex: 1 }}>
            {opp && <Crest club={asClub(opp)} size={48} />}
            <b style={{ fontSize: 14 }}>{opp?.short ?? ''}</b>
          </div>
        </div>
      </div>

      <div className="tile stack" style={{ gap: 8 }}>
        {res.kicks.slice(0, shown).map((k, i) => (
          <div key={i} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="sub">בעיטה {i + 1}</span>
            <span>{me.short}: {k[0] ? 'שער' : 'החמצה'}</span>
            <span>{opp?.short ?? ''}: {k[1] ? 'שער' : 'החמצה'}</span>
          </div>
        ))}
        {shown === 0 && <p className="hint" style={{ margin: 0 }}>שוויון אחרי המשחקים. הפנדלים יכריעו.</p>}
      </div>

      {done ? (
        <button className="btn" onClick={() => onDone(res.score)}>
          {res.score[0] > res.score[1] ? 'עברנו' : 'הודחנו'} <Icon name="chevron" size={17} />
        </button>
      ) : (
        <button className="btn" onClick={() => setShown(s => s + 1)}>הבעיטה הבאה</button>
      )}
    </div>
  );
}
