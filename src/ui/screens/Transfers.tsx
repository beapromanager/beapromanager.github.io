import { TopBack } from '../components/TopBack.tsx';
import { useMemo, useState } from 'react';
import * as G from '../../game/state.ts';
import { overall } from '../../engine/matchEngine.ts';
import type { Player } from '../../engine/matchEngine.ts';
import { assignTraits } from '../../data/personalities.ts';
import { Meters, formatMoney } from '../components/bits.tsx';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { Portal } from '../components/Portal.tsx';
import { Icon } from '../components/Icon.tsx';
import { scrollToTop } from '../scroll.ts';
import { PlayerRow, ovrColor, LINE_OF, LINE_LABEL } from './Squad.tsx';
import { MAX_SQUAD, MIN_SQUAD, sellPrice, contractTerms } from '../../game/transfers.ts';
import type { FreeAgent } from '../../game/transfers.ts';

type Tab = 'market' | 'mine';

export function TransfersScreen({ gs, onSign, onSell, onBack }: {
  gs: G.GameState;
  onSign: (playerId: string) => void;
  onSell: (playerId: string) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>('market');
  const [msg, setMsg] = useState<string | null>(null);
  const [offer, setOffer] = useState<FreeAgent | null>(null);   // contract being negotiated
  const [card, setCard] = useState<Player | null>(null);        // player card being read
  // the market can be filtered to one line, and opens pre-filtered when reached
  // from a "needs reinforcement" gap on the summer board
  const [lineFilter, setLineFilter] = useState<G.MarketLine | 'all'>(gs.marketFocus ?? 'all');
  const win = G.transferWindow(gs);
  const sq = G.mySquad(gs);
  const myTier = G.club(gs).tier;
  const size = G.squadSize(gs);

  // personalities: my squad as one group, the market as its own group
  const squadTraits = useMemo(() => assignTraits([...sq.starters, ...sq.bench], gs.friends), [sq, gs.friends]);
  const marketTraits = useMemo(() => assignTraits(gs.market.map(f => f.player)), [gs.market]);
  const cardTraits = card
    ? squadTraits.get(card.id) ?? marketTraits.get(card.id) ?? []
    : [];

  function openOffer(fa: FreeAgent) {
    const reason = G.signBlockedReason(gs, fa);
    if (reason) { setMsg(reason); return; }
    setMsg(null);
    setOffer(fa);
  }

  function confirmOffer() {
    if (!offer) return;
    const fa = offer;
    setOffer(null);
    if (G.signBlockedReason(gs, fa)) { setMsg(G.signBlockedReason(gs, fa)!); return; }
    onSign(fa.player.id);
    setMsg(`${fa.player.name} חתם חוזה. ברוך הבא למועדון.`);
  }

  function trySell(id: string) {
    const p = sq.bench.find(x => x.id === id)!;
    const reason = G.sellBlockedReason(gs);
    if (reason) { setMsg(reason); return; }
    onSell(id);
    setMsg(`${p.name} נמכר תמורת ${formatMoney(sellPrice(p, myTier))}.`);
  }

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 12 }}>
        <TopBack onBack={onBack} />
        <div className="row" style={{ marginTop: 2 }}>
          <div style={{ flex: 1 }}>
            <div className="h2">שוק ההעברות</div>
            <div className="sub" style={{ fontSize: 14 }}>
              סגל <span className="num">{size}</span> שחקנים, מותר <span className="num">{MIN_SQUAD}</span> עד <span className="num">{MAX_SQUAD}</span>
            </div>
          </div>
        </div>

        <div className="tile" style={{
          padding: '11px 13px',
          borderColor: win.open ? 'var(--win)' : 'var(--line)',
          background: win.open ? 'rgba(51,194,122,.1)' : 'var(--surface)',
        }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b style={{ fontSize: 16, color: win.open ? 'var(--win)' : 'var(--ink-dim)' }}>{win.label}</b>
            {win.open
              ? <span className="chip" style={{ background: 'rgba(51,194,122,.2)', color: 'var(--win)' }}>נסגר בעוד <span className="num">{win.weeksLeft}</span> מחזורים</span>
              : win.nextOpensWeek
                ? <span className="chip" style={{ background: 'rgba(255,255,255,.07)', color: 'var(--ink-dim)' }}>נפתח במחזור <span className="num">{win.nextOpensWeek}</span></span>
                : <span className="chip" style={{ background: 'rgba(255,255,255,.07)', color: 'var(--ink-dim)' }}>סגור עד סוף העונה</span>}
          </div>
        </div>

        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === 'market'} data-on={tab === 'market' ? '1' : '0'} onClick={() => { setTab('market'); setMsg(null); scrollToTop(); }}>
            שחקנים חופשיים
          </button>
          <button role="tab" aria-selected={tab === 'mine'} data-on={tab === 'mine' ? '1' : '0'} onClick={() => { setTab('mine'); setMsg(null); scrollToTop(); }}>
            מכירה מהספסל
          </button>
        </div>

        {msg && <div className="tile" style={{ padding: '10px 13px', fontSize: 14.5, fontWeight: 700 }} aria-live="polite">{msg}</div>}

        {tab === 'market' && (
          <>
            <LineFilter value={lineFilter} onChange={setLineFilter} market={gs.market} />
            {(() => {
              const shown = lineFilter === 'all' ? gs.market : gs.market.filter(fa => LINE_OF[fa.player.position] === lineFilter);
              return shown.length === 0
                ? <Empty text={lineFilter === 'all'
                    ? 'אין כרגע שחקנים חופשיים. נסה שוב בחלון הבא.'
                    : `אין כרגע ${LINE_LABEL[lineFilter]} פנויים בשוק.`} />
                : <div className="stack" style={{ gap: 10 }}>
                {shown.map(fa => {
                  const o = overall(fa.player);
                  const blocked = G.signBlockedReason(gs, fa);
                  return (
                    <div key={fa.player.id} className="tile" style={{
                      padding: '4px 10px 12px',
                      // the one big name of the summer wears it
                      ...(fa.marquee ? {
                        borderColor: 'var(--gold)',
                        background: 'linear-gradient(180deg, rgba(233,185,73,.10), var(--surface))',
                      } : {}),
                    }}>
                      {(fa.marquee || fa.leaving) && (
                        <div className="row" style={{ gap: 6, padding: '8px 8px 0' }}>
                          {fa.marquee && (
                            <span className="chip" style={{ background: 'rgba(233,185,73,.18)', color: 'var(--gold-hi)', fontWeight: 800 }}>
                              <Icon name="star" size={12} /> הכוכב של הקיץ
                            </span>
                          )}
                          {fa.leaving && (
                            <span className="chip" style={{ background: 'rgba(255,90,95,.14)', color: 'var(--loss)', fontWeight: 800 }}>
                              מחזור אחרון
                            </span>
                          )}
                        </div>
                      )}
                      <PlayerRow p={fa.player} traits={marketTraits.get(fa.player.id) ?? []} onOpen={() => setCard(fa.player)} />
                      <p className="hint" style={{ padding: '0 8px' }}>
                        {fa.note}{fa.leaving ? '. קבוצה אחרת סוגרת איתו, אחרי המחזור הזה הוא לא כאן' : ''}
                      </p>
                      <div className="row" style={{ gap: 10, padding: '10px 8px 0' }}>
                        <div style={{ flex: 1 }}>
                          <div className="sub" style={{ fontSize: 12.5 }}>מחיר</div>
                          {/* .num is direction:ltr, so without this the digits
                              align left while the Hebrew label above aligns
                              right, and the two sit at opposite ends */}
                          <div className="num" style={{ fontWeight: 900, fontSize: 16, color: ovrColor(o), textAlign: 'right' }}>{formatMoney(fa.fee)}</div>
                        </div>
                        <button className="btn" style={{ width: 'auto', padding: '12px 22px', fontSize: 16 }}
                          disabled={!!blocked} onClick={() => openOffer(fa)}>
                          {blocked ?? 'הצע חוזה'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>;
            })()}
          </>
        )}

        {tab === 'mine' && (
          <div className="stack" style={{ gap: 10 }}>
            <p className="hint">אפשר למכור רק שחקני ספסל. אם אתה רוצה להיפטר משחקן מההרכב, קודם תוציא אותו במסך הסגל.</p>
            {sq.bench.map(p => {
              const blocked = G.sellBlockedReason(gs);
              return (
                <div key={p.id} className="tile" style={{ padding: '4px 10px 12px' }}>
                  <PlayerRow p={p} traits={squadTraits.get(p.id) ?? []} onOpen={() => setCard(p)} />
                  <div className="row" style={{ gap: 10, padding: '10px 8px 0' }}>
                    <div style={{ flex: 1 }}>
                      <div className="sub" style={{ fontSize: 12.5 }}>תקבל</div>
                      <div className="num" style={{ fontWeight: 900, fontSize: 16, color: 'var(--win)', textAlign: 'right' }}>{formatMoney(sellPrice(p, myTier))}</div>
                    </div>
                    <button className="btn ghost" style={{ width: 'auto', padding: '12px 22px', fontSize: 16 }}
                      disabled={!!blocked} onClick={() => trySell(p.id)}>
                      {blocked ?? 'מכור'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="spacer" />
        <button className="btn dark" onClick={onBack}>חזרה ›</button>
      </div>

      {offer && (
        <ContractSheet
          fa={offer}
          tier={myTier}
          budget={gs.meters.money}
          onCancel={() => setOffer(null)}
          onConfirm={confirmOffer}
        />
      )}

      {card && (
        <PlayerCard p={card} club={G.club(gs)} season={gs.seasonStats[card.id]} career={G.careerOf(gs, card.id)} traits={cardTraits} onClose={() => setCard(null)} />
      )}
    </>
  );
}

function ContractSheet({ fa, tier, budget, onCancel, onConfirm }: {
  fa: FreeAgent; tier: number; budget: number; onCancel: () => void; onConfirm: () => void;
}) {
  const o = overall(fa.player);
  const terms = contractTerms(fa, tier);
  const p = fa.player;

  return (
    <Portal>
    <div className="sheet-scrim" onClick={onCancel}>
      <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="הצעת חוזה">
        <div className="sheet-grip" />
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="h2">הצעת חוזה</div>
          <span className="chip" style={{ background: 'rgba(255,255,255,.07)', color: ovrColor(o) }}>{p.position} · <span className="num">{o}</span></span>
        </div>

        <div style={{ fontWeight: 900, fontSize: 20 }}>{p.name}</div>
        <div className="sub" style={{ fontSize: 14, marginBottom: 12 }}>גיל <span className="num">{p.age}</span> · {fa.note}</div>

        <div className="stack" style={{ gap: 8, marginBottom: 14 }}>
          <ContractLine label="דמי חתימה" value={formatMoney(terms.signOn)} hint="תשלום חד פעמי מהתקציב" />
          <ContractLine label="שכר שבועי" value={formatMoney(terms.wagePerWeek)} />
          <ContractLine label="אורך החוזה" value={`${terms.years} ${terms.years === 1 ? 'עונה' : 'עונות'}`} />
        </div>

        <div className="tile" style={{ padding: '10px 13px', marginBottom: 14, background: 'var(--bg)' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="sub" style={{ fontSize: 14 }}>התקציב אחרי החתימה</span>
            <b className="num" style={{ color: budget - terms.signOn < 0 ? 'var(--loss)' : 'var(--ink)' }}>
              {formatMoney(budget - terms.signOn)}
            </b>
          </div>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={onCancel}>ביטול</button>
          <button className="btn" style={{ flex: 2 }} onClick={onConfirm}>שלח הצעה וחתום ‹</button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

function ContractLine({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 12px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--line)' }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{label}</div>
        {hint && <div className="sub" style={{ fontSize: 12.5 }}>{hint}</div>}
      </div>
      <div className="num" style={{ fontWeight: 900, fontSize: 16, color: 'var(--gold-hi)' }}>{value}</div>
    </div>
  );
}

/** Filter the free agents by squad line, with a live count on each chip. */
function LineFilter({ value, onChange, market }: {
  value: G.MarketLine | 'all';
  onChange: (v: G.MarketLine | 'all') => void;
  market: FreeAgent[];
}) {
  const counts: Record<string, number> = { all: market.length, gk: 0, def: 0, mid: 0, atk: 0 };
  for (const fa of market) counts[LINE_OF[fa.player.position]]++;
  const opts: { key: G.MarketLine | 'all'; label: string }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'gk', label: LINE_LABEL.gk },
    { key: 'def', label: LINE_LABEL.def },
    { key: 'mid', label: LINE_LABEL.mid },
    { key: 'atk', label: LINE_LABEL.atk },
  ];
  return (
    <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
      {opts.map(o => {
        const on = value === o.key;
        return (
          <button key={o.key} onClick={() => onChange(o.key)} style={{
            padding: '7px 12px', borderRadius: '9px 9px 9px 3px', fontWeight: 800, fontSize: 13.5,
            border: `1px solid ${on ? 'transparent' : 'var(--line-2)'}`,
            background: on ? 'linear-gradient(180deg,var(--gold-hi),var(--gold))' : 'var(--surface)',
            color: on ? '#1B1305' : 'var(--ink-dim)',
          }}>
            {o.label} <span className="num" style={{ opacity: .7 }}>{counts[o.key]}</span>
          </button>
        );
      })}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="tile" style={{ textAlign: 'center', padding: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-dim)' }}>{text}</div>
    </div>
  );
}
