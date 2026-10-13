import { useState } from 'react';
import * as G from '../../game/state.ts';
import { overall } from '../../engine/matchEngine.ts';
import type { Player } from '../../engine/matchEngine.ts';
import { rangeOf, routeOf, TRIP_FEE, ACADEMY_MAX, CALL_UPS_PER_ROUND } from '../../game/academy.ts';
import type { YouthOffer } from '../../game/academy.ts';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';
import { TopBack } from '../components/TopBack.tsx';
import { Meters, formatMoney } from '../components/bits.tsx';
import { Gem } from '../components/Gem.tsx';
import { leagueCeiling } from '../../data/clubs.ts';
import { ovrColor } from '../../game/cards.ts';
import { asset } from '../asset.ts';

/**
 * The youth academy as a place (Itzik, 13.10): a door on the hub, a screen of its own with the training ground at
 * dusk behind it, the boys of 16 and 17 with a range on each (where he is, where he can get to now), and a door to
 * find another boy. Only the starts a boy plays open his potential, so every card asks the same question: play him?
 */

const POSTER_BY_TIER = (tier: number) => (tier <= 2 ? '/youth/tier-1.webp' : tier <= 4 ? '/youth/tier-3.webp' : '/youth/tier-5.webp');

const PITCH: Record<'free' | 'trip' | 'paid', string> = {
  free: 'ילדים של 16 מחכים שמישהו יסמן אותם. בחינם. כל מה שהם צריכים זה משחק.',
  trip: 'בליגה א׳ הכישרון לא מחכה בשוק. שולחים סקאוט, והוא חוזר עם שני שמות.',
  paid: 'כל נער פה עולה כסף, ומי שנראה הכי טוב עולה הכי הרבה. תחשוב על מי שווה את זה.',
};

/** the card on the hub: the door to the place. The division's own training ground moves slowly behind it, the floodlights breathe */
export function AcademyHubCard({ gs, onOpen }: { gs: G.GameState; onOpen: () => void }) {
  const tier = G.club(gs).tier;
  const up = gs.youthUp?.length ?? 0;
  const boys = gs.youth.players.length + up;
  const ready = gs.youth.players.filter(p => p.age >= 18).length;
  return (
    <button className="acad-card" data-ready={ready > 0 ? '1' : '0'} onClick={onOpen} aria-label="מחלקת הנוער">
      <span className="acad-card-pic" aria-hidden="true">
        <img src={asset(POSTER_BY_TIER(tier))} alt="" loading="lazy" />
      </span>
      <span className="acad-card-glow" aria-hidden="true" />
      <span className="acad-card-shade" aria-hidden="true" />
      <span className="acad-card-body">
        <span className="acad-card-kick">המקום של הדור הבא</span>
        <span className="acad-card-t">מחלקת הנוער</span>
        <span className="acad-card-s">
          {boys === 0 ? 'עוד אין לך נערים. תחפש מישהו לגדל.' : 'הנערים שלך מחכים לדקות. כנס לראות מי גדל.'}
        </span>
        <span className="acad-card-stats">
          <span className="acad-pill"><b className="num">{boys}</b> נערים</span>
          {up > 0 && <span className="acad-pill" data-hot="1"><b className="num">{up}</b> למחזור</span>}
          {ready > 0 && <span className="acad-pill" data-hot="1"><b className="num">{ready}</b> מוכנים לעלות</span>}
        </span>
      </span>
      <span className="acad-card-go" aria-hidden="true"><Icon name="chevron" size={18} color="#1B1305" /></span>
    </button>
  );
}

/** the loop behind the screen: the poster first, the video over it once it plays, nothing moving for a reduced-motion phone */
function Dusk() {
  const [playing, setPlaying] = useState(false);
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className="acad-bg" aria-hidden="true">
      <img src={asset('/youth/dusk-poster.webp')} alt="" />
      {!still && (
        <video autoPlay muted loop playsInline disablePictureInPicture preload="auto" poster={asset('/youth/dusk-poster.webp')}
          onPlaying={() => setPlaying(true)} style={{ opacity: playing ? 1 : 0 }}>
          <source src={asset('/youth/dusk-loop.mp4')} type="video/mp4" />
        </video>
      )}
      <span className="acad-bg-shade" />
    </div>
  );
}

/** one bar: gold up to where he is, a pale stretch to where he can get to now, and the two numbers */
function Range({ lo, hi }: { lo: number; hi: number }) {
  const at = (v: number) => `${Math.max(0, Math.min(100, ((v - 40) / 59) * 100))}%`;
  return (
    <div className="acad-range" dir="ltr">
      <span className="acad-range-bar">
        <i className="acad-range-now" style={{ width: at(lo) }} />
        <i className="acad-range-room" style={{ left: at(lo), width: `calc(${at(hi)} - ${at(lo)})` }} />
      </span>
      <span className="acad-range-n num">{lo}-{hi}</span>
    </div>
  );
}

/** how good a boy can be, in a word, against the division he is in. By what is shown, never by the hidden ceiling. */
function rarity(hi: number, tier: number): { key: 'plain' | 'rising' | 'gold' | 'gem'; label: string } {
  const d = hi - leagueCeiling(tier);
  return d >= 14 ? { key: 'gem', label: 'יהלום' } : d >= 7 ? { key: 'gold', label: 'כישרון' } : d >= 0 ? { key: 'rising', label: 'מבטיח' } : { key: 'plain', label: 'רגיל' };
}

export function AcademyScreen({ gs, onPromote, onRelease, onCallUp, onUndoCallUp, onSign, onTrip, onBack }: {
  gs: G.GameState;
  onPromote: (id: string) => void;
  onRelease: (id: string) => void;
  onCallUp: (id: string) => void;
  onUndoCallUp: (id: string) => void;
  onSign: (id: string) => void;
  onTrip: () => void;
  onBack: () => void;
}) {
  const c = G.club(gs);
  const route = routeOf(c.tier);
  const sq = G.mySquad(gs);
  const up = (gs.youthUp ?? []).map(id => [...sq.starters, ...sq.bench].find(p => p.id === id)).filter((p): p is Player => !!p);
  const kids = [...gs.youth.players].sort((a, b) => (b.age - a.age) || overall(b) - overall(a));
  const ready = kids.filter(p => p.age >= 18);
  const growing = kids.filter(p => p.age < 18);
  const canTake = G.squadSize(gs) < G.MAX_SQUAD;
  const apps = (p: Player) => gs.seasonStats[p.id]?.apps ?? 0;
  const tripWhy = G.youthTripBlockedReason(gs);
  const boys = kids.length + up.length;

  return (
    <div className="acad">
      <Dusk />
      <div className="acad-front">
        <Meters {...gs.meters} gems={gs.gems} />
        <div className="screen pad stack pad-b" style={{ gap: 14 }}>
          <TopBack onBack={onBack} />

          <header className="acad-hero">
            <span className="acad-hero-glow" aria-hidden="true" />
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="acad-hero-kick">{c.name} · בני 16-17</div>
                <h1 className="acad-hero-t">מחלקת הנוער</h1>
              </div>
              <Crest club={c} size={44} />
            </div>
            <p className="acad-pitch">{PITCH[route]}</p>
            <div className="acad-stats">
              <div className="acad-stat"><b className="num">{boys}<small>/{ACADEMY_MAX}</small></b><span>נערים</span></div>
              <div className="acad-stat" data-hot={up.length > 0 ? '1' : '0'}><b className="num">{up.length}<small>/{CALL_UPS_PER_ROUND}</small></b><span>למחזור</span></div>
              <div className="acad-stat" data-hot={ready.length > 0 ? '1' : '0'}><b className="num">{ready.length}</b><span>מוכנים לעלות</span></div>
            </div>
            <p className="acad-rule">הפוטנציאל נפתח רק עם דקות. נער שלא פותחים נשאר איפה שהוא.</p>
          </header>

          {up.length > 0 && (
            <section className="stack" style={{ gap: 9 }}>
              <h2 className="acad-h" data-hot="1">רשומים למחזור הזה</h2>
              {up.map((p, i) => (
                <KidCard key={p.id} i={i} p={p} apps={apps(p)} tier={c.tier} note="על הספסל. הוא ישחק רק אם תפתח אותו"
                  action={<button className="btn dark btn-sm acad-btn" onClick={() => onUndoCallUp(p.id)}>הוצא מהסגל</button>} />
              ))}
            </section>
          )}

          {ready.length > 0 && (
            <section className="stack" style={{ gap: 9 }}>
              <h2 className="acad-h" data-hot="1">בני 18, מחכים להחלטה</h2>
              {ready.map((p, i) => (
                <KidCard key={p.id} i={i} p={p} apps={apps(p)} tier={c.tier} gold note={null} action={
                  <div className="stack" style={{ gap: 7, width: '100%' }}>
                    <button className="btn btn-sm" style={{ opacity: canTake ? 1 : 0.4 }} disabled={!canTake} onClick={() => onPromote(p.id)}>
                      <Icon name="shirt" size={15} /> מעלה אותו לסגל הבוגר
                    </button>
                    <button className="btn dark btn-sm" onClick={() => onRelease(p.id)}>שחרר מהמחלקה</button>
                  </div>} />
              ))}
              {!canTake && <p className="hint" style={{ margin: '-2px 0 0' }}>הסגל מלא. שחרר או מכור שחקן כדי לפנות מקום.</p>}
            </section>
          )}

          <section className="stack" style={{ gap: 9 }}>
            <h2 className="acad-h">הנערים שלי</h2>
            {growing.length === 0 && up.length === 0
              ? <div className="acad-empty">
                  {route === 'free' ? 'אין פה אף נער. תעבור על הרשימה למטה, הם בחינם.'
                    : route === 'trip' ? 'אין פה אף נער. שלח סקאוט ותחכה לשני שמות.'
                      : 'האקדמיה ריקה. מי שנראה הכי טוב עולה הכי הרבה.'}
                </div>
              : growing.map((p, i) => {
                const why = G.callUpBlockedReason(gs, p.id);
                return (
                  <KidCard key={p.id} i={i} p={p} apps={apps(p)} tier={c.tier} note={why && !why.startsWith('כבר') ? why : null} action={
                    <button className="btn btn-sm acad-btn" disabled={!!why} style={{ opacity: why ? 0.45 : 1 }} onClick={() => onCallUp(p.id)}>
                      רשום למחזור
                    </button>} releaseBtn={<button className="acad-link" onClick={() => onRelease(p.id)}>שחרר</button>} />
                );
              })}
            {growing.length > 0 && gs.youthUp.length >= CALL_UPS_PER_ROUND && (
              <p className="hint" style={{ margin: 0 }}>כבר רשמת {CALL_UPS_PER_ROUND} למחזור. השאר מחכים.</p>
            )}
          </section>

          <section className="stack" style={{ gap: 9 }}>
            <div className="acad-door" aria-hidden="true">
              <img src={asset(POSTER_BY_TIER(c.tier))} alt="" loading="lazy" />
              <span className="acad-door-shade" />
              <span className="acad-door-t">מצא כישרון</span>
              <span className="acad-door-s">
                {route === 'free' ? 'ארבעה נערים בחינם, מתחדשים כשהחלון נפתח'
                  : route === 'trip' ? 'הסקאוט יוצא פעם בעונה וחוזר עם שני שמות'
                    : 'שישה נערים, כל אחד במחיר שלו'}
              </span>
            </div>
            {route === 'trip' && gs.youthPool.length === 0 && (
              <div className="acad-kid stack" style={{ gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>שלח סקאוט לחפש נער</div>
                <div className="sub" style={{ fontSize: 14 }}>עולה <span className="num">{formatMoney(TRIP_FEE)}</span>, פעם בעונה. אתה חותם על אחד משני הנערים שהוא מוצא, בחינם.</div>
                <button className="btn btn-sm" disabled={!!tripWhy} style={{ opacity: tripWhy ? 0.45 : 1 }} onClick={onTrip}>שלח את הסקאוט</button>
                {tripWhy && <div className="sub" style={{ fontSize: 12.5, color: 'var(--loss)', textAlign: 'center' }}>{tripWhy}</div>}
              </div>
            )}
            {gs.youthPool.map((o, i) => <OfferCard key={o.player.id} i={i} o={o} gs={gs} tier={c.tier} onSign={() => onSign(o.player.id)} />)}
            {route !== 'trip' && gs.youthPool.length === 0 && (
              <div className="acad-empty">הרשימה ריקה. היא מתחדשת כשהחלון נפתח.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/** the talent card: his rating big, what he can reach now on the bar, a word for how far that is */
function Face({ p, apps, tier, i, gold, children }: { p: Player; apps: number; tier: number; i: number; gold?: boolean; children: React.ReactNode }) {
  const o = overall(p);
  const r = rangeOf(p, apps);
  const ra = rarity(r.hi, tier);
  return (
    <article className="tcard" data-r={ra.key} data-gold={gold ? '1' : '0'} style={{ ['--i' as string]: i }}>
      <span className="tcard-sheen" aria-hidden="true" />
      <div className="tcard-top">
        <div className="tcard-ovr">
          <span className="score-face num" style={{ color: ovrColor(o) }}>{o}</span>
          <span className="tcard-pos">{p.position}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tcard-name">{p.name}</div>
          <div className="tcard-sub">בן <span className="num">{p.age}</span> · פתח <span className="num">{apps}</span> העונה</div>
        </div>
        <div className="tcard-badge" data-r={ra.key}>
          {ra.key === 'gem' ? <Gem size={20} /> : <Icon name="star" size={17} color="currentColor" />}
          <span>{ra.label}</span>
        </div>
      </div>
      <Range lo={r.lo} hi={r.hi} />
      {children}
    </article>
  );
}

function KidCard({ p, apps, tier, i, note, action, gold, releaseBtn }: {
  p: Player; apps: number; tier: number; i: number; note: string | null; action: React.ReactNode; gold?: boolean; releaseBtn?: React.ReactNode;
}) {
  return (
    <Face p={p} apps={apps} tier={tier} i={i} gold={gold}>
      {note && <div className="tcard-note">{note}</div>}
      <div className="row" style={{ gap: 10, marginTop: 11, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>{action}</div>
        {releaseBtn}
      </div>
    </Face>
  );
}

function OfferCard({ o, gs, tier, i, onSign }: { o: YouthOffer; gs: G.GameState; tier: number; i: number; onSign: () => void }) {
  const why = G.signYouthBlockedReason(gs, o.player.id);
  return (
    <Face p={o.player} apps={0} tier={tier} i={i}>
      {o.via === 'scout' && <div className="tcard-note">מצא הסקאוט</div>}
      <div className="row" style={{ gap: 10, marginTop: 11, alignItems: 'center' }}>
        <button className="btn btn-sm acad-btn" style={{ flex: 1, opacity: why ? 0.45 : 1 }} disabled={!!why} onClick={onSign}>
          {o.fee > 0 ? <>החתם · <span className="num">{formatMoney(o.fee)}</span></> : 'החתם, בחינם'}
        </button>
      </div>
      {why && <div className="tcard-note" style={{ color: 'var(--loss)' }}>{why}</div>}
    </Face>
  );
}
