import type { SaveSummary } from '../../game/save.ts';
import { asset } from '../asset.ts';
import { Icon } from '../components/Icon.tsx';
import { useEffect, useState } from 'react';
import { watchInstall, isInstalled } from '../install.ts';
import type { IconName } from '../components/Icon.tsx';

/**
 * Entry screen. The job of these three seconds is to say what this game is:
 * an Israeli club, at night, under floodlights, and you are the manager.
 */
export function TitleScreen({ saved, onNew, onContinue, onInstall }: {
  saved: SaveSummary | null;
  onNew: () => void;
  onContinue: () => void;
  /** open the "put it on your home screen" sheet */
  onInstall: () => void;
}) {
  // Chrome decides a site is installable a moment after load, so this screen
  // has to be told when that happens rather than reading it once
  const [, bump] = useState(0);
  useEffect(() => watchInstall(() => bump(n => n + 1)), []);
  const installed = isInstalled();

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', position: 'relative' }}>
      <Stadium />

      <div className="pad stack" style={{ gap: 14, position: 'relative', zIndex: 2, flex: 1 }}>
        {/* wordmark, drawn like a matchday poster */}
        <div className="stack" style={{ alignItems: 'center', gap: 12, marginTop: 'clamp(26px,8vh,70px)' }}>
          <img src={asset('/logo.webp')} alt="BE A PRO" className="title-rise" style={{
            width: 138, height: 138, objectFit: 'contain',
            ['--i' as string]: 0,
            maskImage: 'radial-gradient(closest-side, #000 62%, transparent 97%)',
            WebkitMaskImage: 'radial-gradient(closest-side, #000 62%, transparent 97%)',
            filter: 'drop-shadow(0 14px 40px rgba(233,185,73,.34))',
          }} />

          <h1 className="title-rise" style={{
            ['--i' as string]: 1,
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: 'clamp(58px,18vw,82px)',
            lineHeight: .92, letterSpacing: '-.02em', margin: 0, textAlign: 'center',
            backgroundImage: 'linear-gradient(180deg,#fff 16%,var(--gold-hi) 58%,var(--gold-lo))',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            filter: 'drop-shadow(0 10px 34px rgba(233,185,73,.22))',
          }}>
            BE A PRO
          </h1>

          {/* slanted broadcast tag under the mark */}
          <div className="title-rise" style={{ ['--i' as string]: 2, position: 'relative', padding: '5px 16px', marginTop: -2 }}>
            <span aria-hidden="true" style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg,var(--gold-hi),var(--gold) 60%,var(--gold-lo))',
              transform: 'skewX(-10deg)', borderRadius: 3,
            }} />
            <span style={{
              position: 'relative', fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 16, letterSpacing: '0', color: '#1B1305', lineHeight: 1,
            }}>
              מהשכונה ועד אירופה
            </span>
          </div>

          <div className="title-rise stack" style={{ ['--i' as string]: 3, alignItems: 'center', gap: 7, marginTop: 6, maxWidth: 330 }}>
            <p style={{
              margin: 0, textAlign: 'center', fontSize: 15, lineHeight: 1.52,
              fontWeight: 600, color: 'var(--ink)', textWrap: 'balance',
            }}>
              קח את הקבוצה של העיר שלך מליגה ג׳. תקבע הרכב, תקנה או תמכור שחקנים ותענה לעיתונות בחוכמה.
            </p>
            <span aria-hidden="true" style={{
              width: 42, height: 1, background: 'linear-gradient(90deg, transparent, var(--gold-lo), transparent)',
            }} />
            <p style={{
              margin: 0, textAlign: 'center', fontSize: 13, lineHeight: 1.5,
              color: 'var(--ink-dim)', textWrap: 'balance',
            }}>
              חוויה ישראלית אמיתית: היציע מדבר אלייך, השכונה מגיבה למעשים שלך, והעיתונות מחכה שתיפול.
            </p>
          </div>
        </div>

        <div className="spacer" />

        {/* actions */}
        <div className="stack" style={{ gap: 10, paddingBottom: 8 }}>
          {saved && (
            <button className="btn" onClick={onContinue} style={{ minHeight: 68, flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 18 }}>המשך קריירה</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 700, letterSpacing: 0, opacity: .8 }}>
                {saved.clubName} · מחזור <span className="num">{saved.week}/{saved.rounds}</span>
              </span>
            </button>
          )}

          <button className={saved ? 'btn dark' : 'btn'} onClick={onNew} style={{ minHeight: saved ? 56 : 68 }}>
            <Icon name="flag" size={18} color={saved ? 'var(--gold)' : undefined} />
            {saved ? 'קריירה חדשה' : 'התחל קריירה'}
          </button>

          {saved && <p className="hint" style={{ textAlign: 'center' }}>קריירה חדשה תמחק את הקריירה השמורה.</p>}

          {/* The install belongs HERE, before a career, not buried in the game.
              Somebody who has just arrived should be able to put the game on his
              phone and open it from there, rather than discovering the option
              three screens into a career he started in a browser tab. Shown
              whatever the device says: the sheet knows the right route for each
              one, including the browsers that have none, so this is never a
              button that does nothing. */}
          {!installed && (
            <button className="title-install" onClick={onInstall}>
              <Icon name="download" size={17} color="var(--gold)" />
              <span style={{ flex: 1, textAlign: 'start' }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800 }}>שים את המשחק על מסך הבית</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', fontWeight: 600, marginTop: 1 }}>
                  נפתח כמו אפליקציה, בלי שורת כתובת
                </span>
              </span>
              <Icon name="chevron" size={15} color="var(--ink-faint)" />
            </button>
          )}

          <div className="title-does" style={{ marginTop: 4 }}>
            <Feature icon="clipboard" text="טקטיקה" />
            <Feature icon="handshake" text="העברות" />
            <Feature icon="mic" text="עיתונות" />
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--ink-faint)', margin: 0 }}>
          המשחק נעשה ע״י <span dir="ltr">ITZIK UZIEL, ISRU</span> · כל השמות והמועדונים בדיוניים
          <br />
          סופרים שימוש אנונימי כדי לדעת מה לשפר. השמות שאתה מקליד נשארים במכשיר שלך.
        </p>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: IconName; text: string }) {
  return (
    <div>
      <Icon name={icon} size={16} color="color-mix(in srgb, var(--gold) 62%, transparent)" />
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-dim)' }}>{text}</span>
    </div>
  );
}

/** Pure CSS stadium at night: floodlights, pitch stripes, a crowd haze. */
function Stadium() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      {/* crowd haze */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(90% 46% at 50% 12%, rgba(120,150,132,.14), transparent 65%)',
      }} />
      {/* the bloom the wordmark stands inside */}
      <div style={{
        position: 'absolute', left: '50%', top: '2%', width: '126%', height: '54%',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(50% 50% at 50% 36%, rgba(233,185,73,.15), rgba(233,185,73,.05) 44%, transparent 74%)',
      }} />
      {/* floodlight beams */}
      <Beam left="10%" rotate={-13} />
      <Beam left="90%" rotate={13} />
      {/* a vignette, because light with no edge is just a brighter screen */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(126% 80% at 50% 30%, transparent 40%, rgba(3,6,4,.6) 100%)',
      }} />
      {/* pitch */}
      <div style={{
        position: 'absolute', left: '-14%', right: '-14%', bottom: '-6%', height: '46%',
        background: 'linear-gradient(180deg, rgba(28,84,52,.55), rgba(8,20,13,.9) 78%)',
        transform: 'perspective(520px) rotateX(58deg)', transformOrigin: 'bottom',
        maskImage: 'linear-gradient(180deg, transparent, #000 26%)',
        WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 26%)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: .5,
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 44px, transparent 44px 88px)',
        }} />
      </div>
      {/* and one grain over everything, which is what makes four separate
          layers read as a single photograph rather than as four gradients */}
      <div style={{
        position: 'absolute', inset: '-8%', opacity: .05, mixBlendMode: 'overlay',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }} />
    </div>
  );
}

function Beam({ left, rotate }: { left: string; rotate: number }) {
  return (
    <div style={{
      position: 'absolute', top: '-12%', left, width: 190, height: '78%',
      transform: `translateX(-50%) rotate(${rotate}deg)`, transformOrigin: 'top center',
      background: 'linear-gradient(180deg, rgba(214,235,222,.16), transparent 72%)',
      filter: 'blur(16px)', pointerEvents: 'none',
    }} />
  );
}
