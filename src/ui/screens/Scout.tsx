import { useState } from 'react';
import * as G from '../../game/state.ts';
import { SCOUT_FEE, SCOUT_STYLES, SCOUT_STYLE_TEXT, SCOUT_TEXT, SCOUT_POSITIONS, scoutReach, placeInfo, weakestPosition } from '../../game/scout.ts';
import type { Position } from '../../engine/matchEngine.ts';
import { PlayerRow } from './Squad.tsx';
import { overall } from '../../engine/matchEngine.ts';
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
  onHire: (style: (typeof SCOUT_STYLES)[number], position: Position) => void;
  onSign: () => void;
  onBack: () => void;
}) {
  const c = G.club(gs);
  const out = G.scoutRoundsLeft(gs);
  const found = gs.scout.found;
  const offer = gs.scout.offer;
  const win = G.transferWindow(gs);
  // where he is sent: by default the place of the weakest man of the eleven (15.10)
  const starters = G.mySquad(gs).starters;
  const bench = G.mySquad(gs).bench;
  const [place, setPlace] = useState<Position>(() => weakestPosition(starters));
  const placeName: Record<string, string> = {
    GK: 'שוער', CB: 'בלם', LB: 'מגן שמאלי', RB: 'מגן ימני', CDM: 'קשר הגנתי', CM: 'קשר', CAM: 'קשר התקפי',
    LW: 'כנף שמאלית', RW: 'כנף ימנית', ST: 'חלוץ',
  };

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
              {offer.style === 'old' && (
                <span className="chip" style={{ background: 'rgba(233,185,73,.16)', color: 'var(--gold-hi)', fontWeight: 800 }}>{SCOUT_TEXT.fromHigher}</span>
              )}
              {win.open && <span className="chip" style={{ background: 'rgba(255,255,255,.07)', color: 'var(--ink-dim)' }}>נסגר בעוד <span className="num">{win.weeksLeft}</span> מחזורים</span>}
            </div>
            {offer.position && (
              <p className="hint" style={{ padding: '4px 8px 0', margin: 0 }}>
                {SCOUT_TEXT.forPlace(placeName[offer.position] ?? offer.position, placeInfo(starters, bench, offer.position))}
                {offer.prospect && <span style={{ color: 'var(--gold-hi)', fontWeight: 800 }}> · {SCOUT_TEXT.prospect}</span>}
              </p>
            )}
            <PlayerRow p={offer.player} tier={c.tier} />
            {scoutReach(offer.style, offer.player) > overall(offer.player) && (
              <p className="hint" style={{ padding: '0 8px' }}>יכול להגיע ל־<span className="num">{scoutReach(offer.style, offer.player)}</span></p>
            )}
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
            <div className="tile" style={{ padding: '12px 13px 13px' }}>
              <div style={{ fontWeight: 900, fontSize: 16.5 }}>{SCOUT_TEXT.choose}</div>
              <p className="hint" style={{ margin: '4px 0 9px' }}>{SCOUT_TEXT.chooseHint}</p>
              <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                {SCOUT_POSITIONS.map(pos => {
                  const mine = placeInfo(starters, bench, pos);
                  const on = pos === place;
                  return (
                    <button key={pos} onClick={() => setPlace(pos)} aria-pressed={on}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 64, minHeight: 52, padding: '6px 9px',
                        borderRadius: 12, cursor: 'pointer', color: 'var(--ink)',
                        border: on ? '1px solid var(--gold)' : '1px solid var(--line-2)',
                        background: on ? 'color-mix(in srgb, var(--gold) 16%, var(--surface-2))' : 'var(--surface-2)',
                      }}>
                      <span style={{ fontWeight: 900, fontSize: 14 }}>{placeName[pos]}</span>
                      <span className="num" style={{ fontSize: 12, color: mine.where === 'none' ? 'var(--loss)' : 'var(--ink-dim)' }}>{mine.where === 'none' ? SCOUT_TEXT.none : mine.where === 'bench' ? `ספסל ${mine.ovr}` : mine.ovr}</span>
                    </button>
                  );
                })}
              </div>
              <p className="hint" style={{ margin: '9px 0 0' }}>{SCOUT_TEXT.yourStarter(placeName[place], placeInfo(starters, bench, place))}</p>
            </div>
            {SCOUT_STYLES.map(style => {
              const t = SCOUT_STYLE_TEXT[style];
              const blocked = G.scoutBlockedReason(gs, style);
              return (
                <div key={style} className="tile" style={{ padding: '13px 13px 14px' }}>
                  <div style={{ fontWeight: 900, fontSize: 17 }}>{t.name}</div>
                  <p className="hint" style={{ margin: '5px 0 0' }}>{t.blurb}</p>
                  {(() => {
                    const range = G.scoutBudgetFor(gs, style, place);
                    return range && (
                      <p className="hint" style={{ margin: '7px 0 0', color: 'var(--gold-hi)' }}>
                        {SCOUT_TEXT.budget} <span className="num">{formatMoney(range[0])}</span> ל־<span className="num">{formatMoney(range[1])}</span>. {SCOUT_TEXT.budgetTail}
                      </p>
                    );
                  })()}
                  <button className="btn" style={{ marginTop: 11 }} disabled={!!blocked} onClick={() => onHire(style, place)}>
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
