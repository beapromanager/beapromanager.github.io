import * as G from '../../game/state.ts';
import { overall } from '../../engine/matchEngine.ts';
import type { Player } from '../../engine/matchEngine.ts';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';
import { TopBack } from '../components/TopBack.tsx';
import { ovrColor } from '../../game/cards.ts';

/**
 * The youth academy.
 *
 * Sixteen to eighteen year olds who train at the club. One breaks out every
 * summer, and when a prospect turns eighteen the manager either signs him to a
 * senior deal or lets him go. It is the club's future in one screen, and the
 * only place a poor club builds something it could not buy.
 */
export function YouthScreen({ gs, onPromote, onRelease, onRegister, onBack }: {
  gs: G.GameState;
  onPromote: (id: string) => void;
  onRelease: (id: string) => void;
  /** one round on the sheet, any age, back down after the match */
  onRegister: (id: string) => void;
  onBack: () => void;
}) {
  const c = G.club(gs);
  const kids = [...gs.youth.players].sort((a, b) => (b.age - a.age) || overall(b) - overall(a));
  const ready = kids.filter(p => p.age >= 18);
  const growing = kids.filter(p => p.age < 18);
  const canTake = G.squadSize(gs) < G.MAX_SQUAD;
  const emergency = G.needsEmergencyYouth(gs);

  return (
    <>
      <div className="screen pad stack pad-b" style={{ gap: 13 }}>
        <TopBack onBack={onBack} />
        <div className="row" style={{ gap: 10, marginTop: 2 }}>
          <Icon name="star" size={22} color="var(--gold)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="h2">מחלקת הנוער</div>
            <div className="sub" style={{ fontSize: 14 }}>{c.name} · שחקנים בני 16-18</div>
          </div>
          <Crest club={c} size={40} />
        </div>

        <p className="hint" style={{ margin: 0 }}>
          כל קיץ שחקן אחד עושה קפיצה. בגיל 18 אפשר להחתים אותו לסגל הבוגר או לשחרר.
        </p>

        {emergency && (
          <div className="tile" style={{ borderColor: 'rgba(226,72,77,.45)', background: 'rgba(226,72,77,.08)' }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>חסר שם בסגל למחזור</div>
            <div className="sub" style={{ fontSize: 13.5, marginTop: 4 }}>
              הליגה דורשת {G.MIN_SQUAD} שמות כשירים ויש לך {G.eligibleCount(gs)}. תרשום ילד מהנוער, בכל גיל.
              הוא ייכנס לרשימה בלבד, לא ישחק, ויחזור לנוער אחרי המשחק.
            </div>
            <div className="stack" style={{ gap: 7, marginTop: 10 }}>
              {kids.map(p => (
                <div key={p.id} className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span className="chip" style={{ background: 'rgba(255,255,255,.06)', minWidth: 34, justifyContent: 'center' }}>{p.position}</span>
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name} <span className="sub num" style={{ fontSize: 12 }}>{p.age}</span></span>
                  <button className="btn btn-sm" style={{ width: 'auto', flex: '0 0 auto', minHeight: 40, padding: '8px 14px', fontSize: 14 }} onClick={() => onRegister(p.id)}>רשום למחזור</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {ready.length > 0 && (
          <div className="stack" style={{ gap: 9 }}>
            <span className="label-cap" style={{ color: 'var(--gold-hi)' }}>מוכנים להחלטה · בני 18</span>
            {ready.map(p => (
              <ReadyCard key={p.id} p={p} canTake={canTake}
                onPromote={() => onPromote(p.id)} onRelease={() => onRelease(p.id)} />
            ))}
            {!canTake && <p className="hint" style={{ margin: '-2px 0 0' }}>הסגל מלא. שחרר או מכור שחקן כדי לפנות מקום.</p>}
          </div>
        )}

        <div className="stack" style={{ gap: 8 }}>
          <span className="label-cap">בפיתוח</span>
          {growing.length === 0
            ? <div className="tile" style={{ textAlign: 'center', padding: 16, fontSize: 13.5, color: 'var(--ink-dim)' }}>אין כרגע שחקנים צעירים בפיתוח.</div>
            : growing.map(p => <GrowingRow key={p.id} p={p} />)}
        </div>
      </div>
    </>
  );
}

function ReadyCard({ p, canTake, onPromote, onRelease }: {
  p: Player; canTake: boolean; onPromote: () => void; onRelease: () => void;
}) {
  const o = overall(p);
  return (
    <div className="tile" style={{
      padding: 13, borderColor: 'color-mix(in srgb, var(--gold) 34%, transparent)',
      background: 'linear-gradient(180deg, rgba(233,185,73,.09), var(--surface))',
    }}>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <span className="chip" style={{ background: 'rgba(255,255,255,.06)', color: 'var(--ink-dim)', minWidth: 34, justifyContent: 'center' }}>{p.position}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div className="sub" style={{ fontSize: 12.5 }}>בן <span className="num">{p.age}</span></div>
        </div>
        <div className="score-face num" style={{ fontSize: 26, color: ovrColor(o) }}>{o}</div>
      </div>
      {/* stacked, not side by side: the chamfered gold button eats its own
          label when it is squeezed into half a row */}
      <div className="stack" style={{ gap: 7, marginTop: 11 }}>
        <button className="btn btn-sm" style={{ opacity: canTake ? 1 : 0.4 }} disabled={!canTake} onClick={onPromote}>
          <Icon name="shirt" size={15} /> החתם לסגל הבוגר
        </button>
        <button className="btn dark btn-sm" onClick={onRelease}>שחרר מהמחלקה</button>
      </div>
    </div>
  );
}

function GrowingRow({ p }: { p: Player }) {
  const o = overall(p);
  return (
    <div className="row" style={{
      gap: 10, alignItems: 'center', background: 'var(--surface)',
      border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '9px 11px',
    }}>
      <span className="chip" style={{ background: 'rgba(255,255,255,.05)', color: 'var(--ink-faint)', minWidth: 34, justifyContent: 'center' }}>{p.position}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
        <div className="sub" style={{ fontSize: 12 }}>בן <span className="num">{p.age}</span></div>
      </div>
      <div className="num" style={{ fontSize: 18, fontWeight: 800, color: ovrColor(o) }}>{o}</div>
    </div>
  );
}
