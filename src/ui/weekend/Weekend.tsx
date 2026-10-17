/**
 * The weekend league's screens (Itzik, 17.10, WEEKEND.md): the ticket on the
 * title screen, the three doors (open a league, come in with a code, the open
 * league), the league itself, and the prize going home to the career. The
 * match is in WeekendMatch.tsx.
 *
 * Everything here talks to the server through game/weekend.ts and keeps only
 * a nick and a league id on the phone. The look is the ticket world in
 * weekend.css; the career's own styles never apply inside .wk.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SaveSummary } from '../../game/save.ts';
import { WeekendApi, ApiError, local, setLocal, serverNow, countdown, slotLabel, dateLabel, POSITION_WORDS, type LeagueView, type LiveView, type PrizeToken } from '../../game/weekend.ts';
import { cycleOf, cyclePhase, SLOT_GRID, DAY_NAME, slotsNeeded, slotsProblem, MIN_MEMBERS, MAX_MEMBERS, PACK_EVERY, type SlotDay } from '../../game/weekendCore.ts';
import { fillFormation, formation, FORMATIONS, type FormationId } from '../../data/formations.ts';
import { overall } from '../../engine/matchEngine.ts';
import type { Player } from '../../engine/matchEngine.ts';
import { asset } from '../asset.ts';
import { Icon } from '../components/Icon.tsx';
import { WeekendMatch } from './WeekendMatch.tsx';
import './weekend.css';

/* ------------------------------------------------------------ the ticket at the door */

/** the card on the title screen, all week: what is open now, and a countdown to what is next */
export function WeekendEntry({ onOpen, hasCareer }: { onOpen: () => void; hasCareer: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(t); }, []);
  const now = serverNow();
  const c = cycleOf(now);
  const phase = cyclePhase(c, now);
  const mine = local().leagueId;
  const line = phase === 'open' ? { k: 'ההרשמה פתוחה', c: countdown(c.locks, now), m: 'עד חמישי 17:00' }
    : phase === 'locked' ? { k: 'הרשימות נסגרו', c: countdown(c.kickoff, now), m: 'חמישי 20:00, המחזור הראשון' }
    : { k: 'משחקים עכשיו', c: countdown(c.final, now), m: 'עד הגמר, ראשון 20:00' };
  return (
    <button className="wk-entry" onClick={onOpen} aria-label="ליגת השכונה">
      <div className="stub"><span>סופשבוע · {dateLabel(c.kickoff)}</span></div>
      <div className="stamp">{mine ? 'נכנס' : 'סופשבוע'}</div>
      <div className="k">{line.k}</div>
      <div className="h">ליגת השכונה</div>
      <div className="wk-row" style={{ gap: 10, alignItems: 'baseline' }}>
        <span className="c" dir="auto">{line.c}</span>
        <span className="m">{line.m}</span>
      </div>
      {!hasCareer && <div className="m" style={{ marginTop: 4 }}>קודם קריירה, אחר כך הליגה</div>}
    </button>
  );
}

/* ----------------------------------------------------------------- the root */

type Page = 'home' | 'create' | 'join' | 'open' | 'lobby' | 'match';

export function WeekendRoot({ saved, onBack, onPrize }: {
  saved: SaveSummary | null;
  onBack: () => void;
  /** the prize into the career; returns the words to show, or null when there is no career to put it in */
  onPrize: (token: PrizeToken) => string | null;
}) {
  const [page, setPage] = useState<Page>('home');
  const [leagueId, setLeagueId] = useState<string | null>(local().leagueId);
  const [league, setLeague] = useState<LeagueView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  // where this device stands this weekend
  useEffect(() => {
    let on = true;
    WeekendApi.mine().then(m => {
      if (!on) return;
      if (m.league) { setLeagueId(m.league); setLocal({ leagueId: m.league }); setPage('lobby'); }
      else { setLeagueId(null); setLocal({ leagueId: null }); }
    }).catch(e => { if (on) setErr(e instanceof ApiError ? e.message : 'השרת לא עונה'); }).finally(() => { if (on) setBooting(false); });
    return () => { on = false; };
  }, []);

  const enter = (id: string) => { setLeagueId(id); setLocal({ leagueId: id }); setPage('lobby'); };

  if (page === 'match' && league?.mine?.matchId) {
    return <WeekendMatch leagueId={league.id} matchId={league.mine.matchId} side={league.mine.side} opponent={league.mine.opponent} me={league.me?.nick ?? ''} onDone={() => setPage('lobby')} />;
  }
  if (page === 'lobby' && leagueId) {
    return <Lobby id={leagueId} league={league} setLeague={setLeague} onMatch={() => setPage('match')} onLeave={onBack} onPrize={onPrize} hasCareer={!!saved} />;
  }
  return (
    <div className="wk">
      <div className="wk-paper wk-stack">
        <div className="wk-row" style={{ justifyContent: 'space-between' }}>
          <button className="wk-back" onClick={page === 'home' ? onBack : () => setPage('home')}><Icon name="chevron" size={16} />{page === 'home' ? 'לכניסה' : 'חזרה'}</button>
          <span className="wk-pill">סופשבוע</span>
        </div>
        {page === 'home' && <Home saved={saved} booting={booting} err={err} go={setPage} />}
        {page === 'create' && <CreateLeague onMade={enter} />}
        {page === 'join' && <JoinLeague onJoined={enter} />}
        {page === 'open' && <OpenJoin onJoined={enter} />}
      </div>
    </div>
  );
}

function Home({ saved, booting, err, go }: { saved: SaveSummary | null; booting: boolean; err: string | null; go: (p: Page) => void }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(t); }, []);
  const now = serverNow();
  const c = cycleOf(now);
  const phase = cyclePhase(c, now);
  const open = phase === 'open';
  return (
    <>
      <div className="wk-frame"><img src={asset('/weekend/entrance.webp')} alt="" /></div>
      <div style={{ height: 150 }} />
      <div className="wk-kick">חמישי 20:00 עד ראשון 20:00</div>
      <h1>ליגת השכונה</h1>
      <p className="wk-muted">סגל חדש, שווה לכולם. משחק אחד מול כל חבר, בשעות שקבעתם. אין תיקו. המנצח לוקח הביתה לקריירה.</p>
      <div className="wk-card soft wk-row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="wk-muted">{open ? 'ההרשמה נסגרת בעוד' : phase === 'locked' ? 'המחזור הראשון בעוד' : 'הגמר בעוד'}</div>
          <div className="wk-count num" style={{ fontSize: 34 }}>{countdown(open ? c.locks : phase === 'locked' ? c.kickoff : c.final, now)}</div>
        </div>
        <span className="wk-pill red">{dateLabel(c.kickoff)}</span>
      </div>
      {err && <p className="wk-err">{err}</p>}
      {!saved ? (
        <div className="wk-card"><b>קודם קריירה.</b> <span className="wk-muted">הליגה מחכה למי שיש לו קבוצה בבית. תפתח קריירה, ותחזור.</span></div>
      ) : !open ? (
        <div className="wk-card"><b>ההרשמה סגורה.</b> <span className="wk-muted">ליגות נפתחות מראשון 20:00 עד חמישי 17:00. אם אתה כבר בליגה, היא תיפתח כאן לבד.</span></div>
      ) : (
        <div className="wk-stack">
          <button className="wk-btn red" disabled={booting} onClick={() => go('create')}>פותחים ליגה עם החבר׳ה</button>
          <button className="wk-btn" disabled={booting} onClick={() => go('join')}>נכנסים עם קוד</button>
          <button className="wk-btn ghost" disabled={booting} onClick={() => go('open')}>הליגה הפתוחה, למי שבא לבד</button>
        </div>
      )}
      <p className="wk-muted" style={{ fontSize: 12 }}>בליגה נשמרים בשרת הכינוי שבחרת, הסגל שהמשחק הגריל לך והתוצאות, ונמחקים שבוע אחרי הגמר. לא טלפון, לא מיקום. מייל רק אם סימנת.</p>
    </>
  );
}

/* ------------------------------------------------------------- the three doors */

function MailOpt({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="wk-check">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      <span>רוצה לקבל עדכונים על המשחק במייל. לא חובה, אפשר להסיר בכל רגע.</span>
    </label>
  );
}

function useSubmit<T>(fn: () => Promise<T>, after: (r: T) => void) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setErr(null);
    try { after(await fn()); } catch (e) { setErr(e instanceof ApiError ? e.message : 'השרת לא עונה. נסה שוב'); } finally { setBusy(false); }
  };
  return { busy, err, run };
}

function CreateLeague({ onMade }: { onMade: (id: string) => void }) {
  const [name, setName] = useState('');
  const [nick, setNick] = useState(local().nick);
  const [size, setSize] = useState(8);
  const [slots, setSlots] = useState<string[]>([]);
  const [mail, setMail] = useState(false);
  const [email, setEmail] = useState('');
  const need = slotsNeeded(size);
  const problem = slotsProblem(size, slots);
  const toggle = (k: string) => setSlots(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
  const { busy, err, run } = useSubmit(
    () => WeekendApi.create({ nick, name, slots, email: mail && email ? email : undefined }),
    r => { setLocal({ nick }); onMade(r.id); },
  );
  const days: SlotDay[] = ['fri', 'sat', 'sun'];
  return (
    <div className="wk-stack wk-in">
      <div className="wk-kick">ליגת החבר׳ה</div>
      <h1>פותחים ליגה</h1>
      <div>
        <label className="wk-label" htmlFor="wk-name">שם הליגה</label>
        <input id="wk-name" className="wk-input" value={name} onChange={e => setName(e.target.value)} maxLength={24} placeholder="ליגת בניין 7" />
      </div>
      <div>
        <label className="wk-label" htmlFor="wk-nick">הכינוי שלך בליגה</label>
        <input id="wk-nick" className="wk-input" value={nick} onChange={e => setNick(e.target.value)} maxLength={12} placeholder="איציק" />
      </div>
      <div>
        <label className="wk-label">כמה חברים יהיו בליגה (כולל אותך)</label>
        <div className="wk-row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: MAX_MEMBERS - MIN_MEMBERS + 1 }, (_, i) => MIN_MEMBERS + i).map(n => (
            <button key={n} className={`wk-btn sm ${size === n ? '' : 'ghost'}`} style={{ minWidth: 44 }} onClick={() => setSize(n)} aria-pressed={size === n}><span className="num">{n}</span></button>
          ))}
        </div>
        <p className="wk-muted" style={{ marginTop: 6 }}>חמישי 20:00 וראשון 20:00 קבועים לכולם. עם <span className="num">{size}</span> חברים בוחרים עוד <span className="num">{need}</span> משבצות. כל משבצת היא מחזור שכולם משחקים באותה שעה.</p>
      </div>
      {days.map(day => (
        <div key={day}>
          <div className="wk-sep">{DAY_NAME[day]}</div>
          <div className="wk-list">
            {SLOT_GRID.filter(s => s.day === day).map(s => (
              <button key={s.key} className="wk-slot pick" aria-pressed={slots.includes(s.key)} onClick={() => toggle(s.key)}>
                <span className="d">{DAY_NAME[s.day]}</span><span className="t num">{String(s.hh).padStart(2, '0')}:00</span>
                <span className="s">{slots.includes(s.key) ? 'נבחר' : ''}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="wk-card soft">
        <b>{problem ?? 'הלוח מלא. אפשר לפתוח.'}</b>
        <div className="wk-muted">אם יגיעו פחות ממה שתכננת, הלוח מתכווץ לבד מהסוף. פחות משישה בחמישי 17:00, הליגה לא יוצאת לדרך.</div>
      </div>
      <MailOpt value={mail} onChange={setMail} />
      {mail && <input className="wk-input" type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="המייל שלך" />}
      {err && <p className="wk-err">{err}</p>}
      <button className="wk-btn red" disabled={busy || !!problem || name.trim().length < 2 || nick.trim().length < 2} onClick={run}>{busy ? 'פותח…' : 'לפתוח את הליגה'}</button>
    </div>
  );
}

function JoinLeague({ onJoined }: { onJoined: (id: string) => void }) {
  const [code, setCode] = useState('');
  const [nick, setNick] = useState(local().nick);
  const [mail, setMail] = useState(false);
  const [email, setEmail] = useState('');
  const { busy, err, run } = useSubmit(
    () => WeekendApi.join({ nick, code: code.trim().toUpperCase(), email: mail && email ? email : undefined }),
    r => { setLocal({ nick }); onJoined(r.id); },
  );
  return (
    <div className="wk-stack wk-in">
      <div className="wk-kick">קיבלת קוד בוואטסאפ</div>
      <h1>נכנסים לליגה</h1>
      <div>
        <label className="wk-label" htmlFor="wk-code">הקוד</label>
        <input id="wk-code" className="wk-input code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6} autoCapitalize="characters" autoComplete="off" placeholder="KX7R2M" />
      </div>
      <div>
        <label className="wk-label" htmlFor="wk-nick2">הכינוי שלך בליגה</label>
        <input id="wk-nick2" className="wk-input" value={nick} onChange={e => setNick(e.target.value)} maxLength={12} placeholder="דודו" />
      </div>
      <MailOpt value={mail} onChange={setMail} />
      {mail && <input className="wk-input" type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="המייל שלך" />}
      {err && <p className="wk-err">{err}</p>}
      <button className="wk-btn red" disabled={busy || code.trim().length !== 6 || nick.trim().length < 2} onClick={run}>{busy ? 'נכנס…' : 'להיכנס'}</button>
    </div>
  );
}

function OpenJoin({ onJoined }: { onJoined: (id: string) => void }) {
  const [nick, setNick] = useState(local().nick);
  const [mail, setMail] = useState(false);
  const [email, setEmail] = useState('');
  const { busy, err, run } = useSubmit(
    () => WeekendApi.open({ nick, email: mail && email ? email : undefined }),
    r => { setLocal({ nick }); onJoined(r.id); },
  );
  return (
    <div className="wk-stack wk-in">
      <div className="wk-kick">הליגה הפתוחה</div>
      <h1>באים לבד</h1>
      <p className="wk-muted">שישה שלא מכירים, המשחק מנהל. הלוח קבוע: חמישי 20:00, שישי 12:00 ו-14:00, שבת 20:00, והגמר ראשון 20:00. כשנכנסים שישה, הליגה נסגרת.</p>
      <div>
        <label className="wk-label" htmlFor="wk-nick3">הכינוי שלך בליגה</label>
        <input id="wk-nick3" className="wk-input" value={nick} onChange={e => setNick(e.target.value)} maxLength={12} placeholder="הכינוי" />
      </div>
      <MailOpt value={mail} onChange={setMail} />
      {mail && <input className="wk-input" type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="המייל שלך" />}
      {err && <p className="wk-err">{err}</p>}
      <button className="wk-btn red" disabled={busy || nick.trim().length < 2} onClick={run}>{busy ? 'נכנס…' : 'לליגה הפתוחה'}</button>
    </div>
  );
}

/* ------------------------------------------------------------------ the league */

function Lobby({ id, league, setLeague, onMatch, onLeave, onPrize, hasCareer }: {
  id: string; league: LeagueView | null; setLeague: (l: LeagueView | null) => void;
  onMatch: () => void; onLeave: () => void; onPrize: (t: PrizeToken) => string | null; hasCareer: boolean;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState<LiveView | null>(null);
  const [, tick] = useState(0);
  const [tab, setTab] = useState<'league' | 'squad' | 'table'>('league');
  const [prizeWords, setPrizeWords] = useState<string | null>(null);
  const [packMan, setPackMan] = useState<Player | null>(null);

  const refresh = async () => {
    try { setLeague(await WeekendApi.view(id)); setErr(null); }
    catch (e) { if (e instanceof ApiError && (e.status === 403 || e.status === 404 || e.status === 410)) { setLocal({ leagueId: null }); onLeave(); } else setErr(e instanceof ApiError ? e.message : 'השרת לא עונה'); }
  };
  useEffect(() => { void refresh(); const t = setInterval(refresh, 6_000); const k = setInterval(() => tick(n => n + 1), 1000); return () => { clearInterval(t); clearInterval(k); }; }, [id]);
  const inRound = !!league?.current && serverNow() >= league.current.at;
  useEffect(() => {
    if (!inRound) { setLive(null); return; }
    const go = () => WeekendApi.live(id).then(setLive).catch(() => {});
    go(); const t = setInterval(go, 2_500); return () => clearInterval(t);
  }, [id, inRound]);

  if (!league) return <div className="wk"><div className="wk-paper"><p className="wk-muted">{err ?? 'טוען את הליגה…'}</p></div></div>;
  const now = serverNow();
  const L = league;
  const next = L.status === 'open' ? { label: 'הרשימות נסגרות בעוד', at: L.cycle.locks }
    : L.status === 'locked' ? { label: 'המחזור הראשון בעוד', at: L.cycle.kickoff }
    : L.current ? (now < L.current.at ? { label: `${slotLabel(L.current.key).day} ${slotLabel(L.current.key).time}, בעוד`, at: L.current.at } : now < L.current.startsAt ? { label: 'המשחקים יוצאים בעוד', at: L.current.startsAt } : null)
    : null;
  const myDone = L.mine?.result;
  const canPlay = L.mine?.matchId && !myDone && L.current && now >= L.current.startsAt - 60_000;
  const takePrize = async () => {
    try {
      const { token } = await WeekendApi.prize(id);
      setLocal({ pendingPrize: token });
      const words = onPrize(token);
      if (words) { setPrizeWords(words); setLocal({ pendingPrize: null }); }
      else setPrizeWords('הפרס שמור. הוא ייכנס לקריירה ברגע שתפתח אותה.');
      void refresh();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'השרת לא עונה'); }
  };

  return (
    <div className="wk">
      <div className="wk-paper wk-stack">
        <div className="wk-row" style={{ justifyContent: 'space-between' }}>
          <button className="wk-back" onClick={onLeave}><Icon name="chevron" size={16} />לכניסה</button>
          <span className="wk-pill">{L.kind === 'open' ? 'הליגה הפתוחה' : 'ליגת החבר׳ה'} · {dateLabel(L.cycle.kickoff)}</span>
        </div>

        {/* the ticket */}
        <div className={`wk-ticket ${L.code ? 'has-stub' : ''} wk-in`}>
          {L.code && <div className="wk-stub"><span>{L.name} · {L.code}</span></div>}
          <div className="wk-stamp">{L.status === 'done' ? 'נגמר' : L.status === 'cancelled' ? 'בוטל' : L.status === 'open' ? 'נרשם' : 'נכנס'}</div>
          <div className="wk-kick">{L.status === 'open' ? `${L.members.length} מתוך ${L.capacity}` : L.status === 'playing' ? `מחזור ${(L.current?.index ?? L.rounds.length - 1) + 1} מתוך ${L.rounds.length}` : L.status}</div>
          <h1 style={{ marginTop: 4 }}>{L.name}</h1>
          {next && <div style={{ marginTop: 8 }}><div className="wk-muted">{next.label}</div><div className="wk-count num">{countdown(next.at, now)}</div></div>}
          {L.code && L.status === 'open' && <div className="wk-muted" style={{ marginTop: 8 }}>הקוד לחבר׳ה: <b className="num" style={{ fontFamily: 'var(--font-wk)', fontSize: 22, letterSpacing: '.12em' }}>{L.code}</b></div>}
          <div className="wk-barcode" />
        </div>

        {err && <p className="wk-err">{err}</p>}

        {/* the one button that matters now */}
        {canPlay && (
          <button className="wk-btn red wk-in" style={{ minHeight: 64, fontSize: 19 }} onClick={onMatch}>למגרש, מול {L.mine!.opponent}</button>
        )}
        {L.current && !canPlay && !myDone && now >= L.current.at && now < L.current.startsAt && L.mine && (
          <button className="wk-btn wk-in" onClick={() => WeekendApi.ready(id).then(refresh).catch(() => {})}>מוכן? מול {L.mine.opponent} בעוד {countdown(L.current.startsAt, now)}</button>
        )}
        {L.status === 'cancelled' && <div className="wk-card"><b>לא הגעתם לשישה.</b> <span className="wk-muted">הליגה לא יצאה לדרך. בשבוע הבא, או הליגה הפתוחה.</span></div>}

        {/* the prize */}
        {L.status === 'done' && L.prize && (
          <ChampionCard L={L} onTake={takePrize} words={prizeWords} hasCareer={hasCareer} />
        )}

        {/* tabs */}
        <div className="wk-row" style={{ gap: 6 }}>
          {(['league', 'squad', 'table'] as const).map(t => (
            <button key={t} className={`wk-btn sm ${tab === t ? '' : 'ghost'}`} style={{ flex: 1 }} onClick={() => setTab(t)} aria-pressed={tab === t}>{t === 'league' ? 'הליגה' : t === 'squad' ? 'הסגל' : 'הטבלה'}</button>
          ))}
        </div>

        {tab === 'league' && (
          <>
            {live && live.round && <LiveRound live={live} me={L.me?.nick ?? ''} />}
            <div className="wk-members">
              {L.members.map(m => <span key={m.nick} className={`wk-av ${m.me ? 'me' : ''} ${m.ready ? 'ready' : ''}`} title={m.opener ? 'פתח את הליגה' : ''}>{m.nick}</span>)}
              {L.status === 'open' && Array.from({ length: Math.max(0, L.capacity - L.members.length) }, (_, i) => <span key={`e${i}`} className="wk-av empty">·</span>)}
            </div>
            <div className="wk-list">
              {(L.status === 'open' ? L.roundKeys.map((r, i) => ({ key: r.key, at: r.at, i, match: null as LeagueView['rounds'][number]['matches'][number] | null, bye: null as string | null }))
                : L.rounds.map(r => ({ key: r.key, at: r.at, i: r.index, match: r.matches.find(m => m.mine) ?? null, bye: r.bye }))).map(r => {
                const lab = slotLabel(r.key);
                const done = !!r.match?.result;
                const isNext = L.current?.index === r.i;
                const res = r.match?.result;
                const mineHome = r.match && L.me && r.match.home === L.me.nick;
                const line = !r.match ? (L.status === 'open' ? '' : r.bye === L.me?.nick ? 'אתה נח' : '') : res
                  ? `${(mineHome ? res.winner === 'home' : res.winner === 'away') ? 'ניצחת' : 'הפסדת'} ${res.score[mineHome ? 0 : 1]}:${res.score[mineHome ? 1 : 0]}${res.shootout ? ` (פנדלים ${res.shootout[mineHome ? 0 : 1]}:${res.shootout[mineHome ? 1 : 0]})` : ''}${res.technical ? ' טכני' : ''} ${mineHome ? 'את' : 'אצל'} ${mineHome ? r.match.away : r.match.home}`
                  : `מול ${mineHome ? r.match.away : r.match.home}`;
                return (
                  <div key={r.key} className={`wk-slot ${done ? 'done' : ''} ${isNext ? 'next' : ''} ${r.i === L.roundKeys.length - 1 ? 'final' : ''}`}>
                    <span className="d">{lab.day}</span><span className="t num">{lab.time}</span>
                    <span className="s">{r.i === L.roundKeys.length - 1 && !line ? 'הגמר' : line}</span>
                  </div>
                );
              })}
            </div>
            {L.status === 'open' && L.code && (
              <div className="wk-card soft">
                <b>שלח לחבר׳ה:</b>
                <p className="wk-muted" style={{ margin: '6px 0 0', userSelect: 'all' }}>{`ליגת השכונה ב-BE A PRO. ${L.name}, הקוד ${L.code}. חמישי 20:00 פותחים. ${L.roundKeys.map(r => `${slotLabel(r.key).day} ${slotLabel(r.key).time}`).join(', ')}.`}</p>
              </div>
            )}
          </>
        )}

        {tab === 'squad' && L.me && (
          <SquadPane id={id} L={L} onChanged={refresh} packMan={packMan} setPackMan={setPackMan} />
        )}

        {tab === 'table' && <Table rows={L.table} me={L.me?.nick ?? ''} />}
      </div>
    </div>
  );
}

function LiveRound({ live, me }: { live: LiveView; me: string }) {
  const lead = live.matches.map(m => m.live?.last).filter(Boolean).sort((a, b) => (b!.minute - a!.minute))[0];
  return (
    <div className="wk-stack wk-in">
      <div className="wk-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>עכשיו משחקים</h2>
        <span className="wk-pill">{live.matches.filter(m => m.live && !m.live.done).length} משחקים חיים</span>
      </div>
      <div className="wk-live">
        {live.matches.map((m, i) => {
          const sc = m.result ? m.result.score : m.live?.score ?? [0, 0];
          const goal = m.live?.last?.type === 'goal' && m.live.minute - m.live.last.minute <= 2 && !m.live.done;
          const mine = m.home === me || m.away === me;
          return (
            <div key={i} className={`wk-m ${goal ? 'goal' : ''} ${mine ? 'mine' : ''}`}>
              <span className="r">{m.home}</span>
              <span className="s">{sc[0]}-{sc[1]}</span>
              <span className="l">{m.away}</span>
              <span className="mm">{m.result ? (m.result.shootout ? `נגמר בפנדלים ${m.result.shootout[0]}-${m.result.shootout[1]}` : m.result.technical ? 'הפסד טכני' : 'נגמר') : m.live ? (m.live.done ? 'נגמר' : m.live.shootout ? `פנדלים ${m.live.shootout[0]}-${m.live.shootout[1]}` : `דקה ${m.live.minute}${m.live.deciding.length ? ' · מחליטים' : ''}`) : 'עוד לא התחיל'}</span>
            </div>
          );
        })}
      </div>
      {lead && <div className="wk-mega"><Icon name="mic" size={18} color="var(--wk-paper)" /><span>{lead.text}</span></div>}
    </div>
  );
}

function Table({ rows, me }: { rows: LeagueView['table']; me: string }) {
  return (
    <div className="wk-tbl wk-in">
      <div className="wk-tr"><span>#</span><span>מנהל</span><span>נ</span><span>ה</span><span>הפרש</span><span>נק׳</span></div>
      {rows.map((r, i) => (
        <div key={r.device} className={`wk-tr ${r.nick === me ? 'me' : ''}`}>
          <span className="p num">{i + 1}</span>
          <span>{r.nick}{r.assistant > 0 && <span className="ai">העוזר {r.assistant}</span>}</span>
          <span className="num">{r.wins}</span><span className="num">{r.losses}</span>
          <span className="num">{r.gd > 0 ? '+' : ''}{r.gd}</span>
          <span className="pts num">{r.points}</span>
        </div>
      ))}
    </div>
  );
}

function SquadPane({ id, L, onChanged, packMan, setPackMan }: { id: string; L: LeagueView; onChanged: () => void; packMan: Player | null; setPackMan: (p: Player | null) => void }) {
  const me = L.me!;
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!me.squad) return <div className="wk-card soft"><b>הסגל מוגרל בחמישי 17:00.</b> <span className="wk-muted">שמונה עשר שחקנים, ממוצע 85, שווה לכולם. בינתיים תביא חברים.</span></div>;
  const xi = me.squad.slice(0, 11), bench = me.squad.slice(11);
  const packsLeft = me.packs - me.opened;
  const locked = L.current && serverNow() >= L.current.at && !L.mine?.result;
  const pick = async (f: FormationId) => {
    setBusy(true); setErr(null);
    try {
      const eleven = fillFormation([...me.squad!], formation(f)).map(p => p.id);
      await WeekendApi.lineup(id, eleven, { ...me.tactic, formation: f });
      onChanged();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'השרת לא עונה'); } finally { setBusy(false); }
  };
  const openPack = async (pos: string) => {
    setBusy(true); setErr(null);
    try { const r = await WeekendApi.pack(id, pos); setPackMan(r.player); onChanged(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'השרת לא עונה'); } finally { setBusy(false); }
  };
  return (
    <div className="wk-stack wk-in">
      {packsLeft > 0 && (
        <div className="wk-card" style={{ borderColor: 'var(--wk-red)' }}>
          <div className="wk-kick">חבילה על {PACK_EVERY} ניצחונות</div>
          <h2 style={{ margin: '4px 0 6px' }}>שחקן 90 לעמדה שתבחר</h2>
          <p className="wk-muted">הוא נכנס במקום החלש ביותר באותה עמדה. {packsLeft > 1 ? `יש לך ${packsLeft} חבילות.` : ''}</p>
          <div className="wk-row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {Object.entries(POSITION_WORDS).map(([pos, w]) => <button key={pos} className="wk-btn sm ghost" disabled={busy} onClick={() => openPack(pos)}>{w}</button>)}
          </div>
        </div>
      )}
      {packMan && (
        <div className="wk-card wk-in" style={{ borderColor: 'var(--wk-red)', background: 'var(--wk-red-soft)' }}>
          <div className="wk-kick">נכנס לסגל</div>
          <h2>{packMan.name}</h2>
          <div className="wk-muted">{POSITION_WORDS[packMan.position] ?? packMan.position} · <span className="num">{overall(packMan)}</span> · בן <span className="num">{packMan.age}</span></div>
          <button className="wk-btn sm" style={{ marginTop: 8 }} onClick={() => setPackMan(null)}>סבבה</button>
        </div>
      )}
      <div>
        <div className="wk-sep">המערך {locked ? '(נעול בזמן משחק)' : ''}</div>
        <div className="wk-row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {FORMATIONS.map(f => <button key={f.id} className={`wk-btn sm ${me.tactic.formation === f.id ? '' : 'ghost'}`} disabled={busy || !!locked} onClick={() => pick(f.id)} aria-pressed={me.tactic.formation === f.id}><span className="num">{f.id}</span></button>)}
        </div>
        <p className="wk-muted" style={{ marginTop: 6 }}>בחירת מערך מושיבה את האחד עשר הטובים לכל קו. ממוצע הסגל <span className="num">{(me.squad.reduce((s, p) => s + overall(p), 0) / me.squad.length).toFixed(1)}</span>.</p>
      </div>
      {err && <p className="wk-err">{err}</p>}
      <div className="wk-sep">האחד עשר</div>
      <div className="wk-squad">{xi.map(p => <PlayerRow key={p.id} p={p} pack={me.fromPacks.includes(p.id)} />)}</div>
      <div className="wk-sep">הספסל</div>
      <div className="wk-squad">{bench.map(p => <PlayerRow key={p.id} p={p} bench pack={me.fromPacks.includes(p.id)} />)}</div>
    </div>
  );
}

function PlayerRow({ p, bench, pack }: { p: Player; bench?: boolean; pack?: boolean }) {
  return (
    <div className={`wk-pl ${bench ? 'bench' : ''} ${pack ? 'pack' : ''}`}>
      <span className="pos">{p.position}</span>
      <span>{p.name}{pack && <span className="ai" style={{ color: 'var(--wk-red-dark)', fontSize: 11, marginInlineStart: 6 }}>מהחבילה</span>}</span>
      <span className="ovr num">{overall(p)}</span>
    </div>
  );
}

function ChampionCard({ L, onTake, words, hasCareer }: { L: LeagueView; onTake: () => void; words: string | null; hasCareer: boolean }) {
  const p = L.prize!;
  const top = L.table.slice(0, 3);
  const last = L.table[L.table.length - 1];
  const title = p.place === 1 ? 'אלוף הסופשבוע' : p.place === 2 ? 'סגן האלוף' : p.place === 3 ? 'מקום שלישי' : p.finished ? 'שיחקת את הסופשבוע' : 'הסופשבוע נגמר';
  return (
    <div className="wk-champ wk-in">
      <div className="wk-kick" style={{ justifyContent: 'center' }}>{L.name}</div>
      <h1 className="big">{title}</h1>
      <div className="date num">{dateLabel(L.cycle.final)}</div>
      {p.place <= 3 && <div className="wk-trophy num">{p.place}</div>}
      <div className="wk-stack" style={{ gap: 6, margin: '10px 0' }}>
        {top.map((r, i) => <div key={r.device} className={`wk-pr ${i === 0 ? 'first' : ''}`}><span className="n num">{i + 1}</span><span>{r.nick}</span><span className="pts num">{r.points}</span></div>)}
      </div>
      <p className="wk-muted">
        {p.wageRounds > 0 || p.gems > 0
          ? `לקריירה: ${p.wageRounds === 1.5 ? 'מחזור שכר וחצי' : p.wageRounds === 1 ? 'מחזור שכר' : p.wageRounds === 0.75 ? 'שלושה רבעי מחזור שכר' : p.wageRounds === 0.5 ? 'חצי מחזור שכר' : 'רבע מחזור שכר'} של הליגה שלך${p.gems ? `, ו-${p.gems} ${p.gems === 1 ? 'יהלום' : 'יהלומים'}` : ''}.`
          : 'העוזר שיחק במקומך ברוב המשחקים, אז הפעם בלי מעטפה.'}
      </p>
      {last && last.nick !== L.me?.nick && p.place === 1 && <p className="wk-muted">כפרה, {last.nick}.</p>}
      {words ? <div className="wk-card soft" style={{ textAlign: 'start' }}><b>{words}</b></div>
        : L.claimed ? <div className="wk-muted">הפרס כבר נלקח.</div>
        : (p.wageRounds > 0 || p.gems > 0) ? <button className="wk-btn red" onClick={onTake}>{hasCareer ? 'לקחת הביתה לקריירה' : 'לשמור את הפרס לקריירה'}</button> : null}
    </div>
  );
}
