import { Portal } from './Portal.tsx';
import { Icon } from './Icon.tsx';

/**
 * Asked before the phone's back button is allowed to take him out.
 *
 * Pressing back at the hub used to close the game with no warning, which every
 * tester read as a crash. The career is saved on every change so nothing is
 * ever actually lost, and this says so: the question is only whether he meant
 * to leave, not whether he is about to lose a season.
 */
export function ExitSheet({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <Portal>
      <div className="moment-scrim" onClick={onStay}>
        <div className="exit-sheet" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="stack" style={{ alignItems: 'center', gap: 6 }}>
            <Icon name="alert" size={26} color="var(--gold)" />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold)' }}>לצאת מהמשחק?</div>
            <p className="sub" style={{ textAlign: 'center', margin: 0 }}>
              הקריירה שלך שמורה. תמיד אפשר להמשיך בדיוק מכאן.
            </p>
          </div>
          <button className="btn" style={{ marginTop: 16 }} onClick={onStay}>נשארים</button>
          <button className="btn dark btn-sm" style={{ marginTop: 9 }} onClick={onLeave}>יציאה</button>
        </div>
      </div>
    </Portal>
  );
}
