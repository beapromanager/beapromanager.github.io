import { useEffect, useState } from 'react';
import { teaserParts, teaserSeconds, teaserShown } from '../../game/teaser.ts';
import { asset } from '../asset.ts';
import '../teaser.css';

/**
 * "ליגת השכונה מגיעה": the dark ticket on the title screen, with a live count to the day registration opens.
 * Not a button and nothing to press: it promises a date, not a door. When the count ends it removes itself.
 */
export function LeagueTeaser() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!teaserShown(now)) return null;

  const p = teaserParts(teaserSeconds(now));
  const two = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="lt" role="group" aria-label="ליגת השכונה מגיעה">
      <img className="lt-img" src={asset('/weekend/entrance.webp')} alt="" loading="lazy" />
      <div className="lt-shade" aria-hidden="true" />
      <div className="lt-body">
        <div className="lt-k">בקרוב</div>
        <div className="lt-h">ליגת השכונה מגיעה</div>
        <p className="lt-m">פותחים ליגה עם החבר'ה, מחמישי 20:00 עד ראשון 20:00</p>
        <div className="lt-row">
          <span className="lt-lab">ההרשמה נפתחת בעוד</span>
          <span className="lt-c">
            {p.d > 0 && <span className="lt-d">{p.d === 1 ? 'יום' : `${p.d} ימים`} ו־</span>}
            <bdi dir="ltr">{two(p.h)}:{two(p.m)}:{two(p.s)}</bdi>
          </span>
        </div>
      </div>
    </div>
  );
}
