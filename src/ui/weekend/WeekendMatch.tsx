/**
 * The weekend match on the phone: the engine is on the server, this screen is
 * its window. It asks every second where the match is, shows the scoreboard,
 * the frozen clock and the ring of twelve seconds when a moment is mine,
 * "he decides" when it is his, and the penalties at the end. The print frames
 * of the ticket world sit behind it: the fence while we wait, the penalty, the
 * one on one, and the win or the loss when it is over.
 */
import { useEffect, useRef, useState } from 'react';
import { WeekendApi, ApiError, serverNow, CORNER_WORDS } from '../../game/weekend.ts';
import type { DuelView, DecisionView } from '../../game/duel.ts';
import type { LiveEvent } from '../../game/liveMatch.ts';
import { asset } from '../asset.ts';
import { Icon } from '../components/Icon.tsx';

type View = DuelView & { side: 'home' | 'away' };

export function WeekendMatch({ leagueId, matchId, side, opponent, me, onDone }: {
  leagueId: string; matchId: string; side: 'home' | 'away'; opponent: string; me: string; onDone: () => void;
}) {
  const [v, setV] = useState<View | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [ticker, setTicker] = useState<string | null>(null);
  const next = useRef(0);
  const [, tick] = useState(0);
  const busy = useRef(false);

  // the window: every second, and right after a choice
  useEffect(() => {
    let on = true;
    const poll = async () => {
      if (busy.current) return;
      try {
        const r = await WeekendApi.match(matchId, next.current);
        if (!on) return;
        next.current = r.next;
        if (r.events.length) setEvents(e => [...e, ...r.events]);
        setV(r);
        if (!r.decision) setChosen(null);
        setErr(null);
      } catch (e) { if (on) setErr(e instanceof ApiError ? e.message : 'השרת לא עונה'); }
    };
    void poll();
    const t = setInterval(poll, 1000);
    const k = setInterval(() => tick(n => n + 1), 250);
    return () => { on = false; clearInterval(t); clearInterval(k); };
  }, [matchId]);

  // the other matches of the round, one line at a time
  useEffect(() => {
    const go = () => WeekendApi.live(leagueId).then(l => {
      const others = l.matches.filter(m => !m.mine && m.live?.last).map(m => `${m.home} ${m.live!.score[0]}-${m.live!.score[1]} ${m.away} · ${m.live!.last!.text}`);
      setTicker(others.length ? others[Math.floor(serverNow() / 6000) % others.length] : null);
    }).catch(() => {});
    go(); const t = setInterval(go, 6000); return () => clearInterval(t);
  }, [leagueId]);

  const choose = async (choice: string) => {
    if (!v?.decision || chosen) return;
    setChosen(choice);
    busy.current = true;
    try {
      const r = await WeekendApi.choose(matchId, next.current, choice);
      next.current = r.view.next;
      if (r.view.events.length) setEvents(e => [...e, ...r.view.events]);
      setV(r.view);
      if (!r.ok) setChosen(null);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'השרת לא עונה'); setChosen(null); }
    finally { busy.current = false; }
  };

  const mine = side === 'home';
  const us = v ? (mine ? v.home : v.away) : me;
  const them = v ? (mine ? v.away : v.home) : opponent;
  const score = v ? (mine ? v.score : [v.score[1], v.score[0]]) : [0, 0];
  const dec = v?.decision ?? null;
  const now = serverNow();
  const left = dec ? Math.max(0, Math.ceil((dec.deadlineAt - now) / 1000)) : 0;
  const pct = dec ? Math.max(0, Math.min(100, ((dec.deadlineAt - now) / 12_000) * 100)) : 100;
  const frozen = !!dec || !!v?.waiting;
  const won = v?.done ? (v.shootout?.winner ? v.shootout.winner === side : score[0] > score[1]) : null;
  const frame = v?.done ? (won ? 'win' : 'loss') : dec ? (dec.kind === 'penalty' || dec.kind === 'def_penalty' ? 'penalty' : dec.kind === 'tactic' ? 'fence' : 'oneonone') : v?.waiting ? 'fence' : 'entrance';
  const so = v?.shootout ?? null;
  const soMine = so ? (mine ? [so.home, so.away] : [so.away, so.home]) : null;

  return (
    <div className="wk">
      <div className="wk-paper wk-stack" style={{ gap: 10 }}>
        <div className="wk-frame"><img src={asset(`/weekend/${frame}.webp`)} alt="" /></div>
        <div className="wk-row" style={{ justifyContent: 'space-between' }}>
          <button className="wk-back" onClick={onDone}><Icon name="chevron" size={16} />{v?.done ? 'לליגה' : 'הליגה'}</button>
          <span className="wk-pill">{v?.halfUntil ? 'מחצית' : so ? 'פנדלים' : v?.done ? 'נגמר' : 'חי'}</span>
        </div>
        <div style={{ height: 150 }} />

        <div className="wk-board">
          <span className="club">{us}</span>
          <span className="sc">{score[0]} : {score[1]}</span>
          <span className="club">{them}</span>
        </div>
        {soMine && <div className="wk-clock"><span>פנדלים</span><b className="num">{soMine[0]} - {soMine[1]}</b></div>}
        <div className="wk-clock">
          {!so && <b className="num">{v ? `${v.minute}'` : '…'}</b>}
          {frozen && !v?.done && <span className="wk-frozen">השעון עצר</span>}
          {v?.halfUntil && <span>המחצית, חוזרים בעוד {Math.max(0, Math.ceil((v.halfUntil - now) / 1000))}</span>}
        </div>

        {err && <p className="wk-err">{err}</p>}

        {dec && !v?.done && (
          <Moment dec={dec} left={left} pct={pct} chosen={chosen} onChoose={choose} />
        )}

        {!dec && v?.waiting && !v.done && (
          <div className="wk-opp wk-in">
            <Icon name="whistle" size={18} />
            <span>{v.waiting.who === side ? 'השרת מחכה לך' : `${them} מחליט`}<span className="dots" /> · <span className="num">{Math.max(0, Math.ceil((v.waiting.deadlineAt - now) / 1000))}</span></span>
          </div>
        )}

        {v?.done && (
          <div className="wk-card wk-in" style={{ textAlign: 'center', borderColor: won ? 'var(--wk-win)' : 'var(--wk-red)' }}>
            <h2 style={{ fontSize: 30 }}>{won ? 'ניצחת' : 'הפסדת'}{so ? ' בפנדלים' : ''}</h2>
            <p className="wk-muted">{won ? `${them} יזכור את זה עד חמישי הבא.` : `${them} כבר כותב בקבוצה.`}</p>
            <button className="wk-btn" style={{ marginTop: 8, width: '100%' }} onClick={onDone}>לטבלה</button>
          </div>
        )}

        {ticker && !v?.done && <div className="wk-ticker"><b>במקביל</b><span>{ticker}</span></div>}

        <Events events={events} us={mine ? 'home' : 'away'} />
      </div>
    </div>
  );
}

function Moment({ dec, left, pct, chosen, onChoose }: { dec: DecisionView; left: number; pct: number; chosen: string | null; onChoose: (c: string) => void }) {
  const corner = !!dec.corners;
  return (
    <div className="wk-moment wk-stack wk-in" style={{ gap: 8 }}>
      <div className="wk-ring" style={{ ['--p' as string]: `${pct}%` }}><b className="num">{left}</b><small>שניות</small></div>
      <h3>{dec.title}</h3>
      <p className="wk-muted">{dec.subtitle}</p>
      {corner && (
        <>
          <div className="wk-goalnet"><div className="wk-keeper" data-at={chosen ?? 'center'} /></div>
          <div className="wk-corners">
            {dec.corners!.map(c => (
              <button key={c} className="wk-opt" aria-pressed={chosen === c} disabled={!!chosen} onClick={() => onChoose(c)}>{CORNER_WORDS[c]}</button>
            ))}
          </div>
          <p className="wk-muted" style={{ textAlign: 'center', fontSize: 12 }}>{dec.role === 'dive' ? 'לאן השוער שלך קופץ' : dec.role === 'aim' ? 'לאן הוא בועט' : 'לאן בועטים'}</p>
        </>
      )}
      {!corner && dec.options && (
        <div className="wk-opts">
          {dec.options.map(o => (
            <button key={o.id} className="wk-opt" style={{ minHeight: 64 }} aria-pressed={chosen === o.id} disabled={!!chosen} onClick={() => onChoose(o.id)}>
              {o.label}{o.hint && <small>{o.hint}</small>}
            </button>
          ))}
        </div>
      )}
      {chosen && <p className="wk-muted" style={{ textAlign: 'center' }}>נשלח. מחכים לשריקה.</p>}
    </div>
  );
}

function Events({ events, us }: { events: LiveEvent[]; us: 'home' | 'away' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: 0 }); }, [events.length]);
  const shown = [...events].reverse().slice(0, 30);
  if (!shown.length) return null;
  return (
    <div className="wk-events" ref={ref}>
      {shown.map((e, i) => (
        <div key={`${e.minute}-${i}`} className={e.big ? 'big' : ''}><span className="min num">{e.minute}'</span>{e.text}</div>
      ))}
    </div>
  );
}
