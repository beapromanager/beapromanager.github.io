import * as G from '../../game/state.ts';
import { SCOUT_FEE, SCOUT_STYLES, SCOUT_STYLE_TEXT, SCOUT_TEXT } from '../../game/scout.ts';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';
import { TopBack } from '../components/TopBack.tsx';
import { Meters, formatMoney } from '../components/bits.tsx';

/**
 * The scout.
 *
 * One door with three men behind it. A manager who can hire picks the style and
 * pays; one who has hired sees only the man at work or the news he brought
 * back, because a second scout in the same season is not on offer and a screen
 * that kept showing the shop would only ask him to press what does nothing.
 */
export function ScoutScreen({ gs, onHire, onBack }: {
  gs: G.GameState;
  onHire: (style: (typeof SCOUT_STYLES)[number]) => void;
  onBack: () => void;
}) {
  const c = G.club(gs);
  const out = G.scoutRoundsLeft(gs);
  const found = gs.scout.found;

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 13 }}>
        <TopBack onBack={onBack} />
        <div className="row" style={{ gap: 10, marginTop: 2 }}>
          <Icon name="target" size={22} color="var(--gold)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="h2">{SCOUT_TEXT.door}</div>
            <div className="sub" style={{ fontSize: 14 }}>{c.name}</div>
          </div>
          <Crest club={c} size={40} />
        </div>

        {gs.scout.job && out !== null && (
          <div className="tile" style={{ borderColor: 'rgba(233,185,73,.4)' }}>
            <div style={{ fontWeight: 800, fontSize: 15.5 }}>{SCOUT_TEXT.signed}</div>
            <div className="sub" style={{ fontSize: 14, marginTop: 5 }}>
              {SCOUT_STYLE_TEXT[gs.scout.job.style].name} · עוד <span className="num">{out}</span> מחזורים
            </div>
          </div>
        )}

        {!gs.scout.job && found && (
          <div className="tile" style={{ borderColor: 'rgba(51,194,122,.4)' }}>
            <div style={{ fontWeight: 800, fontSize: 15.5 }}>{SCOUT_TEXT.waiting}</div>
            <div className="sub" style={{ fontSize: 14, marginTop: 5 }}>{SCOUT_STYLE_TEXT[found.style].name}</div>
          </div>
        )}

        {!gs.scout.job && !found && (
          <div className="stack" style={{ gap: 10 }}>
            {SCOUT_STYLES.map(style => {
              const t = SCOUT_STYLE_TEXT[style];
              const blocked = G.scoutBlockedReason(gs, style);
              return (
                <div key={style} className="tile" style={{ padding: '13px 13px 14px' }}>
                  <div style={{ fontWeight: 900, fontSize: 17 }}>{t.name}</div>
                  <p className="hint" style={{ margin: '5px 0 0' }}>{t.blurb}</p>
                  <button className="btn" style={{ marginTop: 11 }} disabled={!!blocked} onClick={() => onHire(style)}>
                    {blocked ?? `${SCOUT_TEXT.hire} · ${formatMoney(SCOUT_FEE)}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
