import type { EuroState } from '../../game/euro.ts';
import { summitStops } from '../../game/summitPath.ts';
import { euroClub, asClub } from '../../data/europeClubs.ts';
import { Crest } from './Crest.tsx';

/**
 * דרך הזהב (R12): the road to the summit final as four stops, the last sixteen, the quarter, the semi and the final,
 * read right to left. Each stop shows who it was against (or that the draw has not reached it), the score of the
 * tie, and whether he went through. The stop he stands at breathes three times; once he is out the rest dims.
 * Pure reading of the competition (summitStops, src/game/summitPath.ts): nothing here writes.
 */
export function SummitPath({ euro, myId }: { euro: EuroState; myId: string }) {
  const stops = summitStops(euro, myId);
  // right to left: the last sixteen on the right, the final on the left
  const xs = [350, 250, 150, 50];
  const reached = stops.reduce((n, s, i) => (s.state === 'done' || s.state === 'now' || s.state === 'out' ? i : n), 0);
  const line = `M${xs[0]} 20 C 320 6, 280 34, ${xs[1]} 20 S 180 6, ${xs[2]} 20 S 80 34, ${xs[3]} 20`;
  const doneTo = stops.filter(s => s.state === 'done').length;
  return (
    <div className="el-path" role="group" aria-label="דרך הזהב לגמר">
      <svg viewBox="0 0 400 40" aria-hidden="true" focusable="false">
        <path className="el-path-line" d={line} />
        {doneTo > 0 && <path className="el-path-done" d={line} pathLength={3} strokeDasharray={`${Math.min(doneTo, 3)} 3`} />}
      </svg>
      <div className="el-stops" dir="rtl">
        {stops.map((s, i) => {
          const opp = s.oppId ? euroClub(s.oppId) : null;
          return (
            <div key={s.round} className="el-stop" data-state={s.state} data-reached={i <= reached ? '1' : '0'}>
              <div className="el-dot">
                {opp ? <Crest club={asClub(opp)} size={24} /> : <span className="el-dot-empty" aria-hidden="true">·</span>}
              </div>
              <span className="el-stop-name">{s.name}</span>
              <span className="el-stop-opp">{opp ? opp.short : s.state === 'gone' ? 'הודחנו לפני' : 'טרם הוגרל'}</span>
              {s.score && <span className="el-stop-score" dir="ltr">{s.score}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
