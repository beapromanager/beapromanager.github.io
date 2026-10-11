import { useEffect, useState } from 'react';
import * as G from '../../game/state.ts';
import { Icon } from '../components/Icon.tsx';
import { Portal } from '../components/Portal.tsx';

/**
 * Itzik's gift to the managers who stayed (11.10). Past ten seasons a career
 * is stopped on the hub, once, and told so: first that it is worth something,
 * then that a striker ten above his league is waiting in a pack. One tap opens
 * it, and the pack's own ceremony takes over. The words are his.
 */
export function LoyalGift({ gs, onOpen }: { gs: G.GameState; onOpen: () => void }) {
  const [lit, setLit] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setLit(true), 120); return () => clearTimeout(t); }, []);
  const seasons = gs.season - 1;
  return (
    <Portal>
      <div className="moment-scrim" role="dialog" aria-modal="true" aria-label="מתנה למי שנשאר"
        style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
        {/* gold, and a lot of it: this is the one time the game says thank you */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(60% 45% at 50% 30%, rgba(233,185,73,.45), transparent 70%)',
          opacity: lit ? 1 : 0, transition: 'opacity 1.2s ease',
        }} />
        <div className="loyal-card" data-lit={lit ? '1' : '0'}>
          <div className="loyal-seasons">
            <span className="num">{seasons}</span>
            <span>עונות</span>
          </div>
          <div className="loyal-wow">WOW!</div>
          <p className="loyal-line">אלוף, אתה משחק מעל <span className="num">10</span> עונות במשחק.</p>
          <p className="loyal-line">קודם כל, <b>WOW</b>.</p>
          <p className="loyal-line">דבר שני, רצינו לפרגן לך בחבילה של שחקן <b>מעל הליגה</b>.</p>
          <p className="loyal-small">חלוץ ברמה של עשר נקודות מעל הליגה שלך, מושאל לחמישה משחקים. נכנס לסגל בלי שאף אחד יוצא, ובלי שכר.</p>
          {/* DRAFT WORDING, Itzik's to correct */}
          <p className="loyal-until">ההצעה בתוקף עד יום חמישי 15.10 בשעה 20:00</p>
          <button className="btn loyal-btn" onClick={onOpen}>
            <Icon name="star" size={18} /> פתח ת'חבילה
          </button>
        </div>
      </div>
    </Portal>
  );
}
