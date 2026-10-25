/**
 * The neighbourhood league's cabinet on the coach's screen (Itzik, 25.10): a shelf of cups, gold for a title, silver
 * for second, bronze for third, each with its date and its league; the counts above; the month's way to the triple
 * below. Drawn in plain SVG, no real cups, no real clubs.
 */
import * as G from '../../game/state.ts';
import { cabinetCounts, monthProgress, monthDots, weekendDate, WEEKEND_TRIPLE_GEMS, WEEKEND_TRIPLE_AT, type CabinetEntry } from '../../game/weekendPrize.ts';
import { serverNow } from '../../game/weekend.ts';
import '../cabinet.css';

const METAL: Record<number, { a: string; b: string; c: string; name: string }> = {
  1: { a: '#FFE9A6', b: '#E9B949', c: '#8A6416', name: 'זהב' },
  2: { a: '#F4F6F8', b: '#B9C0C8', c: '#646C74', name: 'כסף' },
  3: { a: '#F2C9A0', b: '#C27A3E', c: '#6E3D17', name: 'ארד' },
};

function Cup({ place, star }: { place: number; star?: boolean }) {
  const m = METAL[place] ?? METAL[1];
  const id = `cup-${place}`;
  return (
    <svg viewBox="0 0 48 56" width="44" height="52" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={m.a} /><stop offset=".55" stopColor={m.b} /><stop offset="1" stopColor={m.c} /></linearGradient>
      </defs>
      <path d="M12 6h24v10c0 9-5 15-12 15S12 25 12 16z" fill={`url(#${id})`} stroke={m.c} strokeWidth="1.4" />
      <path d="M12 9H6c0 7 3 11 8 12M36 9h6c0 7-3 11-8 12" fill="none" stroke={m.b} strokeWidth="2.4" strokeLinecap="round" />
      <rect x="21" y="31" width="6" height="8" fill={m.b} stroke={m.c} strokeWidth="1" />
      <rect x="14" y="39" width="20" height="5" rx="1.5" fill={`url(#${id})`} stroke={m.c} strokeWidth="1" />
      <rect x="11" y="44" width="26" height="7" rx="1.5" fill="#2B2116" stroke={m.c} strokeWidth="1" />
      <text x="24" y="22" textAnchor="middle" fontSize="11" fontWeight="900" fill={m.c}>{place}</text>
      {star && <path d="M40 2l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L34.2 6.3l4-.6z" fill="#FFE9A6" stroke="#8A6416" strokeWidth=".8" />}
    </svg>
  );
}

export function WeekendCabinet({ gs }: { gs: G.GameState }) {
  const rec = gs.weekend;
  const k = cabinetCounts(rec);
  // the month by the league's own clock (the server's, learned on every answer), the same one the weekend screens read
  const month = monthProgress(rec, serverNow());
  const shelf: Array<CabinetEntry | null> = [...[...k.shelf].sort((a, b) => b.final - a.final), ...Array.from({ length: k.legacy }, () => null)];
  const empty = shelf.length === 0;
  return (
    <div className="tile cab" style={{ padding: '13px 14px' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="label-cap">ארון הגביעים · ליגת השכונה</div>
      </div>
      {!empty && (
        <div className="sub" style={{ marginTop: 6, fontSize: 13 }}>
          אליפויות: <span className="num">{k.first}</span> · סגנויות: <span className="num">{k.second}</span> · מקום שלישי: <span className="num">{k.third}</span>
        </div>
      )}
      {empty ? (
        <p className="sub" style={{ margin: '10px 0 2px', lineHeight: 1.55 }}>הארון עוד ריק. ליגת השכונה נפתחת כל חמישי ב-20:00. הגביע הראשון מחכה לך.</p>
      ) : (
        <div className="cab-shelf" role="list">
          {shelf.map((c, i) => (
            <div key={c ? c.nonce : `legacy-${i}`} className="cab-cup" role="listitem" aria-label={c ? `מקום ${c.place}, ${c.leagueName}, ${weekendDate(c.final)}` : 'אליפות סופשבוע'}>
              <Cup place={c ? c.place : 1} star={!!c?.tripleBonus} />
              {c ? (
                <>
                  <div className="cab-date num">{weekendDate(c.final)}</div>
                  <div className="cab-name">{c.leagueName}</div>
                  {c.tripleBonus && <div className="cab-triple">משולש</div>}
                </>
              ) : <div className="cab-name">אליפות סופשבוע</div>}
            </div>
          ))}
        </div>
      )}
      <div className={`cab-month ${month.paid ? 'paid' : ''}`}>
        {month.paid
          ? <>החודש: משולש! ✓</>
          : <>החודש: <span className="cab-dots" aria-label={`${month.count} מתוך ${WEEKEND_TRIPLE_AT}`}>{monthDots(month.count)}</span> אליפויות. עוד {WEEKEND_TRIPLE_AT - Math.min(month.count, WEEKEND_TRIPLE_AT) === 1 ? 'אחת' : <span className="num">{WEEKEND_TRIPLE_AT - Math.min(month.count, WEEKEND_TRIPLE_AT)}</span>} ל-<span className="num">{WEEKEND_TRIPLE_GEMS}</span> 💎</>}
      </div>
    </div>
  );
}
