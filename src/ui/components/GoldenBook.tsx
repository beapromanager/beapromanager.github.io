import { useState } from 'react';
import * as G from '../../game/state.ts';
import type { GoldenPage } from '../../game/summitMemory.ts';
import { euroClub } from '../../data/europeClubs.ts';
import { summitShareText, shareLink } from '../../game/share.ts';
import { useSummitAsset } from '../summitAsset.ts';
import { Portal } from './Portal.tsx';
import { EliteRule } from './Elite.tsx';
import { SummitShare } from './SummitShare.tsx';

/**
 * ספר הזהב (R7): the finals of פסגת אירופה he played, one page each, the trophy on a double page. Itzik's scope
 * (9.11): finals and trophies only. Every page is written from the match itself (summitStory.ts) and wears a
 * picture of its moment, Itzik's when it is there (book/<moment>), a drawn gold medallion until then. The newest
 * page first; pages older than the book keeps whole are one line each.
 */
function Medallion() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
      <circle cx="60" cy="60" r="54" fill="var(--el-bg1)" stroke="url(#el-gold)" strokeWidth="4" />
      <circle cx="60" cy="60" r="44" fill="none" stroke="var(--el-g1)" strokeWidth="1" />
      <path d="M60 28l8.6 17.6 19.4 2.8-14 13.7 3.3 19.3L60 72.3 42.7 81.4 46 62.1 32 48.4l19.4-2.8z" fill="url(#el-gold)" />
    </svg>
  );
}

function Picture({ momentId }: { momentId: string }) {
  const pic = useSummitAsset(`book/${momentId}`);
  return (
    <div className="el-page-pic">
      {pic.ready && pic.src ? <img src={pic.src} alt="" /> : <Medallion />}
    </div>
  );
}

function Page({ gs, page }: { gs: G.GameState; page: GoldenPage }) {
  const [sharing, setSharing] = useState(false);
  const me = G.club(gs);
  const opp = euroClub(page.oppId);
  if (page.compact) return <div className="el-page-line">עונה <span className="num">{page.season}</span> · {page.title}</div>;
  const trophy = page.kind === 'trophy';
  return (
    <article className="el-page" data-kind={page.kind}>
      <Picture momentId={page.momentId} />
      <div className="el-kicker">{trophy ? 'הגביע' : 'גמר'} · עונה <span className="num">{page.season}</span></div>
      <h3 className="el-title el-foil-text" style={{ fontSize: 26 }}>{page.title}</h3>
      <p className="el-page-text">{page.line}</p>
      <div className="el-page-score">
        <span>{me.short}</span>
        <b className="num" dir="ltr">{page.score[0]} : {page.score[1]}</b>
        <span>{opp?.short ?? ''}</span>
      </div>
      {page.pens && <div className="el-page-pens"><span className="num" dir="ltr">{page.pens[0]}:{page.pens[1]}</span> בפנדלים</div>}
      {page.rivalry && <p className="el-page-rivalry">{page.rivalry}</p>}
      {sharing
        ? <SummitShare club={me} link={shareLink()}
            card={{ headline: trophy ? 'אלופי אירופה' : 'גמר פסגת אירופה', club: me.name, season: page.season, score: page.score, pens: page.pens }}
            text={summitShareText(trophy ? 'trophy' : 'final', { club: me.name, season: page.season })} />
        : <button type="button" className="btn dark btn-sm" onClick={() => setSharing(true)}>שתף את העמוד</button>}
    </article>
  );
}

export function GoldenBook({ gs, onClose }: { gs: G.GameState; onClose: () => void }) {
  const pages = [...(gs.goldenBook ?? [])].reverse();
  return (
    <Portal>
      <div className="el-book" data-summit="1" data-testid="golden-book" role="dialog" aria-label="ספר הזהב">
        <div className="el-book-head">
          <button type="button" className="btn dark btn-sm" onClick={onClose}>חזרה</button>
          <div className="el-title el-foil-text" style={{ fontSize: 28 }}>ספר הזהב</div>
        </div>
        <EliteRule />
        {pages.length === 0
          ? <p className="el-book-empty">הספר מחכה לגמר הראשון שלך בפסגת אירופה. כל גמר שתשחק ייכתב כאן, והגביע יקבל עמוד כפול.</p>
          : pages.map((p, i) => <Page key={`${p.season}-${p.kind}-${i}`} gs={gs} page={p} />)}
      </div>
    </Portal>
  );
}
