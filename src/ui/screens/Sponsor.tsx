import { useState } from 'react';
import * as G from '../../game/state.ts';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';
import { LEAGUE_NAMES } from '../../data/clubs.ts';
import { formatMoney, formatMoneyExact } from '../components/bits.tsx';
import { asset } from '../asset.ts';
import { LOYALTY_SEASONS, LOYALTY_RAISE } from '../../game/sponsor.ts';

/**
 * Selling the shirt, every summer.
 *
 * One brand wants it today and puts all three deals on the table: a steady
 * sum, less a round with a lump for going up, or a share that follows the
 * crowd. The screen is grouped by brand, mark first, pitch in the brand's own
 * voice, then its deals, so with more brands the choice would read as "who"
 * before "how much", and with one it reads as "how".
 *
 * A raised offer says so on the card, last year's price struck through beside
 * the new one: the loyalty of a brand kept three seasons, or, when there is
 * more than one brand, the comeback of the one turned down. The numbers are
 * the argument, the tag is the reason.
 */
export function SponsorScreen({ gs, onPick }: {
  gs: G.GameState; onPick: (id: G.SponsorId, brand: G.BrandId) => void;
}) {
  const c = G.club(gs);
  const offers = G.sponsorChoices(gs);
  const rounds = gs.league.rounds;
  const last = gs.sponsor && gs.sponsor.season === gs.season - 1 ? G.brandById(gs.sponsor.brand) : null;
  const n = G.BRANDS.length;
  // a running index over every card, so the stagger never assumes how many deals a brand has
  let card = 0;

  return (
    <div className="screen pad stack pad-b" style={{ gap: 15, minHeight: '100%' }}>
      <div className="row" style={{ marginTop: 4, gap: 11 }}>
        <Crest club={c} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="h2">מי על החולצה</div>
          <div className="sub" style={{ fontSize: 13.5 }}>
            {LEAGUE_NAMES[c.tier]} · עונה <span className="num">{gs.season}</span>
          </div>
        </div>
      </div>

      <div className="tile" style={{ padding: 14, fontSize: 14.5, lineHeight: 1.6 }}>
        {n === 1
          ? <>{G.BRANDS[0].name} רוצה את החולצה של {c.short} העונה, ומציעה <span className="num">{offers.length}</span> חוזים.</>
          : <>{n === 2 ? 'שני מותגים' : `${n} מותגים`} רוצים את החולצה של {c.short} העונה.</>}{' '}
        בוחרים הצעה אחת, ואפשר לשנות רק בקיץ הבא.
        {last && <span className="sub" style={{ display: 'block', marginTop: 4, fontSize: 13.5 }}>בעונה שעברה על החולצה: {last.name}.</span>}
      </div>

      {G.BRANDS.map(b => {
        const mine = offers.filter(o => o.brand === b.id);
        if (!mine.length) return null;
        return (
          <section key={b.id} className="stack" style={{ gap: 10 }}>
            <BrandHeader brand={b} />
            <div className="stack stagger" style={{ gap: 10 }}>
              {mine.map(o => (
                <button key={o.id} className="sponsor-card" style={{ ...({ '--i': card++ } as React.CSSProperties) }}
                  onClick={() => onPick(o.id, o.brand)}>
                  <div className="row" style={{ justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{o.name}</span>
                    <span className="sponsor-per">
                      {o.raise > 0 && <s className="sponsor-was num">{formatMoneyExact(o.plainPerRound)}</s>}
                      {formatMoneyExact(o.perRound)}<span className="sponsor-unit"> / מחזור</span>
                    </span>
                  </div>
                  <div className="sponsor-blurb">{o.blurb}</div>
                  <div className="row" style={{ gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
                    {o.raiseWhy === 'comeback' && <Tag hot icon="flame">רוצים אתכם חזרה, +{Math.round(o.raise * 100)}%</Tag>}
                    {o.raiseWhy === 'loyalty' && <Tag hot icon="handshake">נאמנות, +{Math.round(o.raise * 100)}%</Tag>}
                    <Tag>{formatMoney(o.perRound * rounds)} לעונה</Tag>
                    {o.promotionBonus > 0 && <Tag hot>+{formatMoney(o.promotionBonus)} על עלייה</Tag>}
                    {o.followsCrowd && <Tag hot>עד פי 2 לפי היציע</Tag>}
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      <p className="hint">
        {offers.some(o => o.followsCrowd) && <>חוזה היציע נמדד מול הקהל שהליגה מצפה לו, אז הרחבת אצטדיון מגדילה גם אותו, לא רק את הכנסות הכרטיסים. </>}
        {n > 1 && <>מותג שדחית חוזר בקיץ הבא עם הצעה גבוהה יותר. </>}
        {LOYALTY_SEASONS === 3 ? 'שלוש' : <span className="num">{LOYALTY_SEASONS}</span>} עונות ברצף עם אותו מותג מוסיפות <span className="num">{Math.round(LOYALTY_RAISE * 100)}%</span> לכל חוזה.
      </p>
    </div>
  );
}

/** The brand's mark, name, who they are, and the pitch in their own words. */
function BrandHeader({ brand }: { brand: G.Brand }) {
  const [logoOk, setLogoOk] = useState(true);
  return (
    <div className="brand-head">
      <div className="brand-mark">
        {logoOk
          ? <img src={asset(brand.logo)} alt={brand.name} onError={() => setLogoOk(false)} />
          : <span className="brand-wordmark">{brand.chest}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="brand-name">{brand.name}</div>
        <div className="brand-who">{brand.who}</div>
        <div className="brand-pitch">"{brand.pitch}"</div>
      </div>
    </div>
  );
}

function Tag({ children, hot, icon }: { children: React.ReactNode; hot?: boolean; icon?: 'star' | 'coins' | 'flame' | 'handshake' }) {
  return (
    <span className="chip" style={{
      background: hot ? 'rgba(233,185,73,.14)' : 'rgba(255,255,255,.05)',
      color: hot ? 'var(--gold-hi)' : 'var(--ink-dim)',
      border: hot ? '1px solid rgba(233,185,73,.3)' : '1px solid transparent',
    }}>
      <Icon name={icon ?? (hot ? 'star' : 'coins')} size={13} /> {children}
    </span>
  );
}
