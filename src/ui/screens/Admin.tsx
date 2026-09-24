import { biggestDrop } from '../../game/telemetry.ts';
import { Icon } from '../components/Icon.tsx';

/**
 * The numbers, for Itzik and nobody else.
 *
 * Reached at ?admin=KEY, and the key is checked by the worker rather than
 * here: anything this page holds is public the moment it is served, so a check
 * in the browser would be a lock with the key taped beside it.
 *
 * It is handed its numbers already fetched, and only exists once the worker
 * has accepted the key. It used to mount first and then say "wrong password",
 * which told anyone who tried ?admin=anything that there was a password worth
 * guessing, and took the game away from them while it did.
 *
 * The funnel is the reason this exists. Every bar is how many people reached
 * that step, and the number that matters is the DROP: the step where the bar
 * falls off a cliff is where the game is losing people, and it is the only
 * honest answer to "what should I fix next".
 */
export function AdminScreen({ stats: data }: { stats: Stats }) {
  const top = data.funnel[0]?.n || 1;
  // the one number that says what to fix: the biggest fall between two steps
  const worst = biggestDrop(data.funnel);

  return (
    <div className="screen pad stack pad-b" style={{ gap: 13, paddingTop: 26 }}>
      <div className="row" style={{ gap: 9 }}>
        <Icon name="crowd" size={20} color="var(--gold)" />
        <div className="h2" style={{ fontSize: 22 }}>הנתונים</div>
      </div>

      <div className="row" style={{ gap: 9 }}>
        <Big label="אנשים" value={data.people} />
        <Big label="כניסות" value={data.sittings} />
        <Big label="חזרו שוב" value={data.returned} />
      </div>

      {worst && (
        <div className="tile" style={{ padding: '11px 13px', borderColor: 'rgba(226,72,77,.4)', background: 'rgba(226,72,77,.08)' }}>
          <div className="label-cap" style={{ marginBottom: 4 }}>איפה הכי הרבה עוזבים</div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>
            בין {LABEL[worst.from] ?? worst.from} ל{LABEL[worst.to] ?? worst.to}, ירדו{' '}
            <span className="num" style={{ color: 'var(--loss)' }}>{worst.lost}</span> אנשים
          </div>
        </div>
      )}

      <div className="label-cap">איפה כל אחד עצר</div>
      <div className="tile" style={{ padding: '11px 12px' }}>
        {data.funnel.map(f => (
          <div key={f.step} style={{ margin: '7px 0' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{LABEL[f.step] ?? f.step}</span>
              <span className="num" style={{ fontSize: 13, fontWeight: 800 }}>
                {f.n}
                <span style={{ color: 'var(--ink-faint)', fontWeight: 700 }}> · {Math.round((f.n / top) * 100)}%</span>
              </span>
            </div>
            <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.max(1, (f.n / top) * 100)}%`, borderRadius: 4,
                background: 'linear-gradient(90deg,var(--gold-lo),var(--gold-hi))',
              }} />
            </div>
          </div>
        ))}
      </div>

{/* The funnel says where people stop; this says whether the screen went
    black there. A bar that falls at the squad screen means one thing if
    nobody crashed on it and something else entirely if everybody did. */}
      {!!data.crashes?.length && (
        <>
          <div className="label-cap">קריסות</div>
          <div className="tile" style={{ padding: '11px 12px', borderColor: 'rgba(226,72,77,.35)' }}>
            {data.crashes.map(c => (
              <div key={c.step + c.err} className="row" style={{ justifyContent: 'space-between', padding: '5px 0', borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {LABEL[c.step] ?? 'לפני שהתחיל'}
                  <span style={{ color: 'var(--ink-faint)', fontWeight: 600 }} className="num"> · {c.err}</span>
                </span>
                <span className="num" style={{ fontSize: 13, fontWeight: 800, color: 'var(--loss)' }}>
                  {c.n}
                  <span style={{ color: 'var(--ink-faint)', fontWeight: 700 }}> · {c.people} מכשירים</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="label-cap">לפי יום</div>
      <div className="tile" style={{ padding: '11px 12px' }}>
        {data.daily.length === 0
          ? <div className="sub" style={{ fontSize: 13 }}>אין עדיין ימים לספור</div>
          : data.daily.slice().reverse().map(d => (
            <div key={d.day} className="row" style={{ justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid var(--line)' }}>
              <span className="num" style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>{d.day}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                <span className="num">{d.people}</span> אנשים
                <span style={{ color: 'var(--ink-faint)' }}> · </span>
                <span className="num">{d.sittings}</span> כניסות
              </span>
            </div>
          ))}
      </div>

      <p className="hint">
        אף שם, אף מועדון ואף מילה שמישהו הקליד לא מגיעים לכאן. רק מספר אקראי לכל מכשיר ומה הוא הספיק.
      </p>
    </div>
  );
}

function Big({ label, value }: { label: string; value: number }) {
  return (
    <div className="tile" style={{ flex: 1, padding: '11px 8px', textAlign: 'center' }}>
      <div className="score-face" style={{ fontSize: 27, color: 'var(--gold-hi)' }}>{value}</div>
      <div className="sub" style={{ fontSize: 12 }}>{label}</div>
    </div>
  );
}

export type Stats = {
  funnel: { step: string; n: number }[];
  people: number;
  sittings: number;
  returned: number;
  daily: { day: string; people: number; sittings: number }[];
  /** where the game broke, and on how many separate phones */
  crashes?: { step: string; err: string; n: number; people: number }[];
};

/** the steps in words, so the chart reads without the code beside it */
const LABEL: Record<string, string> = {
  open: 'פתחו את המשחק',
  career_new: 'התחילו קריירה',
  manager: 'נתנו שם',
  club: 'בחרו עיר וצבעים',
  archetype: 'בחרו מי הם',
  signing: 'חתמו בחוזה',
  friends: 'שלב החברים',
  squad: 'ראו את הסגל',
  market: 'ראו את השוק',
  season: 'יצאו לליגה',
  round_1: 'שיחקו מחזור',
  round_3: 'שיחקו שלושה',
  round_7: 'חצי עונה',
  season_end: 'סיימו עונה',
  season_2: 'חזרו לעונה שנייה',
};
