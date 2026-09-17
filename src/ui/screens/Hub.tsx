import { useEffect, useRef, useState } from 'react';
import * as G from '../../game/state.ts';
import { LEAGUE_NAMES, isDerby } from '../../data/clubs.ts';
import type { Club } from '../../data/clubs.ts';
import { Meters } from '../components/bits.tsx';
import { Crest } from '../components/Crest.tsx';
import { Kit } from '../components/Kit.tsx';
import { homeKit } from '../../data/kits.ts';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import { MiniTable } from './Table.tsx';
import { FanNote } from '../components/FanNote.tsx';
import { Feed } from '../components/Feed.tsx';
import { Gem } from '../components/Gem.tsx';
import { PACKS } from '../../game/packs.ts';

/**
 * The home screen.
 *
 * It used to be nine full width tiles stacked down two and a half phone
 * screens, every one of them an icon, a bold title, a grey sentence explaining
 * itself, and a chevron. Everything weighed the same, so nothing read as
 * important, the explaining sentences were the "too much text" you felt, and
 * the one button that starts the round sat at the very bottom, past everything.
 *
 * Now it answers three questions in order, and only those:
 *
 *   what am I playing for   the goal strip, a ladder and one sentence
 *   who is next             the match hero, with the button to go inside it
 *   what else is there      one grid of eight, a word each, a dot when it needs you
 *
 * Everything a room used to say about itself in a sentence is now either a
 * badge or gone. The story (the fans, the timeline, the table) sits underneath
 * for whoever wants it, and the button follows you down the page so the next
 * round is never more than one tap away.
 */

export function Hub({ gs, onStart, onSquad, onTransfers, onChronicle, onCaptain, onAssistant, onInbox, onStadium, onPacks, onCoach, onTable, onYouth }: {
  gs: G.GameState; onStart: () => void; onSquad: () => void; onTransfers: () => void;
  onChronicle: () => void; onCaptain: () => void; onAssistant: () => void; onInbox: () => void;
  onStadium: () => void; onPacks: () => void; onCoach: () => void; onTable: () => void; onYouth: () => void;
}) {
  const c = G.club(gs);
  const fx = G.playerFixture(gs);
  const rivalId = fx ? (fx.homeId === gs.clubId ? fx.awayId : fx.homeId) : null;
  const rival = gs.league.clubs.find(x => x.id === rivalId);
  const iAmHome = fx?.homeId === gs.clubId;
  const derby = fx ? isDerby(fx.homeId, fx.awayId) : false;
  const goal = G.seasonGoal(gs);
  const win = G.transferWindow(gs);
  const gate = G.stadiumGate(gs);
  const cheapest = Math.min(...PACKS.map(p => p.cost));
  const books = G.debt(gs);
  const hero = useRef<HTMLDivElement>(null);

  return (
    <>
      <Meters {...gs.meters} gems={gs.gems} />
      <div className="screen pad stack hub-pad" style={{ gap: 14 }}>
        {/* who you are, one line, no biography */}
        <div className="row" style={{ marginTop: 2, gap: 11 }}>
          <Crest club={c} size={44} />
          {/* crest and shirt together, which is how a club is recognised */}
          <Kit kit={homeKit(c)} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, lineHeight: 1.15 }}>{c.name}</div>
            <div style={{ fontSize: 14, color: 'var(--ink-faint)', fontWeight: 600, marginTop: 3 }}>
              {LEAGUE_NAMES[c.tier]} · מחזור <span className="num">{gs.week}/{gs.league.rounds}</span>
            </div>
          </div>
          <Form form={gs.form} />
        </div>

        <GoalStrip gs={gs} goal={goal} onPress={onTable} />

        <div ref={hero}>
          <MatchHero club={c} rival={rival} iAmHome={!!iAmHome} derby={derby} gs={gs} onStart={onStart} />
        </div>

        {books.level !== 'clear' && <DebtStrip d={books} onClick={onTransfers} />}

        {gs.inbox.length > 0 && <InboxStrip count={gs.inbox.length} onClick={onInbox} />}

        {/* every room in the club, a word each */}
        <div className="hub-grid stagger">
          <Cell i={0} icon="shirt" label="הסגל" onClick={onSquad} count={`${G.squadSize(gs)} · ${gs.tactic.formation}`} />
          <Cell i={1} icon="handshake" label="העברות" onClick={onTransfers}
            dot={win.open ? 'var(--win)' : undefined} />
          <Cell i={2} label="חבילות" onClick={onPacks} glyph={<Gem size={21} />}
            dot={gs.gems >= cheapest || G.adsLeft(gs) > 0 ? 'var(--gold)' : undefined} />
          <Cell i={3} icon="flag" label="אצטדיון" onClick={onStadium}
            dot={gate && !gate.meets && !gs.stadium.project ? 'var(--loss)' : gs.stadium.project ? 'var(--gold)' : undefined} />
          <Cell i={4} icon="clipboard" label="המאמן" onClick={onCoach}
            dot={G.courseRequired(gs) ? 'var(--loss)' : undefined} />
          <Cell i={5} icon="star" label="קפטן" onClick={onCaptain}
            dot={G.captain(gs) ? undefined : 'var(--gold)'} />
          <Cell i={6} icon="mic" label="עוזר" onClick={onAssistant}
            dot={G.assistantActive(gs) ? undefined : 'var(--gold)'} />
          <Cell i={7} icon="trophy" label="כרוניקה" onClick={onChronicle}
            badge={G.unreadChronicle(gs) || undefined} />
          <Cell i={8} icon="star" label="נוער" onClick={onYouth}
            dot={gs.youth.players.some(p => p.age >= 18) ? 'var(--gold)' : undefined} />
        </div>

        <FanNote msg={G.fanNote(gs, 'pre')} />

        <Feed posts={G.clubFeed(gs)} />

        {/* the table opens the full one, so it does not need a row of its own */}
        <button className="hub-table" onClick={onTable} aria-label="הליגה המלאה">
          <div className="row" style={{ justifyContent: 'space-between', padding: '0 2px 8px' }}>
            <span className="label-cap">הטבלה</span>
            <span className="row" style={{ gap: 4, fontSize: 12.5, color: 'var(--ink-faint)', fontWeight: 700 }}>
              הליגה המלאה <Icon name="chevron" size={14} />
            </span>
          </div>
          <MiniTable gs={gs} highlight={gs.clubId} rows={5} />
        </button>
      </div>

      {!G.weekBlockedReason(gs) && <StickyStart hero={hero} onStart={onStart} rival={rival?.short} />}
    </>
  );
}

/* ---------------------------------------------------------------- the goal */

/**
 * What the season is for, as a ladder. The promotion places are gold, the drop
 * is red, and your rung is the one that is lit. Reading a position out of a
 * table takes a beat; seeing where you stand on a ladder takes none.
 */
/**
 * The strip is a door to the table, and it used to look like a label: nobody
 * pressed it. Now it shows the three rows that matter (the club above, you,
 * the club below, with points) and says where it leads, so it reads as a thing
 * with more inside rather than a sentence.
 */
function GoalStrip({ gs, goal, onPress }: { gs: G.GameState; goal: G.SeasonGoal; onPress: () => void }) {
  const tone = goal.zone === 'promo' ? 'var(--gold)' : goal.zone === 'drop' ? 'var(--loss)' : 'var(--ink-dim)';
  const table = G.sortedTable(gs.league);
  const i = Math.max(0, table.findIndex(s => s.clubId === gs.clubId));
  const rows = [table[i - 1], table[i], table[i + 1]].filter(Boolean).map(s => ({
    pos: table.indexOf(s) + 1,
    name: gs.league.clubs.find(c => c.id === s.clubId)?.short ?? '',
    pts: s.pts,
    me: s.clubId === gs.clubId,
  }));
  return (
    <button className="goal" onClick={onPress} style={{ '--tone': tone } as React.CSSProperties} aria-label="המטרה, לחץ לטבלה המלאה">
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <span className="label-cap">המטרה · {goal.target}</span>
        <span className="goal-pos">
          {/* the fraction is isolated LTR, otherwise bidi reorders it to 8/1 */}
          מקום <span className="num goal-frac"><b>{goal.pos}</b>/{goal.teams}</span>
        </span>
      </div>
      <div className="goal-ladder" aria-hidden="true">
        {Array.from({ length: goal.teams }, (_, i) => {
          const p = i + 1;
          // the bottom division has nowhere to fall to, so nothing is painted red
          const kind = goal.up && p <= 2 ? 'up' : goal.down && p === goal.teams ? 'down' : 'mid';
          return <span key={p} data-k={kind} data-me={p === goal.pos ? '1' : '0'} />;
        })}
      </div>
      <div className="goal-line">{goal.line}</div>
      {goal.played > 0 && (
        <div className="goal-rows">
          {rows.map(r => (
            <div key={r.pos} className="goal-row" data-me={r.me ? '1' : '0'}>
              <span className="num goal-row-pos">{r.pos}</span>
              <span className="goal-row-name">{r.name}</span>
              <span className="num goal-row-pts">{r.pts} נק׳</span>
            </div>
          ))}
        </div>
      )}
      <div className="goal-more">
        <span>הטבלה המלאה, הפורם והשערים</span>
        <Icon name="chevron" size={15} />
      </div>
    </button>
  );
}

/** The last five, newest on the outside edge. Five dots, no legend needed. */
function Form({ form }: { form: ('W' | 'D' | 'L')[] }) {
  if (!form.length) return null;
  const last = form.slice(-5);
  return (
    <div className="form-dots" aria-label={`חמשת המשחקים האחרונים: ${last.join(' ')}`}>
      {last.map((r, i) => <span key={i} data-r={r} />)}
    </div>
  );
}

/* --------------------------------------------------------------- the match */

/**
 * The one thing the manager came here to do. It gets the space, the crests and
 * the button, and nothing above it competes for the eye.
 */
function MatchHero({ club, rival, iAmHome, derby, gs, onStart }: {
  club: Club; rival: Club | undefined; iAmHome: boolean; derby: boolean;
  gs: G.GameState; onStart: () => void;
}) {
  if (!rival) {
    return (
      <div className="tile" style={{ textAlign: 'center', padding: 22 }}>
        <div className="sub">אין משחק השבוע</div>
      </div>
    );
  }
  const table = G.sortedTable(gs.league);
  const posOf = (id: string) => table.findIndex(s => s.clubId === id) + 1;
  // a banned man in the eleven, or a sheet short of sixteen names, and the
  // round does not start. The reason sits where the button was
  const blocked = G.weekBlockedReason(gs);
  return (
    <div className="match-hero">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <span className="label-cap">המשחק הבא</span>
        {derby
          ? <span className="chip chip-derby">דרבי</span>
          : <span className="chip chip-quiet">{iAmHome ? 'בית' : 'חוץ'}</span>}
      </div>

      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <Side club={club} pos={posOf(club.id)} />
        <span className="match-vs">VS</span>
        <Side club={rival} pos={posOf(rival.id)} />
      </div>

      {blocked ? (
        <div style={{ marginTop: 14 }}>
          <div className="chip" style={{ background: 'rgba(226,72,77,.16)', color: 'var(--loss)', display: 'inline-flex', marginBottom: 8 }}>הסגל לא בסדר</div>
          <p className="hint" style={{ margin: 0, color: 'var(--ink)' }}>{blocked}</p>
          <button className="btn dark" style={{ marginTop: 10, opacity: .6 }} disabled>
            <Icon name="whistle" size={18} /> יוצאים למחזור
          </button>
        </div>
      ) : (
        <button className="btn" style={{ marginTop: 16 }} onClick={onStart}>
          <Icon name="whistle" size={18} /> יוצאים למחזור
        </button>
      )}
    </div>
  );
}

function Side({ club, pos }: { club: Club; pos: number }) {
  return (
    <div className="stack" style={{ alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
      <Crest club={club} size={52} />
      <b style={{ fontSize: 14.5, textAlign: 'center', lineHeight: 1.2 }}>{club.short}</b>
      <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 700 }}>מקום {pos}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- the grid */

function Cell({ i, icon, glyph, label, onClick, dot, badge, count }: {
  i: number; icon?: IconName; glyph?: React.ReactNode; label: string;
  onClick: () => void; dot?: string; badge?: number; count?: number | string;
}) {
  return (
    <button className="hub-cell" style={{ ...({ '--i': i } as React.CSSProperties) }} onClick={onClick}>
      <span className="hub-cell-icon">
        {glyph ?? <Icon name={icon!} size={21} color="var(--gold)" />}
        {badge ? <span className="hub-badge">{badge}</span>
          : dot ? <span className="hub-dot" style={{ background: dot }} /> : null}
      </span>
      <span className="hub-cell-label">{label}</span>
      {count !== undefined && <span className="hub-cell-count num">{count}</span>}
    </button>
  );
}

/**
 * The books, when they are in the red. It sits directly under the match, above
 * everything else, and it says the number out loud, because a manager should
 * never be sacked by a figure he had not seen. Tapping it goes to the market,
 * which is the only way out.
 */
function DebtStrip({ d, onClick }: { d: G.DebtState; onClick: () => void }) {
  const hot = d.level === 'final';
  const tone = hot ? 'var(--loss)' : d.level === 'warned' ? 'var(--gold)' : 'var(--ink-dim)';
  return (
    <button className="debt-strip" style={{ '--tone': tone } as React.CSSProperties} onClick={onClick}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <span className="label-cap">הבעלים והספרים</span>
        <span className="debt-num num">−₪{Math.round(d.debt).toLocaleString('en-US')}</span>
      </div>
      <div className="debt-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, d.ratio * 100)}%` }} />
      </div>
      <div className="debt-line">{G.debtLine(d)}</div>
    </button>
  );
}

/** The only thing that still nags with words, because it is the only one that blocks. */
function InboxStrip({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button className="inbox-strip" onClick={onClick}>
      <Icon name="mic" size={19} color="var(--loss)" />
      <span style={{ flex: 1, textAlign: 'start', fontWeight: 800, fontSize: 15 }}>
        {count === 1 ? 'הודעה מחכה לתשובה שלך' : `${count} הודעות מחכות לתשובה`}
      </span>
      <Icon name="chevron" size={16} color="var(--loss)" />
    </button>
  );
}

/* ------------------------------------------------------------ the follower */

/**
 * Once the hero scrolls away the button comes back along the bottom, so
 * whatever you wandered off to read, starting the round stays one tap away
 * instead of a scroll back to the top.
 */
function StickyStart({ hero, onStart, rival }: {
  hero: React.RefObject<HTMLDivElement | null>; onStart: () => void; rival?: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = hero.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    // Observe the card itself, never an empty sentinel: a zero area target is
    // unreliable across engines. If the observer never reports, show stays
    // false and the bar simply never appears, which costs nothing, since the
    // same button is already sitting inside the match card up the page.
    const io = new IntersectionObserver(([e]) => {
      setShow(!e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [hero]);

  return (
    <div className="hub-sticky" data-on={show ? '1' : '0'} aria-hidden={!show}>
      <button className="btn" onClick={onStart} tabIndex={show ? 0 : -1}>
        <Icon name="whistle" size={18} /> {rival ? `יוצאים מול ${rival}` : 'יוצאים למחזור'}
      </button>
    </div>
  );
}
