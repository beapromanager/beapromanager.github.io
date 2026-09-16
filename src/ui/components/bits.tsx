import type { Club } from '../../data/clubs.ts';
import { Crest } from './Crest.tsx';
import { Icon } from './Icon.tsx';
import { installKind } from '../install.ts';
import { Gem } from './Gem.tsx';

/** Every club mark in the game is the vector crest. */
export function Badge({ club, size = 44 }: { club: Club; size?: number }) {
  return <Crest club={club} size={size} />;
}

/**
 * Bringing a friend is reachable from every screen, so the button lives in the
 * bar that is always there. Fourteen screens render Meters, so rather than
 * drill a prop through all of them the App registers one handler here.
 */
let inviteHandler: (() => void) | null = null;
export function setInviteHandler(fn: (() => void) | null): void { inviteHandler = fn; }

/** Same arrangement for the install offer, which the App owns. */
let installHandler: (() => void) | null = null;
export function setInstallHandler(fn: (() => void) | null): void { installHandler = fn; }

export function Meters({ money, morale, prestige, gems }: {
  money: number; morale: number; prestige: number;
  /** premium currency, shown as a compact pill when provided */
  gems?: number;
}) {
  // "already installed" is the only reason to hide this now. It used to also
  // hide on 'none', which was every browser Chrome's install API does not
  // reach — Firefox, Samsung Internet, Opera, Brave — and those are exactly the
  // people who most needed telling where the option lives in their own menu.
  // Not keyed off the handler: that is a module variable the App sets in an
  // effect after the first paint, so the very first hub after every load drew
  // the bar without the button and it only turned up on the next tap. The
  // handler is there long before anyone can press it.
  const offerInstall = installKind() !== 'installed';

  return (
    <div className="meters">
      <Meter icon="coins" label="תקציב" value={formatMoney(money)} pct={100} color="var(--gold)" />
      <Meter icon="star" label="מעמד" value={String(prestige)} pct={prestige} color="var(--gold)" />
      <Meter
        icon="flame" label="מורל" value={String(morale)} pct={morale}
        color={morale >= 55 ? 'var(--win)' : morale >= 35 ? 'var(--gold)' : 'var(--loss)'}
      />
      {gems !== undefined && <GemPill n={gems} />}
      {/* read at render rather than passed in: fourteen screens draw this bar
          and none of them should have to know about installing. Chrome fires
          its event a moment after load, and the bar redraws often enough to
          pick it up. Absent on desktop and once the game is already installed. */}
      {gems !== undefined && offerInstall && (
        <button className="meters-install" onClick={() => installHandler?.()}
          aria-label="שים את המשחק על מסך הבית" title="הוסף למסך הבית">
          <Icon name="download" size={16} />
        </button>
      )}
      {/* the same condition as the gems: a career is running. Keying it off the
          handler instead would not work, because a module variable changing
          does not tell React to draw the bar again. */}
      {gems !== undefined && (
        <button className="meters-share" onClick={() => inviteHandler?.()} aria-label="תביא חבר, קבל יהלומים" title="תביא חבר">
          <Icon name="crowd" size={17} />
        </button>
      )}
    </div>
  );
}

/** The gem balance, always on screen so the premium currency reads as real. */
function GemPill({ n }: { n: number }) {
  return (
    <div className="gem-pill" title="יהלומים">
      <Gem size={19} />
      <span className="v num">{n}</span>
    </div>
  );
}

function Meter({ icon, label, value, pct, color }: {
  icon: 'coins' | 'star' | 'flame'; label: string; value: string; pct: number; color: string;
}) {
  return (
    <div className="meter">
      <div className="top">
        <span className="k">{label}</span>
        {/* wrapped so a narrow phone can drop it: the icon sets its own display */}
        <span className="meter-ic"><Icon name={icon} size={13} color={color} style={{ opacity: .85 }} /></span>
      </div>
      {/* the length lets a long purse step its type down a size, see .meter .v */}
      <div className="v num" data-len={Math.min(7, value.length)}>{value}</div>
      <div className="bar"><i style={{ width: `${Math.max(4, Math.min(100, pct))}%`, background: color }} /></div>
    </div>
  );
}

/**
 * A scoreline that stays glued to its teams under RTL.
 * A bare "0:1" string is a single LTR number run, so its digits do not follow
 * the right-to-left flow of the crests around it. Here home and away are
 * separate elements inside an RTL inline-flex, so home sits on the right (next
 * to the home crest, which is the first child of an RTL row) and away on the left.
 */
export function ScorePair({ h, a, size = 20, color }: { h: number; a: number; size?: number; color?: string }) {
  return (
    <span style={{
      display: 'inline-flex', direction: 'rtl', alignItems: 'center',
      gap: Math.round(size * 0.16),
      fontFamily: 'var(--font-display)', fontWeight: 700,
      fontSize: Math.round(size * 1.18), lineHeight: 1, color,
      letterSpacing: '-.01em',
    }}>
      <span>{h}</span>
      <span style={{ opacity: .4, fontSize: Math.round(size * 0.95) }}>:</span>
      <span>{a}</span>
    </span>
  );
}

/** Small labelled stat block used across screens. */
export function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      flex: 1, background: 'var(--bg)', border: '1px solid var(--line)',
      borderRadius: 'var(--plate-sm)', padding: '10px 6px', textAlign: 'center',
    }}>
      <div className="score-face" style={{ fontSize: 21, color: color ?? 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-dim)', fontWeight: 700, marginTop: 4 }}>{label}</div>
    </div>
  );
}

/** Money to the shekel below ten thousand, so a raise of a few hundred a round can be seen. */
export function formatMoneyExact(n: number): string {
  const v = Math.abs(n);
  if (v >= 10_000) return formatMoney(n);
  return `${n < 0 ? '-' : ''}₪${v.toLocaleString('en-US')}`;
}

export function formatMoney(n: number): string {
  // the sign belongs in front of the currency, not between it and the digits:
  // a purse in the red read as "₪-95K", which is not how anyone writes money
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${sign}₪${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${sign}₪${Math.round(v / 1000)}K`;
  return `${sign}₪${v}`;
}
