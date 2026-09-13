/**
 * A word on the way back to the hub.
 *
 * Two things a manager must not find out by accident: a man of his was sent
 * off and will not be allowed on the sheet next round, and the youth he
 * registered for one round has gone back down. Both arrive here, one at a
 * time, before the hub is shown, with the door to the place that fixes it.
 */
import * as G from '../../game/state.ts';
import { Icon } from '../components/Icon.tsx';
import { Meters } from '../components/bits.tsx';

export function NoticeScreen({ gs, onDismiss, onSquad, onYouth }: {
  gs: G.GameState;
  onDismiss: () => void;
  onSquad: () => void;
  onYouth: () => void;
}) {
  const n = gs.notices[0];
  if (!n) return null;

  const red = n.kind === 'suspended';
  const title = red ? 'הרחקה' : `${n.name} חוזר לנוער`;
  const body = red
    ? `${n.name} קיבל אדום ולא ישחק מול ${n.rival}. הוא חייב לצאת מההרכב.`
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
            <Icon name={red ? 'alert' : 'star'} size={30} color={red ? 'var(--loss)' : 'var(--win)'} />
          </div>
          <div className="h2" style={{ marginBottom: 6 }}>{title}</div>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55, color: 'var(--ink)' }}>{body}</p>
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
