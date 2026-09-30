import * as G from '../../game/state.ts';
import { overall } from '../../engine/matchEngine.ts';
import type { Player } from '../../engine/matchEngine.ts';
import { Icon } from '../components/Icon.tsx';
import { Meters } from '../components/bits.tsx';
import { ovrColor } from '../../game/cards.ts';

/**
 * The academy's eighteen year olds, decided.
 *
 * The summer opens on this. Every kid who turned eighteen is eligible for a
 * senior deal and has to be answered, one way or the other: signed into the
 * squad, or let go for good, with nothing of him kept. The youth coach says who is
 * worth it, and only about one in four is. It is advice: the manager can sign
 * anybody and release anybody, and signing past the squad maximum is allowed,
 * with the summer refusing to start until the squad is back under it.
 *
 * There is no way back out of this screen on purpose, the same as a dilemma:
 * a kid who is eighteen and unanswered has nowhere else to be.
 *
 * DRAFT WORDING, Itzik's to correct, apart from the title, the subtitle and the
 * shape of a row, which are his.
 */
export function YouthDecisionScreen({ gs, onSign, onRelease, onReleaseRest, onFinish }: {
  gs: G.GameState;
  onSign: (id: string) => void;
  onRelease: (id: string) => void;
  onReleaseRest: () => void;
  onFinish: () => void;
}) {
  const kids = G.youthGraduates(gs);
  const over = G.overSquadBy(gs);
  const anyNotRecommended = kids.some(k => !G.graduateOutlook(gs, k).recommend);

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 13 }}>
        <div className="row" style={{ gap: 10, marginTop: 6 }}>
          <Icon name="star" size={22} color="var(--gold)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="h2">שחקני הנוער שהגיעו לגיל 18 זכאים כרגע לחוזה בוגרים</div>
            <div className="sub" style={{ fontSize: 14, marginTop: 4 }}>זה הזמן לקבל החלטה לגבי העתיד שלהם</div>
          </div>
        </div>

        {over > 0 && (
          <div className="tile" style={{ borderColor: 'rgba(226,72,77,.45)', background: 'rgba(226,72,77,.08)' }} role="alert">
            <div style={{ fontWeight: 800, fontSize: 15 }}>הסגל עומד על {G.squadSize(gs)}</div>
            <div className="sub" style={{ fontSize: 14.5, marginTop: 4 }}>
              מותר {G.MAX_SQUAD} לכל היותר. אחרי ההחלטות צריך למכור או לשחרר {over === 1 ? 'שחקן אחד' : `${over} שחקנים`} לפני שהעונה מתחילה.
            </div>
          </div>
        )}

        {kids.map(p => (
          <KidCard key={p.id} gs={gs} p={p} onSign={() => onSign(p.id)} onRelease={() => onRelease(p.id)} />
        ))}

        {anyNotRecommended && kids.length > 1 && (
          <button className="btn dark btn-sm" onClick={onReleaseRest}>שחרר את כל מי שלא מומלץ</button>
        )}

        {kids.length === 0 && (
          <>
            <div className="tile" style={{ textAlign: 'center', padding: 16, fontSize: 14.5, color: 'var(--ink-dim)' }}>
              אין עוד החלטות על נוער.
            </div>
            <button className="btn" onClick={onFinish}>להכנות לעונה</button>
          </>
        )}
      </div>
    </>
  );
}

function KidCard({ gs, p, onSign, onRelease }: { gs: G.GameState; p: Player; onSign: () => void; onRelease: () => void }) {
  const o = overall(p);
  const view = G.graduateOutlook(gs, p);
  return (
    <div className="tile" style={{
      padding: 13,
      borderColor: view.recommend ? 'color-mix(in srgb, var(--win) 45%, transparent)' : 'var(--line)',
      background: view.recommend ? 'linear-gradient(180deg, rgba(51,194,122,.09), var(--surface))' : 'var(--surface)',
    }}>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <span className="chip" style={{ background: 'rgba(255,255,255,.06)', color: 'var(--ink-dim)', minWidth: 34, justifyContent: 'center' }}>{p.position}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div className="sub" style={{ fontSize: 13.5 }}>בן <span className="num">{p.age}</span> ({p.position})</div>
        </div>
        <div className="score-face num" style={{ fontSize: 26, color: ovrColor(o) }}>{o}</div>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
        <span className="chip" style={{ background: 'rgba(255,255,255,.06)', color: 'var(--ink)', fontWeight: 700 }}>
          צפי הגעה ל־<span className="num">{view.lo === view.hi ? view.hi : `${view.lo}-${view.hi}`}</span>
        </span>
        <span className="chip" style={{
          background: view.recommend ? 'rgba(51,194,122,.18)' : 'rgba(255,255,255,.05)',
          color: view.recommend ? 'var(--win)' : 'var(--ink-faint)', fontWeight: 800,
        }}>
          המלצת מאמן הנוער: {view.recommend ? 'להשאיר' : 'לא להשאיר'}
        </span>
      </div>
      {/* stacked, as on the academy screen: the chamfered gold button eats its own
          label when it is squeezed into half a row */}
      <div className="stack" style={{ gap: 7, marginTop: 11 }}>
        <button className="btn btn-sm" onClick={onSign}>
          <Icon name="shirt" size={15} /> החתם לסגל הבוגרים
        </button>
        <button className="btn dark btn-sm" onClick={onRelease}>שחרר</button>
      </div>
    </div>
  );
}
