import { useEffect, useState } from 'react';
import { surnameOf } from '../../data/names.ts';
import type { Player } from '../../engine/matchEngine.ts';
import { overall } from '../../engine/matchEngine.ts';
import type { Club } from '../../data/clubs.ts';
import type { PlayerSeason, CareerSeason, PartOption, PartKind } from '../../game/state.ts';
import { careerTotals } from '../../game/state.ts';
import { LEAGUE_NAMES } from '../../data/clubs.ts';
import { playerValue } from '../../data/squadGen.ts';
import { potentialBand } from '../../game/career.ts';
import type { Friend } from '../../game/friends.ts';
import { friendBand, friendTrait } from '../../game/friends.ts';
import type { Trait } from '../../data/personalities.ts';
import { traitsFor, renderLine, TONE_COLOR, isFriendTrait } from '../../data/personalities.ts';
import { Icon } from './Icon.tsx';
import { Portal } from './Portal.tsx';
import { UltraCard } from './UltraCard.tsx';
import { formatMoney } from './bits.tsx';

const POS_LABEL: Record<string, string> = {
  GK: 'שוער', CB: 'בלם', LB: 'מגן שמאלי', RB: 'מגן ימני',
  CDM: 'קשר הגנתי', CM: 'קשר', CAM: 'קשר התקפי',
  LW: 'כנף שמאלית', RW: 'כנף ימנית', ST: 'חלוץ',
};

const OUTFIELD_ATTRS: [keyof Player['attrs'], string][] = [
  ['pace', 'מהירות'], ['shooting', 'בעיטה'], ['passing', 'מסירה'],
  ['dribbling', 'כדרור'], ['defending', 'הגנה'], ['physical', 'פיזי'],
];

const GK_ATTRS: [string, string][] = [
  ['diving', 'צלילה'], ['handling', 'תפיסה'], ['reflexes', 'רפלקסים'],
  ['positioning', 'מיקום'], ['kicking', 'בעיטה'],
];

/**
 * The player card. A rating alone never made anyone care about a footballer,
 * so this leads with who he is and backs it with the numbers.
 */
export function PlayerCard({ p, club, season, career, traits, friend, part, onClose }: {
  p: Player;
  club: Club;
  season?: PlayerSeason;
  /** finished seasons, newest last. Empty or omitted for a first year player */
  career?: CareerSeason[];
  /** the squad-assigned traits, falls back to standalone if omitted */
  traits?: Trait[];
  /** one of the two he brought with him, whose ceiling is his own */
  friend?: Friend;
  /** the ways he can be let go this week, only from his own club's squad screen */
  part?: { options: PartOption[]; blocked: string | null; onPart: (kind: PartKind) => void };
  onClose: () => void;
}) {
  // a friend's ceiling is written on his quality, not rolled off his id
  const band = friend && !friend.sold
    ? friendBand(friendTrait(friend.trait), overall(p))
    : potentialBand(p);
  const list = traits ?? traitsFor(p);
  const isGk = p.position === 'GK';

  // escape closes, same as tapping the scrim
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows: [string, number][] = isGk
    ? GK_ATTRS.map(([k, label]) => [label, (p.gk as any)?.[k] ?? 50] as [string, number])
    : OUTFIELD_ATTRS.map(([k, label]) => [label, p.attrs[k]] as [string, number]);

  return (
    <Portal>
    <div className="moment-scrim" onClick={onClose} role="dialog" aria-modal="true" aria-label={`כרטיס שחקן, ${p.name}`}>
      <div className="pcard" onClick={e => e.stopPropagation()}>
        {/* the card is the hero. it leads, and carries OVR, name, position and
            the six stats on its own, so the old text header is gone */}
        <div className="pcard-hero">
          <button onClick={onClose} aria-label="סגור" className="pcard-close">
            <Icon name="chevron" size={16} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <UltraCard player={p} club={club} size="xl" />
          </div>
          {/* the few facts the card does not show, on a compact strip */}
          <div className="row" style={{ gap: 6, justifyContent: 'center', marginTop: 13, flexWrap: 'wrap' }}>
            <span className="chip" style={{ background: 'rgba(233,185,73,.14)', color: 'var(--gold)' }}>
              {POS_LABEL[p.position] ?? p.position}
            </span>
            <span className="chip" style={{ background: 'rgba(255,255,255,.06)', color: 'var(--ink-dim)' }}>
              גיל <span className="num">{p.age}</span>
            </span>
            <span className="chip" style={{ background: 'rgba(255,255,255,.06)', color: 'var(--ink-dim)' }}>
              {formatMoney(playerValue(p))}
            </span>
            {band && (
              <span className="chip" style={{ background: 'rgba(51,194,122,.16)', color: 'var(--win)' }} title="פוטנציאל, הערכת סקאוט">
                פוטנציאל עד <span className="num">{band.lo === band.hi ? band.lo : `${band.lo}-${band.hi}`}</span>
              </span>
            )}
          </div>
        </div>

        <div className="pcard-body">
          {/* who he is, this is the part that makes him yours */}
          {list.length > 0 && (
            <div className="stack" style={{ gap: 9 }}>
              <div className="label-cap">
                {list.some(isFriendTrait) ? 'הוא בא איתך' : 'מה שאומרים עליו בחדר'}
              </div>
              {list.map(t => (
                <div key={t.id} className="tile" style={{
                  padding: '11px 12px',
                  borderColor: `color-mix(in srgb, ${TONE_COLOR[t.tone]} 30%, transparent)`,
                }}>
                  <div className="row" style={{ gap: 8, marginBottom: 5 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: 2, flex: 'none',
                      background: TONE_COLOR[t.tone],
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: TONE_COLOR[t.tone] }}>{t.label}</span>
                  </div>
                  <div style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--ink)' }}>{renderLine(t, p)}</div>
                  {t.tip && (
                    <div className="row" style={{ gap: 6, marginTop: 8 }}>
                      <Icon name="clipboard" size={13} color="var(--ink-faint)" />
                      <span style={{ fontSize: 13, color: 'var(--ink-dim)', fontStyle: 'italic' }}>{t.tip}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* condition right now */}
          <div className="row" style={{ gap: 9 }}>
            <Gauge label="כושר" value={p.fitness}
              color={p.fitness >= 75 ? 'var(--win)' : p.fitness >= 55 ? 'var(--gold)' : 'var(--loss)'} />
            <Gauge label="מורל" value={p.morale}
              color={p.morale >= 65 ? 'var(--win)' : p.morale >= 40 ? 'var(--gold)' : 'var(--loss)'} />
          </div>

          {/* the season so far */}
          <div className="tile" style={{ padding: '11px 13px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="label-cap">העונה</div>
              <div className="row" style={{ gap: 15 }}>
                <SeasonStat label="הופעות" value={season?.apps ?? 0} />
                <SeasonStat label="שערים" value={season?.goals ?? 0} gold={(season?.goals ?? 0) > 0} />
                <SeasonStat label="בישולים" value={season?.assists ?? 0} gold={(season?.assists ?? 0) > 0} />
              </div>
            </div>
          </div>

          {/* what he has actually done, which is how you judge a player */}
          {career && career.length > 0 && <CareerBlock career={career} />}

          {/* the numbers, last, because they were never the point */}
          <div className="stack" style={{ gap: 7 }}>
            <div className="label-cap">יכולות</div>
            {rows.map(([label, v]) => <AttrBar key={label} label={label} value={v} />)}
          </div>

          {part && <PartBlock name={p.name} part={part} />}
        </div>
      </div>
    </div>
    </Portal>
  );
}

function AttrBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(3, Math.min(100, ((value - 30) / 69) * 100));
  const color = value >= 78 ? 'var(--gold-hi)' : value >= 66 ? 'var(--gold)' : value >= 52 ? 'var(--ink-dim)' : '#7a5533';
  return (
    <div className="row" style={{ gap: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-dim)', width: 56, flex: 'none' }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
        <i style={{ display: 'block', height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
      <span className="score-face" style={{ fontSize: 17, color, width: 26, textAlign: 'end' }}>{value}</span>
    </div>
  );
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="tile" style={{ flex: 1, padding: '10px 12px' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-faint)' }}>{label}</span>
        <span className="score-face" style={{ fontSize: 20, color }}>{Math.round(value)}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.07)', marginTop: 7, overflow: 'hidden' }}>
        <i style={{ display: 'block', height: '100%', width: `${Math.max(3, Math.min(100, value))}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

/**
 * The years already behind him. This is the difference between "he has a 71
 * rating" and "he scored fourteen in the second division two years ago", which
 * is the thing that actually tells you whether a player is any good.
 */
function CareerBlock({ career }: { career: CareerSeason[] }) {
  const rows = [...career].reverse().slice(0, 6);   // newest first
  const t = careerTotals(career);
  const head: React.CSSProperties = { fontSize: 10, fontWeight: 800, color: 'var(--ink-faint)', padding: '0 0 6px' };
  const cell: React.CSSProperties = { textAlign: 'center', fontWeight: 700, fontSize: 12.5, padding: '5px 0' };

  return (
    <div className="tile" style={{ padding: '11px 13px' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="label-cap">הקריירה</div>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700 }}>
          <span className="num">{t.apps}</span> משחקים ·
          <span className="num" style={{ color: 'var(--gold)' }}> {t.goals}</span> שערים ·
          <span className="num" style={{ color: 'var(--sky)' }}> {t.assists}</span> בישולים
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...head, textAlign: 'start' }}>עונה</th>
            <th style={{ ...head, textAlign: 'start' }}>ליגה</th>
            <th style={{ ...head, textAlign: 'center', width: 34 }}>מש</th>
            <th style={{ ...head, textAlign: 'center', width: 30 }}>שע</th>
            <th style={{ ...head, textAlign: 'center', width: 30 }}>ביש</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
              <td className="num" style={{ ...cell, textAlign: 'start', color: 'var(--ink-dim)' }}>{s.season}</td>
              <td style={{ ...cell, textAlign: 'start', fontSize: 11.5, color: 'var(--ink-dim)', fontWeight: 600 }}>
                {LEAGUE_NAMES[s.tier] ?? ''}
              </td>
              <td className="num" style={{ ...cell, color: 'var(--ink-dim)' }}>{s.apps}</td>
              <td className="num" style={{ ...cell, color: s.goals > 0 ? 'var(--gold)' : 'var(--ink-faint)' }}>{s.goals}</td>
              <td className="num" style={{ ...cell, color: s.assists > 0 ? 'var(--sky)' : 'var(--ink-faint)' }}>{s.assists}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {career.length > rows.length && (
        <div className="hint" style={{ margin: '7px 0 0', textAlign: 'center' }}>
          מוצגות {rows.length} העונות האחרונות
        </div>
      )}
    </div>
  );
}

function SeasonStat({ label, value, gold }: { label: string; value: number; gold?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="score-face" style={{ fontSize: 22, color: gold ? 'var(--gold-hi)' : 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 700, marginTop: 1 }}>{label}</div>
    </div>
  );
}

/**
 * Letting him go, from his own card. One tap opens the terms, a second one
 * does it, so a thumb sliding down the card never sells a man by accident.
 * When nothing applies this week (window shut, books fine) it says why the
 * door is closed rather than hiding it.
 */
function PartBlock({ name, part }: { name: string; part: NonNullable<Parameters<typeof PlayerCard>[0]['part']> }) {
  const [armed, setArmed] = useState<PartKind | null>(null);
  const { options, blocked, onPart } = part;
  return (
    <div className="tile" style={{ padding: '12px 13px', borderColor: 'rgba(226,72,77,.3)' }}>
      <div className="label-cap" style={{ marginBottom: 6 }}>להיפרד</div>
      {blocked && <div className="sub" style={{ fontSize: 14 }}>{blocked}</div>}
      {!blocked && options.length === 0 && (
        <div className="sub" style={{ fontSize: 14 }}>החלון סגור והקופה מסתדרת. בחלון אפשר להעביר אותו, ובמינוס אפשר להיפרד כידידים.</div>
      )}
      {options.map(o => (
        <div key={o.kind} className="stack" style={{ gap: 8 }}>
          <div className="sub" style={{ fontSize: 14 }}>{o.detail}</div>
          <div className="row" style={{ gap: 12, fontSize: 14, fontWeight: 800 }}>
            <span style={{ color: 'var(--win)' }}>+{formatMoney(o.fee)}</span>
            <span style={{ color: 'var(--ink-faint)' }}>שכר {formatMoney(o.wage)} לשבוע</span>
          </div>
          {armed === o.kind ? (
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-sm" style={{ flex: 1, background: 'linear-gradient(180deg,#e2484d,#b8323a)', color: '#fff' }} onClick={() => onPart(o.kind)}>
                כן, {surnameOf(name)} הולך
              </button>
              <button className="btn dark btn-sm" style={{ flex: 1 }} onClick={() => setArmed(null)}>לא, נשאר</button>
            </div>
          ) : (
            <button className="btn dark btn-sm" onClick={() => setArmed(o.kind)}>{o.label}</button>
          )}
        </div>
      ))}
    </div>
  );
}
