import { TopBack } from '../components/TopBack.tsx';
import { scrollToTop } from '../scroll.ts';
import { useState } from 'react';
import * as G from '../../game/state.ts';
import { sortedTable } from '../../game/league.ts';
import { TOP_TIER } from '../../game/career.ts';
import { EURO_LIVE } from '../../game/euro.ts';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';

/**
 * The league, in full. The mini table on the hub answers "am I winning", this
 * screen answers "who is any good", which is the question that makes you care
 * about players who are not yours: the golden boot race, the assists chart, and
 * a full division table with the columns a supporter actually reads.
 */

type Tab = 'table' | 'goals' | 'assists';

const TABS: { id: Tab; label: string }[] = [
  { id: 'table', label: 'טבלה' },
  { id: 'goals', label: 'מלך השערים' },
  { id: 'assists', label: 'מלך הבישולים' },
];

export function StandingsScreen({ gs, onBack }: { gs: G.GameState; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('table');
  const c = G.club(gs);

  return (
    <div className="screen pad stack pad-b" style={{ gap: 12, minHeight: '100%' }}>
    <TopBack onBack={onBack} />
      <div className="row" style={{ gap: 10, marginTop: 6 }}>
        <Icon name="trophy" size={22} color="var(--gold)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="h2">הליגה</div>
          <div className="sub" style={{ marginTop: 2 }}>
            מחזור <span className="num">{gs.week}</span> מתוך <span className="num">{gs.league.rounds}</span>
          </div>
        </div>
      </div>

      <div className="seg">
        {TABS.map(t => (
          <button key={t.id} data-on={tab === t.id ? '1' : '0'} onClick={() => { setTab(t.id); scrollToTop(); }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'table' ? <FullTable gs={gs} /> : <Chart gs={gs} by={tab} />}

      <div className="spacer" />
      <button className="btn dark" onClick={onBack}>חזרה לבית</button>
      <div className="hint" style={{ textAlign: 'center', margin: 0 }}>
        {c.short} · {gs.league.clubs.length} קבוצות בליגה
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ table */

const HEAD: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 800, color: 'var(--ink-faint)', textAlign: 'center',
  padding: '0 0 7px',
};
const CELL: React.CSSProperties = { textAlign: 'center', fontWeight: 700, fontSize: 12.5 };

function FullTable({ gs }: { gs: G.GameState }) {
  const rows = sortedTable(gs.league);
  // below the top flight the first two go up; in ליגת העל nobody goes up and only the champion opens the road to Europe
  const top = (gs.league.clubs.find(x => x.id === gs.clubId)?.tier ?? 1) >= TOP_TIER;
  const promo = top ? 1 : 2;
  const topColor = EURO_LIVE ? 'var(--euro, #6FA8FF)' : 'var(--gold)';
  const drop = gs.league.clubs.length;               // last one falls

  return (
    <div className="tile" style={{ padding: '11px 9px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...HEAD, width: 22 }}>#</th>
            <th style={{ ...HEAD, textAlign: 'start', paddingInlineStart: 6 }}>קבוצה</th>
            <th style={{ ...HEAD, width: 24 }}>מש</th>
            <th style={{ ...HEAD, width: 22 }}>נצ</th>
            <th style={{ ...HEAD, width: 22 }}>תק</th>
            <th style={{ ...HEAD, width: 22 }}>הפ</th>
            <th style={{ ...HEAD, width: 34 }}>שער</th>
            <th style={{ ...HEAD, width: 28 }}>הפ׳</th>
            <th style={{ ...HEAD, width: 26 }}>נק</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const club = gs.league.clubs.find(x => x.id === s.clubId)!;
            const me = s.clubId === gs.clubId;
            const pos = i + 1;
            const zone = pos <= promo ? (top ? topColor : 'var(--win)') : pos >= drop ? 'var(--loss)' : 'transparent';
            const gd = s.gf - s.ga;
            return (
              <tr key={s.clubId} style={{
                background: me ? 'rgba(233,185,73,.12)' : 'transparent',
                borderTop: '1px solid var(--line)',
              }}>
                <td style={{ ...CELL, position: 'relative', color: 'var(--ink-faint)', fontSize: 11.5 }}>
                  <span style={{
                    position: 'absolute', insetInlineStart: -9, top: 6, bottom: 6,
                    width: 3, borderRadius: 2, background: zone,
                  }} />
                  {pos}
                </td>
                <td style={{ padding: '7px 0 7px 6px' }}>
                  <span className="row" style={{ gap: 7, minWidth: 0 }}>
                    <Crest club={club} size={20} />
                    <span style={{
                      fontSize: 13, fontWeight: me ? 800 : 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{club.short}</span>
                  </span>
                </td>
                <td className="num" style={{ ...CELL, color: 'var(--ink-dim)' }}>{s.played}</td>
                <td className="num" style={CELL}>{s.won}</td>
                <td className="num" style={{ ...CELL, color: 'var(--ink-dim)' }}>{s.drawn}</td>
                <td className="num" style={{ ...CELL, color: 'var(--ink-dim)' }}>{s.lost}</td>
                <td className="num" style={{ ...CELL, color: 'var(--ink-dim)', fontSize: 11.5 }}>{s.gf}:{s.ga}</td>
                <td className="num" style={{ ...CELL, color: gd > 0 ? 'var(--win)' : gd < 0 ? 'var(--loss)' : 'var(--ink-dim)' }}>
                  {gd > 0 ? `+${gd}` : gd}
                </td>
                <td className="num" style={{ ...CELL, fontWeight: 900, fontSize: 14 }}>{s.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="row" style={{ gap: 14, marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--line-2)' }}>
        {top
          ? <Legend color={topColor} label={EURO_LIVE ? 'אליפות ואירופה' : 'אליפות'} />
          : <Legend color="var(--win)" label="עלייה" />}
        <Legend color="var(--loss)" label="ירידה" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span style={{ width: 3, height: 12, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 10.5, color: 'var(--ink-faint)', fontWeight: 700 }}>{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ charts */

/** Hebrew counts one thing by name, not by number. */
function plural(n: number, one: string, many: string) {
  return n === 1 ? one : <><span className="num">{n}</span> {many}</>;
}

function Chart({ gs, by }: { gs: G.GameState; by: 'goals' | 'assists' }) {
  const rows = G.leagueChart(gs, by);
  const unit = by === 'goals' ? 'שערים' : 'בישולים';

  if (rows.length === 0) {
    return (
      <div className="tile" style={{ padding: '30px 16px', textAlign: 'center' }}>
        <Icon name="ball" size={28} color="var(--ink-faint)" />
        <p className="sub" style={{ marginTop: 10 }}>
          עוד לא נרשמו {unit} העונה.<br />המחזור הראשון יפתח את הרשימה.
        </p>
      </div>
    );
  }

  const top = rows[0][by];
  return (
    <div className="tile" style={{ padding: '9px 11px' }}>
      {rows.map((r, i) => {
        const club = gs.league.clubs.find(x => x.id === r.clubId);
        const value = r[by];
        return (
          <div key={r.id} className="row" style={{
            gap: 9, padding: '8px 2px', borderTop: i === 0 ? 'none' : '1px solid var(--line)',
            background: r.mine ? 'rgba(233,185,73,.10)' : 'transparent',
          }}>
            <span className="num" style={{
              width: 20, textAlign: 'center', fontWeight: 800, fontSize: 12,
              color: i === 0 ? 'var(--gold)' : 'var(--ink-faint)',
            }}>{i + 1}</span>
            {club ? <Crest club={club} size={20} /> : <span style={{ width: 20 }} />}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                display: 'block', fontSize: 13.5, fontWeight: r.mine ? 800 : 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{r.name}</span>
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-faint)', fontWeight: 600, marginTop: 1 }}>
                {r.apps === 1 ? 'משחק אחד' : <><span className="num">{r.apps}</span> משחקים</>}
                {by === 'goals' && r.assists > 0 && <> · {plural(r.assists, 'בישול אחד', 'בישולים')}</>}
                {by === 'assists' && r.goals > 0 && <> · {plural(r.goals, 'שער אחד', 'שערים')}</>}
              </span>
            </span>
            {/* a bar so the gap at the top of the race is visible, not just numeric */}
            <span style={{ width: 46, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
              <span style={{
                display: 'block', height: '100%', width: `${Math.max(8, (value / top) * 100)}%`,
                background: i === 0 ? 'linear-gradient(90deg,var(--gold-lo),var(--gold-hi))' : 'var(--ink-faint)',
              }} />
            </span>
            <span className="score-face" style={{
              width: 26, textAlign: 'center', fontSize: 20,
              color: i === 0 ? 'var(--gold)' : 'var(--ink)',
            }}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}
