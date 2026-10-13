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

/** the card on the hub: the door to the place, with the tier's own training ground behind it */
export function AcademyHubCard({ gs, onOpen }: { gs: G.GameState; onOpen: () => void }) {
  const tier = G.club(gs).tier;
  const boys = gs.youth.players.length + (gs.youthUp?.length ?? 0);
  const ready = gs.youth.players.filter(p => p.age >= 18).length;
  return (
    <button className="acad-card" onClick={onOpen} aria-label="מחלקת הנוער">
      <img className="acad-card-img" src={asset(POSTER_BY_TIER(tier))} alt="" aria-hidden="true" loading="lazy" />
      <span className="acad-card-shade" />
      <span className="acad-card-body">
        <span className="acad-card-t">מחלקת הנוער</span>
        <span className="acad-card-s">
          {boys === 0 ? 'עוד אין לך נערים. תחפש מישהו לגדל.' : `יש לך ${boys} נערים. כנס לראות מי גדל.`}
        </span>
      </span>
      {ready > 0 && <span className="acad-card-dot" aria-label="נער בן 18 מחכה להחלטה" />}
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

  return (
    <div className="acad">
      <Dusk />
      <div className="acad-front">
        <Meters {...gs.meters} gems={gs.gems} />
        <div className="screen pad stack pad-b" style={{ gap: 13 }}>
          <TopBack onBack={onBack} />
          <div className="row" style={{ gap: 10, marginTop: 2 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="h2">מחלקת הנוער</div>
              <div className="sub" style={{ fontSize: 14 }}>{c.name} · בני 16-17, ובגיל 18 מחליטים</div>
            </div>
            <Crest club={c} size={40} />
          </div>
          <p className="acad-pitch">{PITCH[route]}</p>
          <p className="hint" style={{ margin: 0 }}>
            הפוטנציאל נפתח רק עם דקות. נער שלא פותחים אותו נשאר איפה שהוא. אפשר לרשום עד {CALL_UPS_PER_ROUND} למחזור, והם לא נספרים בסגל.
          </p>

          {up.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <span className="label-cap" style={{ color: 'var(--gold-hi)' }}>רשומים למחזור הזה</span>
              {up.map(p => (
                <KidCard key={p.id} p={p} apps={apps(p)} note="על הספסל. הוא ישחק רק אם תפתח אותו"
                  action={<button className="btn dark btn-sm acad-btn" onClick={() => onUndoCallUp(p.id)}>הוצא מהסגל</button>} />
              ))}
            </div>
          )}

          {ready.length > 0 && (
            <div className="stack" style={{ gap: 9 }}>
              <span className="label-cap" style={{ color: 'var(--gold-hi)' }}>בני 18, מחכים להחלטה</span>
              {ready.map(p => (
                <KidCard key={p.id} p={p} apps={apps(p)} gold note={null} action={
                  <div className="stack" style={{ gap: 7, width: '100%' }}>
                    <button className="btn btn-sm" style={{ opacity: canTake ? 1 : 0.4 }} disabled={!canTake} onClick={() => onPromote(p.id)}>
                      <Icon name="shirt" size={15} /> מעלה אותו לסגל הבוגר
                    </button>
                    <button className="btn dark btn-sm" onClick={() => onRelease(p.id)}>שחרר מהמחלקה</button>
                  </div>} />
              ))}
              {!canTake && <p className="hint" style={{ margin: '-2px 0 0' }}>הסגל מלא. שחרר או מכור שחקן כדי לפנות מקום.</p>}
            </div>
          )}

          <div className="stack" style={{ gap: 8 }}>
            <span className="label-cap">הנערים שלי · <span className="num">{kids.length + up.length}/{ACADEMY_MAX}</span></span>
            {growing.length === 0 && up.length === 0
              ? <div className="tile" style={{ textAlign: 'center', padding: 16, fontSize: 13.5, color: 'var(--ink-dim)' }}>
                  {route === 'free' ? 'אין פה אף נער. תעבור על הרשימה למטה, הם בחינם.'
                    : route === 'trip' ? 'אין פה אף נער. שלח סקאוט ותחכה לשני שמות.'
                      : 'האקדמיה ריקה. מי שנראה הכי טוב עולה הכי הרבה.'}
                </div>
              : growing.map(p => {
                const why = G.callUpBlockedReason(gs, p.id);
                return (
                  <KidCard key={p.id} p={p} apps={apps(p)} note={why && !why.startsWith('כבר') ? why : null} action={
                    <button className="btn btn-sm acad-btn" disabled={!!why} style={{ opacity: why ? 0.45 : 1 }} onClick={() => onCallUp(p.id)}>
                      רשום למחזור
                    </button>} releaseBtn={<button className="acad-link" onClick={() => onRelease(p.id)}>שחרר</button>} />
                );
              })}
            {growing.length > 0 && gs.youthUp.length >= CALL_UPS_PER_ROUND && (
              <p className="hint" style={{ margin: 0 }}>כבר רשמת {CALL_UPS_PER_ROUND} למחזור. השאר מחכים.</p>
            )}
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <span className="label-cap">מצא כישרון</span>
            {route === 'trip' && gs.youthPool.length === 0 && (
              <div className="tile stack" style={{ gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>שלח סקאוט לחפש נער</div>
                <div className="sub" style={{ fontSize: 14 }}>עולה <span className="num">{formatMoney(TRIP_FEE)}</span>, פעם בעונה. הוא חוזר עם שני נערים ואתה חותם על אחד מהם בחינם.</div>
                <button className="btn btn-sm" disabled={!!tripWhy} style={{ opacity: tripWhy ? 0.45 : 1 }} onClick={onTrip}>שלח את הסקאוט</button>
                {tripWhy && <div className="sub" style={{ fontSize: 12.5, color: 'var(--loss)', textAlign: 'center' }}>{tripWhy}</div>}
              </div>
            )}
            {gs.youthPool.map(o => <OfferCard key={o.player.id} o={o} gs={gs} onSign={() => onSign(o.player.id)} />)}
            {route !== 'trip' && gs.youthPool.length === 0 && (
              <div className="tile" style={{ textAlign: 'center', padding: 16, fontSize: 13.5, color: 'var(--ink-dim)' }}>הרשימה ריקה. היא מתחדשת כשהחלון נפתח.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KidCard({ p, apps, note, action, gold, releaseBtn }: {
  p: Player; apps: number; note: string | null; action: React.ReactNode; gold?: boolean; releaseBtn?: React.ReactNode;
}) {
  const o = overall(p);
  const r = rangeOf(p, apps);
  return (
    <div className="acad-kid" data-gold={gold ? '1' : '0'}>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <span className="chip" style={{ background: 'rgba(255,255,255,.07)', color: 'var(--ink-dim)', minWidth: 34, justifyContent: 'center' }}>{p.position}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div className="sub" style={{ fontSize: 13 }}>בן <span className="num">{p.age}</span> · פתח <span className="num">{apps}</span> העונה</div>
        </div>
        <div className="score-face num" style={{ fontSize: 26, color: ovrColor(o) }}>{o}</div>
      </div>
      <Range lo={r.lo} hi={r.hi} />
      {note && <div className="sub" style={{ fontSize: 12.5, marginTop: 6 }}>{note}</div>}
      <div className="row" style={{ gap: 10, marginTop: 10, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>{action}</div>
        {releaseBtn}
      </div>
    </div>
  );
}

function OfferCard({ o, gs, onSign }: { o: YouthOffer; gs: G.GameState; onSign: () => void }) {
  const why = G.signYouthBlockedReason(gs, o.player.id);
  const p = o.player;
  const r = rangeOf(p, 0);
  return (
    <div className="acad-kid">
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <span className="chip" style={{ background: 'rgba(255,255,255,.07)', color: 'var(--ink-dim)', minWidth: 34, justifyContent: 'center' }}>{p.position}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div className="sub" style={{ fontSize: 13 }}>בן <span className="num">{p.age}</span>{o.via === 'scout' ? ' · מצא הסקאוט' : ''}</div>
        </div>
        <div className="score-face num" style={{ fontSize: 26, color: ovrColor(overall(p)) }}>{overall(p)}</div>
      </div>
      <Range lo={r.lo} hi={r.hi} />
      <div className="row" style={{ gap: 10, marginTop: 10, alignItems: 'center' }}>
        <button className="btn btn-sm acad-btn" style={{ flex: 1, opacity: why ? 0.45 : 1 }} disabled={!!why} onClick={onSign}>
          {o.fee > 0 ? <>החתם · <span className="num">{formatMoney(o.fee)}</span></> : 'החתם, בחינם'}
        </button>
      </div>
      {why && <div className="sub" style={{ fontSize: 12.5, marginTop: 6, color: 'var(--loss)' }}>{why}</div>}
    </div>
  );
}
