import { useState } from 'react';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';

/**
 * First run explainer. A new manager needs to know what the week looks like
 * before the week starts, otherwise the first three minutes are guesswork.
 */

interface Step {
  icon: IconName;
  color: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: 'calendar', color: 'var(--gold)',
    title: 'ככה נראה מחזור',
    body: 'כל מחזור הוא ארבעה שלבים: מישהו פונה אליך עם דילמה, אתה קובע טקטיקה, משחקים, ואז מסיבת עיתונאים. בערך שלוש דקות.',
  },
  {
    icon: 'star', color: 'var(--gold)',
    title: 'שלושת המדדים למעלה',
    body: 'תקציב הוא הכסף שיש לך לקנות שחקנים. מעמד הוא כמה המועדון נחשב, והוא מושך שחקנים טובים. מורל הוא מצב הרוח בקבוצה, והוא משפיע ישירות על איך משחקים במגרש.',
  },
  {
    icon: 'shirt', color: 'var(--sky)',
    title: 'הסגל וההרכב',
    body: 'יש לך 16 עד 20 שחקנים, 11 בהרכב והשאר בספסל. במסך הסגל אפשר להחליף ביניהם: לוחצים על מי שיוצא, ואז על מי שנכנס. שוער אחד בדיוק באחד עשר, תמיד.',
  },
  {
    icon: 'handshake', color: 'var(--win)',
    title: 'מה זה העברות',
    body: 'זה השוק. בחלון פתוח אפשר להציע חוזה לשחקן חופשי ולהחתים אותו בכסף, או למכור שחקן מהספסל כדי לפנות תקציב. החלון פתוח רק בתחילת העונה ובאמצע, אז אל תפספס.',
  },
  {
    icon: 'ball', color: 'var(--blood)',
    title: 'במשחק אתה מחליט',
    body: 'המשחק רץ דקה אחר דקה. תוכל לעצור, לשנות מהירות, לעשות עד 3 חילופים, ובכל רגע גדול המשחק יעצור וישאל אותך לאן לבעוט או מה לעשות. הכושר יורד, אז שים לב מי מתעייף.',
  },
];

export function Tutorial({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className="sheet-scrim" style={{ alignItems: 'center', padding: 16 }}>
      <div className="sheet" style={{
        borderRadius: 'var(--r-xl)', border: '1px solid var(--line-2)',
        padding: '22px 20px', maxWidth: 400,
        animation: 'pop .35s var(--ease-out)',
      }} role="dialog" aria-label="הסבר">
        <div className="stack" style={{ alignItems: 'center', gap: 13, textAlign: 'center' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 20, display: 'grid', placeItems: 'center',
            background: `radial-gradient(100% 100% at 50% 0%, ${step.color}2e, transparent 70%), var(--surface-2)`,
            border: `1px solid ${step.color}55`,
          }}>
            <Icon name={step.icon} size={28} color={step.color} />
          </div>

          <div className="h2" style={{ fontSize: 21 }}>{step.title}</div>
          <p className="sub" style={{ fontSize: 14.5, lineHeight: 1.65 }}>{step.body}</p>

          {/* progress dots */}
          <div className="row" style={{ gap: 6, justifyContent: 'center', margin: '2px 0 4px' }}>
            {STEPS.map((_, n) => (
              <span key={n} style={{
                width: n === i ? 18 : 6, height: 6, borderRadius: 3,
                background: n === i ? 'var(--gold)' : 'var(--line-3)',
                transition: 'all var(--t-mid) var(--ease)',
              }} />
            ))}
          </div>

          <button className="btn" onClick={() => (last ? onDone() : setI(i + 1))}>
            {last ? 'יאללה, מתחילים' : 'הבא'}
            {!last && <Icon name="chevron" size={16} />}
          </button>

          {!last && (
            <button className="btn ghost btn-sm" style={{ minHeight: 40 }} onClick={onDone}>
              דלג על ההסבר
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
