import { useState } from 'react';
import * as G from '../../game/state.ts';
import { ROUND_NAMES, EURO_ROUNDS, legsIn, aggregate, champion, prizeFor } from '../../game/euro.ts';
import type { EuroTie } from '../../game/euro.ts';
import { euroClub, asClub } from '../../data/europeClubs.ts';
import { moneyShort } from '../../data/money.ts';
import { Crest } from '../components/Crest.tsx';
import { TopBack } from '../components/TopBack.tsx';
import { Meters } from '../components/bits.tsx';

/**
 * The competition as it stands: a tab a round, the ties of that round with
 * their legs, his own tie marked, the rounds still to be drawn as empty
 * slots, and the champion when there is one. Reads the save, writes nothing.
 */
export function EuroBracketScreen({ gs, onBack }: { gs: G.GameState; onBack: () => void }) {
  const e = gs.euro;
  const [round, setRound] = useState(e?.round ?? 0);
  const me = G.club(gs);
  const clubOf = (id: string) => id === gs.clubId ? me : asClub(euroClub(id)!);
  const ties: EuroTie[] = e?.ties[round] ?? [];
  const champ = e ? champion(e) : null;
  const slots = 8 >> round;
  const status = !e ? '' : e.status === 'won' ? 'הגביע שלכם' : e.status === 'out' ? 'הודחתם העונה' : `עדיין בפנים, ${ROUND_NAMES[e.round]}`;
  return (
    <div className="screen pad stack pad-b" style={{ gap: 14, minHeight: '100%' }}>
      <Meters {...gs.meters} gems={gs.gems} />
      <TopBack onBack={onBack} title="ליגת אירופה" />

      <div className="match-hero" data-euro="1">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b style={{ fontSize: 16 }}>{status}</b>
            <div className="sub" style={{ fontSize: 13 }}>
              {e && e.status === 'on' ? `הפרס על ${ROUND_NAMES[Math.min(e.round + 1, 3)]}: ${moneyShort(prizeFor(e.round + 1))} שקל` : champ ? `האלופה: ${clubOf(champ).name}` : ''}
            </div>
          </div>
          {champ && <Crest club={clubOf(champ)} size={48} />}
        </div>
      </div>

      <div className="row eu-tabs">
        {ROUND_NAMES.map((n, i) => (
          <button key={n} className="chip" data-on={i === round ? '1' : '0'} onClick={() => setRound(i)}>{n}</button>
        ))}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        {Array.from({ length: slots }, (_, i) => {
          const t = ties[i];
          if (!t) return <div key={i} className="eu-tie eu-tie-empty">טרם הוגרל</div>;
          const mine = t.a === gs.clubId || t.b === gs.clubId;
          const a = clubOf(t.a), b = clubOf(t.b);
          const [x, y] = aggregate(t);
          const legs = t.legs.map(l => `${l[0]}:${l[1]}`).join(' , ');
          const line = t.legs.length === 0 ? 'טרם שוחק'
            : legsIn(round) === 2 && t.legs.length === 2 ? `${legs} (סה"כ ${x}:${y})`
            : legs;
          const pens = t.pens ? ` פנדלים ${t.pens[0]}:${t.pens[1]}` : '';
          return (
            <div key={i} className="eu-tie" data-mine={mine ? '1' : '0'} data-won={t.winner ? (t.winner === t.a ? 'a' : 'b') : undefined}>
              <div className="eu-tie-side" data-w={t.winner === t.a ? '1' : '0'}><Crest club={a} size={34} /><span>{a.short}</span></div>
              <div className="eu-tie-score num">{line}{pens}</div>
              <div className="eu-tie-side" data-w={t.winner === t.b ? '1' : '0'}><Crest club={b} size={34} /><span>{b.short}</span></div>
            </div>
          );
        })}
      </div>
      {e && round === EURO_ROUNDS - 1 && e.status !== 'on' && !champ && <p className="hint">הגמר ישוחק אחרי חצי הגמר.</p>}
    </div>
  );
}
