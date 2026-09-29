import * as G from '../../game/state.ts';
import { SCOUT_FEE, SCOUT_STYLES, SCOUT_STYLE_TEXT, SCOUT_TEXT, scoutReach } from '../../game/scout.ts';
import { PlayerRow } from './Squad.tsx';
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
export function ScoutScreen({ gs, onHire, onSign, onBack }: {
  gs: G.GameState;
  onHire: (style: (typeof SCOUT_STYLES)[number]) => void;
  onSign: () => void;
  onBack: () => void;
}) {
  const c = G.club(gs);
  const out = G.scoutRoundsLeft(gs);
  const found = gs.scout.found;
  const offer = gs.scout.offer;
  const win = G.transferWindow(gs);

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

        {offer && (
          <div className="tile" style={{ padding: '4px 10px 12px', borderColor: 'var(--win)', background: 'rgba(51,194,122,.08)' }}>
            <div className="row" style={{ gap: 6, padding: '8px 8px 0', justifyContent: 'space-between' }}>
              <span className="chip" style={{ background: 'rgba(51,194,122,.2)', color: 'var(--win)', fontWeight: 800 }}>{SCOUT_TEXT.offerTitle}</span>
              {offer.fromClubId && (
                <span className="chip" style={{ background: 'rgba(233,185,73,.16)', color: 'var(--gold-hi)', fontWeight: 800 }}>
                  {SCOUT_TEXT.from(gs.league.clubs.find(x => x.id === offer.fromClubId)?.name ?? '')}
                </span>
              )}
              {win.open && <span className="chip" style={{ background: 'rgba(255,255,255,.07)', color: 'var(--ink-dim)' }}>נסגר בעוד <span className="num">{win.weeksLeft}</span> מחזורים</span>}
            </div>
            <PlayerRow p={offer.player} />
            <p className="hint" style={{ padding: '0 8px' }}>יכול להגיע ל־<span className="num">{scoutReach(offer.style, offer.player)}</span></p>
            <div className="row" style={{ gap: 10, padding: '10px 8px 0' }}>
              <div style={{ flex: 1 }}>
                <div className="sub" style={{ fontSize: 12.5 }}>מחיר</div>
                <div className="num" style={{ fontWeight: 900, fontSize: 16, textAlign: 'right' }}>{formatMoney(offer.fee)}</div>
              </div>
              <button className="btn" style={{ width: 'auto', padding: '12px 22px', fontSize: 16 }}
                disabled={!!G.scoutSignBlockedReason(gs)} onClick={onSign}>
                {G.scoutSignBlockedReason(gs) ?? SCOUT_TEXT.signIn}
              </button>
            </div>
          </div>
        )}

        {gs.scout.job && out !== null && (
          <div className="tile" style={{ borderColor: 'rgba(233,185,73,.4)' }}>
            <div style={{ fontWeight: 800, fontSize: 15.5 }}>{SCOUT_TEXT.signed}</div>
            <div className="sub" style={{ fontSize: 14, marginTop: 5 }}>
              {SCOUT_STYLE_TEXT[gs.scout.job.style].name} · עוד <span className="num">{out}</span> מחזורים
            </div>
          </div>
        )}

        {!gs.scout.job && found && !offer && (
          <div className="tile" style={{ borderColor: 'rgba(51,194,122,.4)' }}>
            <div style={{ fontWeight: 800, fontSize: 15.5 }}>{SCOUT_TEXT.waiting}</div>
            <div className="sub" style={{ fontSize: 14, marginTop: 5 }}>{SCOUT_STYLE_TEXT[found.style].name}</div>
          </div>
        )}

        {!gs.scout.job && !found && !offer && (
          <div className="stack" style={{ gap: 10 }}>
            {SCOUT_STYLES.map(style => {
              const t = SCOUT_STYLE_TEXT[style];
              const blocked = G.scoutBlockedReason(gs, style);
              return (
                <div key={style} className="tile" style={{ padding: '13px 13px 14px' }}>
                  <div style={{ fontWeight: 900, fontSize: 17 }}>{t.name}</div>
                  <p className="hint" style={{ margin: '5px 0 0' }}>{t.blurb}</p>
                  {(() => {
                    const range = G.scoutBudgetFor(gs, style);
                    return range && (
                      <p className="hint" style={{ margin: '7px 0 0', color: 'var(--gold-hi)' }}>
                        {SCOUT_TEXT.budget} <span className="num">{formatMoney(range[0])}</span> ל־<span className="num">{formatMoney(range[1])}</span>. {SCOUT_TEXT.budgetTail}
                      </p>
                    );
                  })()}
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
