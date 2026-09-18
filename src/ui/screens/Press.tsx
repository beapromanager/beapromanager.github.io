import * as G from '../../game/state.ts';
import { Meters } from '../components/bits.tsx';
import { Icon } from '../components/Icon.tsx';
import type { PressTone } from '../../data/press.ts';

const TONE: Record<PressTone, { label: string; color: string; bg: string }> = {
  funny: { label: 'קליל', color: '#4aa3ff', bg: 'rgba(74,163,255,.14)' },
  serious: { label: 'ענייני', color: 'var(--gold-hi)', bg: 'rgba(232,182,76,.14)' },
  brutal: { label: 'קוטל', color: 'var(--loss)', bg: 'rgba(255,90,95,.14)' },
};

/**
 * The press room. The answers show only the words: what an answer does to the
 * room and to his standing is the reveal, not the menu. Once he has spoken
 * the meters move at the top and the verdict card says by how much, as the
 * meters actually moved, so a line that sounded brave and cost him is a thing
 * he finds out the way a manager does, afterwards.
 */
export function PressScreen({ gs, onPick, onNext }: { gs: G.GameState; onPick: (i: number) => void; onNext: () => void }) {
  const press = gs.press!;
  const q = press.q;
  const tone = TONE[q.tone];
  const picked = press.answered ?? null;
  const answered = picked !== null;
  const reply = answered ? q.answers[picked].reply : null;
  const verdict = G.pressVerdict(gs);
  // more of the conference to come, so the button says so rather than
  // promising the manager he is done
  const more = (press.queue?.length ?? 0) > 0;

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack pad-b" style={{ gap: 14 }}>
        <div className="row" style={{ marginTop: 4, justifyContent: 'space-between' }}>
          <span className="eyebrow">
            מסיבת עיתונאים{more ? ' · שאלה ראשונה' : press.queue ? ' · שאלה אחרונה' : ''}
          </span>
          <span className="chip" style={{ background: tone.bg, color: tone.color }}>{tone.label}</span>
        </div>

        {/* reporter */}
        <div className="row" style={{ alignItems: 'flex-start', gap: 12, animation: 'riseIn .25s ease' }}>
          <MicIcon color={tone.color} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: tone.color, marginBottom: 4 }}>{press.outlet}</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '4px 16px 16px 16px', padding: '13px 15px', fontSize: 15.5, lineHeight: 1.55 }}>
              {q.text}
            </div>
          </div>
        </div>

        {!answered && (
          <div className="stack" style={{ gap: 10, marginTop: 4 }}>
            {q.answers.map((a, i) => (
              <button key={i} className="btn dark" style={{ textAlign: 'start', minHeight: 58 }} onClick={() => onPick(i)}>
                <div style={{ fontWeight: 800, lineHeight: 1.4 }}>"{a.label}"</div>
              </button>
            ))}
          </div>
        )}

        {answered && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'riseIn .2s ease' }}>
              <div style={{ background: 'linear-gradient(180deg,var(--gold-hi),var(--gold))', color: '#1e1608', borderRadius: '16px 16px 4px 16px', padding: '11px 14px', fontSize: 16.5, maxWidth: '82%', fontWeight: 700 }}>
                "{q.answers[picked].label}"
              </div>
            </div>
            <div className="tile" style={{ fontSize: 16, animation: 'riseIn .25s ease .1s both' }}>
              <span style={{ color: 'var(--ink-dim)', fontWeight: 700, fontSize: 14.5 }}>התגובה </span>
              {reply}
            </div>
            {verdict && <Verdict v={verdict} />}
            <div className="spacer" />
            <button className="btn" onClick={onNext}>
              {more ? 'יש לו עוד שאלה ‹' : `סיום, ${gs.seasonOver ? 'לסיכום העונה' : 'למחזור הבא'} ‹`}
            </button>
          </>
        )}
      </div>
    </>
  );
}

/** What the answer did, one row per meter, landing one after the other. */
function Verdict({ v }: { v: { morale: number; prestige: number; fans: number } }) {
  return (
    <div className="tile verdict" style={{ animation: 'riseIn .3s var(--ease-out) .45s both' }}>
      <div className="label-cap" style={{ marginBottom: 8 }}>מה זה עשה לך</div>
      <VerdictRow icon="flame" label="המורל בחדר ההלבשה" v={v.morale} delay={.6} />
      <VerdictRow icon="star" label="המעמד שלך" v={v.prestige} delay={.95} />
      <VerdictRow icon="flag" label="האוהדים ביציע" v={v.fans} delay={1.3} />
    </div>
  );
}

function VerdictRow({ icon, label, v, delay }: { icon: 'flame' | 'star' | 'flag'; label: string; v: number; delay: number }) {
  const tone = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  return (
    <div className={`verdict-row ${tone}`} style={{ animation: `riseIn .3s var(--ease-out) ${delay}s both` }}>
      <Icon name={icon} size={15} />
      <span className="verdict-label">{label}</span>
      <span className="verdict-v num">{v > 0 ? `+${v}` : v < 0 ? String(v) : 'לא זז'}</span>
    </div>
  );
}

function MicIcon({ color }: { color: string }) {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }} aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" fill={color} />
      <path d="M6 11a6 6 0 0 0 12 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 17v4M9 21h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
