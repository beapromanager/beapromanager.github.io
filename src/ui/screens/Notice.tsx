/**
 * A word on the way back to the hub.
 *
 * Things a manager must not find out by accident: a man of his was sent off
 * and will not be allowed on the sheet next round, the youth he registered for
 * one round has gone back down, and the winter window has opened. Each arrives
 * here, one at a time, before the hub is shown, with the door to the place
 * that deals with it.
 */
import { useState } from 'react';
import * as G from '../../game/state.ts';
import { Icon } from '../components/Icon.tsx';
import { Meters, formatMoney, formatMoneyExact } from '../components/bits.tsx';
import { Kit } from '../components/Kit.tsx';
import { homeKit } from '../../data/kits.ts';
import { asset } from '../asset.ts';

export function NoticeScreen({ gs, onDismiss, onSquad, onYouth, onTransfers }: {
  gs: G.GameState;
  onDismiss: () => void;
  onSquad: () => void;
  onYouth: () => void;
  onTransfers: () => void;
}) {
  const n = gs.notices[0];
  if (!n) return null;
  if (n.kind === 'window') return <WindowNotice gs={gs} weeks={n.weeks} onDismiss={onDismiss} onTransfers={onTransfers} />;
  if (n.kind === 'sponsor') return <SponsorNotice gs={gs} brand={n.brand} onDismiss={onDismiss} />;

  const red = n.kind === 'suspended';
  const title = red ? 'הרחקה' : n.kind === 'story' ? n.title : `${n.name} חוזר לנוער`;
  const body = red
    ? `${n.name} קיבל אדום ולא ישחק מול ${n.rival}. הוא חייב לצאת מההרכב.`
    : n.kind === 'story' ? n.body
    : `הוא היה רשום לסגל רק למחזור הזה. עכשיו הוא חוזר למחלקת הנוער להמשיך להתפתח.`;

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 14 }}>
        <div className="tile" style={{
          textAlign: 'center', padding: '26px 18px 22px',
          borderColor: red ? 'rgba(226,72,77,.45)' : 'var(--line)',
          background: red ? 'linear-gradient(180deg, rgba(226,72,77,.12), var(--surface))' : 'var(--surface)',
        }}>
          <div style={{
            width: 62, height: 62, borderRadius: 999, margin: '0 auto 12px',
            display: 'grid', placeItems: 'center',
            background: red ? 'rgba(226,72,77,.18)' : 'rgba(51,194,122,.16)',
          }}>
            <Icon name={red ? 'alert' : n.kind === 'story' ? 'mic' : 'star'} size={30} color={red ? 'var(--loss)' : 'var(--win)'} />
          </div>
          <div className="h2" style={{ marginBottom: 6 }}>{title}</div>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: 'var(--ink)' }}>{body}</p>
          {red && n.needYouth && (
            <p className="hint" style={{ margin: '12px 0 0', color: 'var(--gold-hi)' }}>
              בסגל יש רק {G.MIN_SQUAD - 1} שמות כשירים והליגה דורשת {G.MIN_SQUAD}. תרשום שחקן מהנוער למחזור,
              הוא לא ישחק ויחזור לנוער אחרי המשחק.
            </p>
          )}
        </div>

        <div className="spacer" />
        {red ? (
          <div className="stack" style={{ gap: 9 }}>
            <button className="btn" onClick={onSquad}>
              <Icon name="shirt" size={17} /> לדף ההרכב
            </button>
            {n.needYouth && (
              <button className="btn dark" onClick={onYouth}>
                <Icon name="star" size={17} /> לרשום מהנוער
              </button>
            )}
            <button className="btn dark" onClick={onDismiss}>הבנתי, אחר כך</button>
          </div>
        ) : (
          <button className="btn" onClick={onDismiss}>הבנתי</button>
        )}
      </div>
    </>
  );
}

/**
 * The shirt is theirs. The brand's mark up top, the season's shirt with the
 * name across the chest, one line in the brand's own voice and the deal in
 * numbers. It is the first thing on the way to the hub after the summer, so
 * the sponsor is a face before it is a row in the ledger.
 */
function SponsorNotice({ gs, brand, onDismiss }: { gs: G.GameState; brand: G.BrandId; onDismiss: () => void }) {
  const b = G.brandById(brand);
  const s = gs.sponsor;
  const c = G.club(gs);
  const rounds = gs.league.rounds;
  const [logoOk, setLogoOk] = useState(true);
  const dealLine = s
    ? `${s.name} · ${formatMoneyExact(s.perRound)} למחזור` + (s.promotionBonus > 0 ? ` · ${formatMoney(s.promotionBonus)} על עלייה` : s.followsCrowd ? ' · עד פי 2 לפי היציע' : ` · ${formatMoney(s.perRound * rounds)} לעונה`)
    : '';

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 14 }}>
        <div className="tile sponsor-welcome">
          <div className="sponsor-mark">
            {logoOk
              ? <img src={asset(b.logo)} alt={b.name} onError={() => setLogoOk(false)} />
              : <span className="sponsor-wordmark">{b.chest}</span>}
          </div>
          <div className="label-cap" style={{ color: 'var(--gold)' }}>הספונסר של העונה</div>
          <div className="h2" style={{ marginTop: 4 }}>ברוכים הבאים למשפחת {b.name}</div>
          <div style={{ margin: '14px auto 6px', animation: 'riseIn .45s var(--ease-out) both' }}>
            <Kit kit={homeKit(c)} size={150} sponsor={b.chest} sponsorLogo={logoOk ? asset(b.chestLogo ?? b.logo) : undefined} label={`המדים של ${c.short} העונה`} />
          </div>
          <p className="sponsor-voice">{b.welcome}</p>
          <div className="sponsor-deal">{dealLine}</div>
        </div>

        <div className="spacer" />
        <button className="btn" onClick={onDismiss}>יאללה, לעבודה</button>
      </div>
    </>
  );
}

/**
 * The winter window is open. A picture up top (Itzik's, at public/window.webp,
 * 9:12), the two facts that matter underneath: how long, and how much cash.
 */
function WindowNotice({ gs, weeks, onDismiss, onTransfers }: {
  gs: G.GameState; weeks: number; onDismiss: () => void; onTransfers: () => void;
}) {
  const money = gs.meters.money;
  const fmt = (n: number) => `₪${Math.round(Math.abs(n) / 1000)}K`;
  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 14 }}>
        <div className="tile" style={{ padding: 0, overflow: 'hidden', borderColor: 'rgba(233,185,73,.4)' }}>
          <div style={{ position: 'relative', aspectRatio: '9 / 12', background: 'linear-gradient(180deg, #1c2a1f, #0d1410)' }}>
            <img src={asset('/window.webp')} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, rgba(8,12,9,.92) 100%)' }} />
            <div style={{ position: 'absolute', insetInline: 18, bottom: 18 }}>
              <div className="label-cap" style={{ color: 'var(--gold-hi)', marginBottom: 6 }}>חלון ההעברות</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1.05 }}>חלון החורף נפתח</div>
            </div>
          </div>
          <div style={{ padding: '14px 16px 16px' }}>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55 }}>
              {weeks === 1 ? 'שבוע אחד' : `${weeks} שבועות`} לחזק, למכור, או לשבת בשקט.
              בקופה {money < 0 ? `מינוס ${fmt(money)}` : fmt(money)}.
              {money < 0 ? ' במינוס אפשר למכור גם כשהחלון סגור, אבל לקנות רק עכשיו.' : ' מי שלא חותם עכשיו מחכה לקיץ.'}
            </p>
          </div>
        </div>

        <div className="spacer" />
        <div className="stack" style={{ gap: 9 }}>
          <button className="btn" onClick={onTransfers}>
            <Icon name="handshake" size={17} /> לשוק ההעברות
          </button>
          <button className="btn dark" onClick={onDismiss}>אחר כך</button>
        </div>
      </div>
    </>
  );
}
