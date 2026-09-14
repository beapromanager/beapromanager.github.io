import { TopBack } from '../components/TopBack.tsx';
import * as G from '../../game/state.ts';
import type { Player } from '../../engine/matchEngine.ts';
import { overall } from '../../engine/matchEngine.ts';
import { Meters } from '../components/bits.tsx';
import { Icon } from '../components/Icon.tsx';
import { ovrColor } from './Squad.tsx';

/**
 * The armband. Candidates are ranked by captaincy standing, which is quality
 * plus the years on him, exactly what the fans expect from a captain. The top
 * of the list is the natural pick, but the manager has the final word.
 */
export function CaptainScreen({ gs, onSet, onBack }: {
  gs: G.GameState; onSet: (id: string) => void; onBack: () => void;
}) {
  const ranked = G.captainCandidates(gs);
  const currentId = G.currentCaptainId(gs);
  const sq = G.mySquad(gs);
  const starterIds = new Set(sq.starters.map(p => p.id));

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 12 }}>
        <TopBack onBack={onBack} />
        <div className="row" style={{ gap: 10, marginTop: 2 }}>
          <Icon name="star" size={22} color="var(--gold)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="h2">מי הקפטן</div>
            <div className="sub" style={{ marginTop: 2 }}>מדורג לפי דירוג וותק. הקפטן בהרכב מרים קצת את חדר ההלבשה.</div>
          </div>
        </div>

        <div className="tile" style={{ padding: '4px 10px 8px' }}>
          {ranked.map((p, i) => {
            const isCap = p.id === currentId;
            const starting = starterIds.has(p.id);
            return (
              <button key={p.id} onClick={() => onSet(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 56,
                  padding: '10px 8px', borderTop: i ? '1px solid var(--line)' : undefined,
                  textAlign: 'start', borderRadius: 8,
                  background: isCap ? 'rgba(233,185,73,.12)' : 'transparent',
                }}>
                <Armband on={isCap} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                    {!starting && <span className="chip" style={{ marginInlineStart: 6, background: 'rgba(255,255,255,.06)', color: 'var(--ink-faint)' }}>ספסל</span>}
                  </div>
                  <div className="sub" style={{ fontSize: 11.5 }}>
                    {p.position} · גיל <span className="num">{p.age}</span> · {p.age - 18 <= 0 ? 'שנה ראשונה' : p.age - 18 === 1 ? 'ותק שנה' : <>ותק <span className="num">{p.age - 18}</span> שנים</>}
                  </div>
                </div>
                <div className="score-face" style={{ fontSize: 24, color: ovrColor(overall(p)), width: 32, textAlign: 'center' }}>{overall(p)}</div>
              </button>
            );
          })}
        </div>

        <div className="spacer" />
        <button className="btn" onClick={onBack}>סגור <Icon name="chevron" size={17} style={{ transform: 'scaleX(-1)' }} /></button>
      </div>
    </>
  );
}

function Armband({ on }: { on: boolean }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 9, flex: 'none',
      display: 'grid', placeItems: 'center',
      background: on ? 'linear-gradient(180deg,var(--gold-hi),var(--gold))' : 'rgba(255,255,255,.05)',
      border: on ? 'none' : '1px solid var(--line-2)',
      color: on ? '#1B1305' : 'var(--ink-faint)',
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, lineHeight: 1,
    }}>C</div>
  );
}
