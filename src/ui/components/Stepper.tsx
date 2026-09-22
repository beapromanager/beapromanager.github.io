/**
 * Progress through the opening of a career. Six stops before the first round,
 * so signing on feels like a journey rather than a form and a button.
 */

export const INTRO_STEPS = ['מי אתה', 'המועדון', 'הרזומה', 'החתימה', 'החברים', 'הסגל', 'השוק'] as const;

export function Stepper({ current }: { current: number }) {
  return (
    <div className="row" style={{ gap: 6, marginTop: 10 }} aria-label={`שלב ${current} מתוך ${INTRO_STEPS.length}`}>
      {INTRO_STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={label} className="stack" style={{ flex: 1, gap: 5, alignItems: 'center' }}>
            <div style={{
              height: 3, width: '100%', borderRadius: 2,
              background: done ? 'var(--gold-lo)' : active ? 'var(--gold)' : 'rgba(255,255,255,.1)',
              transition: 'background var(--t-mid) var(--ease)',
            }} />
            <span style={{
              fontSize: 9.5, fontWeight: 800, letterSpacing: '.02em',
              color: active ? 'var(--gold)' : done ? 'var(--ink-faint)' : 'var(--ink-faint)',
              opacity: active ? 1 : .65,
            }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
