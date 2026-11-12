/**
 * The terms of use and the privacy policy as two screens that open over whatever is on, the tick that has to
 * be given before the weekend league, and the contact line (Itzik, 27.10). Self-contained: its own classes
 * (lg-), the game's tokens, nothing from the league's stylesheet, so it also works on the title screen.
 */
import { useEffect, useState } from 'react';
import { PRIVACY, TERMS, LEAGUE_NOTICE, STATS_NOTICE } from '../../data/legalText.ts';
import { CONTACT_EMAIL } from '../../game/legal.ts';
import { deviceId } from '../../game/telemetry.ts';
import './legal.css';

export type LegalKind = 'terms' | 'privacy';

export function LegalSheet({ kind, onClose }: { kind: LegalKind; onClose: () => void }) {
  const doc = kind === 'terms' ? TERMS : PRIVACY;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="lg-sheet" role="dialog" aria-modal="true" aria-label={doc.title} data-legal={kind}>
      <div className="lg-bg" onClick={onClose} />
      <div className="lg-card">
        <div className="lg-head"><h2>{doc.title}</h2><button className="lg-x" onClick={onClose}>סגור</button></div>
        <div className="lg-body">
          {doc.sections.map((s, i) => (
            <section key={i}>
              <h3>{s.h}</h3>
              {s.p.map((t, j) => t.startsWith('### ') ? <h4 key={j}>{t.slice(4)}</h4> : t.startsWith('- ') ? <ul key={j}><li>{linked(t.slice(2))}</li></ul> : <p key={j}>{linked(t)}</p>)}
            </section>
          ))}
          {kind === 'privacy' && <p className="lg-code">הקוד שלך לפנייה אלינו: <b dir="ltr">{deviceCode()}</b></p>}
        </div>
      </div>
    </div>
  );
}

/** the short code of this device, to put in a request to see or delete what is kept: the last characters of the random id, not the id itself */
export function deviceCode(): string {
  try { return deviceId().slice(-8).toUpperCase(); } catch { return 'לא זמין'; }
}

/** a paragraph with the contact address made a link wherever it appears */
function linked(t: string) {
  return t.split(CONTACT_EMAIL).flatMap((part, i, a) => (i < a.length - 1 ? [part, <Contact key={i} />] : [part]));
}

/** the one address a person can write to */
export function Contact({ label }: { label?: string }) {
  return <a className="lg-mail" href={`mailto:${CONTACT_EMAIL}`} dir="ltr">{label ?? CONTACT_EMAIL}</a>;
}

/** the two links to the documents plus the contact address; `open` is the page's state for the sheet */
export function LegalLinks({ open, className }: { open: (k: LegalKind) => void; className?: string }) {
  return (
    <span className={`lg-links ${className ?? ''}`}>
      <button type="button" className="lg-a" onClick={() => open('terms')}>תנאי שימוש</button>
      <span aria-hidden="true"> · </span>
      <button type="button" className="lg-a" onClick={() => open('privacy')}>מדיניות פרטיות</button>
      <span aria-hidden="true"> · </span>
      <Contact />
    </span>
  );
}

/** the box in front of a registration: never ticked from the start; the age is its own box (AgeBox) */
export function ConsentBox({ checked, onChange, open }: { checked: boolean; onChange: (v: boolean) => void; open: (k: LegalKind) => void }) {
  return (
    <div className="lg-consent">
      <label>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} data-consent="1" />
        <span>קראתי ואני מסכים/ה ל<button type="button" className="lg-a" onClick={() => open('terms')}>תנאי השימוש</button>. <button type="button" className="lg-a" onClick={() => open('privacy')}>מדיניות הפרטיות</button> לעיון.</span>
      </label>
    </div>
  );
}

/** the sentence a person ticks for their age (Itzik, 31.10: the weekend league is 16 and up) */
export const AGE_DECLARATION = 'אני מצהיר/ה שאני בן/בת 16 ומעלה';

/** the age declaration in front of a registration: its own box, never ticked from the start (Itzik, 31.10) */
export function AgeBox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="lg-consent">
      <label>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} data-age="16" />
        <span>{AGE_DECLARATION}</span>
      </label>
    </div>
  );
}

/**
 * What a person reads on a league registration screen, ABOVE the fields (Ariel, 11.11.2026): the notice word for
 * word (legalText.ts), then the two documents. The age box and the terms box stay their own boxes, outside it.
 */
export function LeagueNotice({ open }: { open: (k: LegalKind) => void }) {
  return (
    <div className="lg-notice" data-league-notice="1">
      <p>{linked(LEAGUE_NOTICE)}</p>
      <p className="lg-notice-links">
        <button type="button" className="lg-a" onClick={() => open('privacy')}>מדיניות הפרטיות</button>
        <span aria-hidden="true"> · </span>
        <button type="button" className="lg-a" onClick={() => open('terms')}>תנאי השימוש</button>
      </p>
    </div>
  );
}

/**
 * The notice before the first count is sent (11.11.2026): one paragraph, a link to the full policy, one button.
 * A notice, not a consent: there is no box to tick and nothing about age, and the career is not held behind it;
 * it stands over the title until "הבנתי" is pressed, and until then nothing is counted (telemetry.ts).
 */
export function StatsNotice({ onOk }: { onOk: () => void }) {
  const [legal, setLegal] = useState<LegalKind | null>(null);
  return (
    <div className="lg-sheet" role="dialog" aria-modal="true" aria-label="הודעה על ספירת השימוש" data-stats-notice="1">
      <div className="lg-bg" />
      <div className="lg-card lg-stats">
        <p>{STATS_NOTICE}</p>
        <p><button type="button" className="lg-a" onClick={() => setLegal('privacy')}>מדיניות הפרטיות</button></p>
        <button type="button" className="btn" onClick={onOk}>הבנתי</button>
      </div>
      {legal && <LegalSheet kind={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
