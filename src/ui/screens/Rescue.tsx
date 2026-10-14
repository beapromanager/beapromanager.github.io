import * as G from '../../game/state.ts';
import { Crest } from '../components/Crest.tsx';
import { Icon } from '../components/Icon.tsx';
import { FIX_RESCUE_TEXT } from '../../data/fixingText.ts';

/**
 * The phone call, the morning after.
 *
 * The other club in the same town, a division below, the one that has spent
 * fifty years in the shadow of the club that just threw you out. They do not
 * want a manager, they want THAT manager: the one their rivals could not
 * afford to keep. Take it, drag them up, and the season after that you are back
 * in the same league with a derby already circled.
 *
 * Turning it down ends the career, which is the point of the choice being here
 * at all: the way back is offered once, and it costs something to take.
 */
export function RescueScreen({ gs, onTake, onWalkAway }: {
  gs: G.GameState; onTake: () => void; onWalkAway: () => void;
}) {
  const offer = G.rescueOffer(gs);
  const s = gs.sacking;
  if (!offer || !s) return null;
  if (s.reason === 'fixing') return <SecondChance offer={offer} onTake={onTake} onWalkAway={onWalkAway} />;

  return (
    <div className="screen pad stack pad-b" style={{ gap: 15, minHeight: '100%', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <span className="rescue-ring"><Icon name="mic" size={22} color="var(--gold)" /></span>
        <div className="label-cap" style={{ marginTop: 11 }}>שיחה נכנסת · {offer.city}</div>
      </div>

      <div className="rescue-card">
        <Crest club={offer.club} size={58} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginTop: 10 }}>{offer.club.name}</div>
        <div className="sub" style={{ fontSize: 13.5, marginTop: 3 }}>{offer.league}</div>
      </div>

      <div className="tile" style={{ padding: 15, fontSize: 14.5, lineHeight: 1.7 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gold)', marginBottom: 7 }}>
          הבעלים של {offer.club.name}
        </div>
        חמישים שנה אנחנו הקבוצה השנייה ב{offer.city}. חמישים שנה שומעים רק על {offer.nemesisName}.
        <div style={{ height: 9 }} />
        ראיתי מה הם עשו לך, וראיתי גם מה הם לא נתנו לך לעבוד איתו.
        אני לא יכול להציע לך כסף גדול ואני לא אשקר לך
        {offer.sameLeague ? ', אנחנו הקבוצה הקטנה בעיר' : `, אנחנו ${offer.league}, מתחתיהם`}.
        אבל אני מציע לך את הדבר היחיד שהם לא יכולים:{' '}
        <b style={{ color: 'var(--ink)' }}>
          {offer.sameLeague ? 'להחזיר להם על המגרש שלהם.' : 'לחזור אליהם מלמטה.'}
        </b>
        <div style={{ height: 9 }} />
        {offer.sameLeague
          ? 'הם באותה ליגה איתנו, אז הדרבי הוא כבר העונה. תחשוב על זה שנייה אחת ותגיד לי כן.'
          : 'תעלה אותנו ליגה, ובעונה שאחריה יש דרבי. תחשוב על זה שנייה אחת ותגיד לי כן.'}
      </div>

      <div className="rescue-path">
        {offer.sameLeague ? (
          <>
            <Step n="1" text={`${offer.league} · מתחילים מאפס`} />
            <Step n="2" text={`דרבי מול ${offer.nemesisName}`} hot />
          </>
        ) : (
          <>
            <Step n="1" text={`${offer.league} · מתחילים מאפס`} />
            <Step n="2" text={`עולים ל${offer.nemesisLeague}`} />
            <Step n="3" text={`דרבי מול ${offer.nemesisName}`} hot />
          </>
        )}
      </div>

      <div className="spacer" />
      <button className="btn" onClick={onTake}>
        <Icon name="flame" size={18} /> אני בפנים
      </button>
      <button className="btn dark" onClick={onWalkAway}>לתלות את הנעליים</button>
      <p className="hint" style={{ textAlign: 'center' }}>
        לתלות את הנעליים מסיים את הקריירה הזאת.
      </p>
    </div>
  );
}

function Step({ n, text, hot }: { n: string; text: string; hot?: boolean }) {
  return (
    <div className="rescue-step" data-hot={hot ? '1' : '0'}>
      <span className="rescue-n">{n}</span>
      <span>{text}</span>
    </div>
  );
}

/** After a closed club: a small club in the bottom division calls anyway. One more chance and no third. */
function SecondChance({ offer, onTake, onWalkAway }: { offer: G.RescueOffer; onTake: () => void; onWalkAway: () => void }) {
  return (
    <div className="screen pad stack pad-b" style={{ gap: 15, minHeight: '100%', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <span className="rescue-ring"><Icon name="mic" size={22} color="var(--gold)" /></span>
        <div className="label-cap" style={{ marginTop: 11 }}>{FIX_RESCUE_TEXT.title}</div>
      </div>
      <div className="rescue-card">
        <Crest club={offer.club} size={58} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginTop: 10 }}>{offer.club.name}</div>
        <div className="sub" style={{ fontSize: 13.5, marginTop: 3 }}>{offer.league}</div>
      </div>
      <div className="tile" style={{ padding: 15, fontSize: 14.5, lineHeight: 1.7 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gold)', marginBottom: 7 }}>הבעלים של {offer.club.name}</div>
        {FIX_RESCUE_TEXT.body.split('\n').map((l, i) => <div key={i} style={{ marginBottom: 6 }}>{l}</div>)}
      </div>
      <div className="rescue-path">
        <div className="rescue-step" data-hot="0"><span className="rescue-n">1</span><span>{offer.league} · מתחילים מאפס</span></div>
      </div>
      <div className="spacer" />
      <button className="btn" onClick={onTake}><Icon name="flame" size={18} /> אני בפנים</button>
      <button className="btn dark" onClick={onWalkAway}>לתלות את הנעליים</button>
      <p className="hint" style={{ textAlign: 'center' }}>לתלות את הנעליים מסיים את הקריירה הזאת.</p>
    </div>
  );
}
