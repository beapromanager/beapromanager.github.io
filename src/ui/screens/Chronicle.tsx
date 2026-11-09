import { TopBack } from '../components/TopBack.tsx';
import * as G from '../../game/state.ts';
import type { ChronicleEntry } from '../../game/chronicle.ts';
import { Icon } from '../components/Icon.tsx';
import { Meters } from '../components/bits.tsx';

/**
 * The manager's autobiography. Nothing to click on entries, they are memories,
 * not tasks. Newest first because that's what the manager is coming to see.
 */
export function ChronicleScreen({ gs, onBack }: { gs: G.GameState; onBack: () => void }) {
  const entries = [...gs.chronicle].reverse();

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 13 }}>
        <TopBack onBack={onBack} />
        <div className="row" style={{ gap: 10, marginTop: 2 }}>
          <Icon name="clipboard" size={22} color="var(--gold)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="h2">הכרוניקה שלך</div>
            <div className="sub" style={{ marginTop: 2 }}>
              {gs.chronicle.length === 0
                ? 'עוד לא נכתב פרק'
                : `${gs.chronicle.length} פרקים בקריירה של ${gs.profile.name}${gs.profile.nickname ? ` "${gs.profile.nickname}"` : ''}`}
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {entries.map(e => <ChronicleCard key={e.id} entry={e} />)}
          </div>
        )}

        <button className="btn" onClick={onBack}>חזרה למועדון</button>
      </div>
    </>
  );
}

function ChronicleCard({ entry }: { entry: ChronicleEntry }) {
  const color =
    entry.tint === 'summit' ? 'var(--el-g3)' :
    entry.tint === 'gold' ? 'var(--gold)' :
    entry.tint === 'win' ? 'var(--win)' :
    entry.tint === 'loss' ? 'var(--loss)' :
    'var(--draw)';
  // tokens are var() references, so alpha has to come from color-mix, not a hex suffix
  const fade = (pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
  return (
    <div className="tile" data-tint={entry.tint === 'summit' ? 'summit' : undefined} style={{ borderColor: fade(34), padding: 14 }}>
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: fade(10), border: `1px solid ${fade(27)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
        }}>
          <Icon name={entry.icon} size={22} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <b style={{ fontSize: 15, lineHeight: 1.25 }}>{entry.title}</b>
            <span className="chip" style={{ background: 'rgba(255,255,255,.05)', color: 'var(--ink-faint)', fontSize: 11 }}>
              {entry.week === 0 ? 'טרום עונה' : <>מחזור <span className="num">{entry.week}</span></>}
            </span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-dim)', marginTop: 6, lineHeight: 1.45 }}>
            {entry.body}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="tile" style={{ padding: 22, textAlign: 'center' }}>
      <Icon name="clipboard" size={34} color="var(--ink-faint)" style={{ margin: '0 auto 10px' }} />
      <div style={{ fontWeight: 700, marginBottom: 6 }}>הפרק הראשון עוד לא נכתב</div>
      <div className="sub">ניצחון ראשון, דרבי, קאמבק או כישרון צעיר שיפרוץ, כל אלה יופיעו כאן כשיקרו.</div>
    </div>
  );
}
