import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as G from '../game/state.ts';
import { saveCareer, loadCareer, savedSummary, clearCareer } from '../game/save.ts';
import type { SaveSummary } from '../game/save.ts';
import { TitleScreen } from './screens/Title.tsx';
import { IntroCinematic } from './screens/Intro.tsx';
import { Tutorial } from './components/Tutorial.tsx';
import { OnboardManager, OnboardClub } from './screens/Onboard.tsx';
import { ArchetypeScreen } from './screens/Archetype.tsx';
import { SquadScreen } from './screens/Squad.tsx';
import { SigningScreen } from './screens/Signing.tsx';
import { PreSeasonMarket } from './screens/PreSeason.tsx';
import { TransfersScreen } from './screens/Transfers.tsx';
import { Hub } from './screens/Hub.tsx';
import { DilemmaChat } from './screens/Dilemma.tsx';
import { TacticScreen } from './screens/Tactic.tsx';
import { VsScreen } from './screens/Vs.tsx';
import { MatchBroadcast } from './screens/Match.tsx';
import { ResultScreen } from './screens/Result.tsx';
import { PressScreen } from './screens/Press.tsx';
import { SeasonEnd, PreSeasonScreen } from './screens/SeasonEnd.tsx';
import { SackedScreen } from './screens/Sacked.tsx';
import { SponsorScreen } from './screens/Sponsor.tsx';
import { KitReveal } from './screens/KitReveal.tsx';
import { YouthScreen } from './screens/Youth.tsx';
import { NoticeScreen } from './screens/Notice.tsx';
import { UltimatumScreen } from './screens/Ultimatum.tsx';
import { RescueScreen } from './screens/Rescue.tsx';
import { ChronicleScreen } from './screens/Chronicle.tsx';
import { InboxScreen } from './screens/Inbox.tsx';
import { ChatScreen } from './screens/Chat.tsx';
import { StandingsScreen } from './screens/Standings.tsx';
import { CaptainScreen } from './screens/Captain.tsx';
import { AssistantScreen } from './screens/Assistant.tsx';
import { StadiumScreen } from './screens/Stadium.tsx';
import { PacksScreen } from './screens/Packs.tsx';
import { CoachScreen } from './screens/Coach.tsx';
import { InviteScreen } from './screens/Invite.tsx';
import { setInviteHandler, setInstallHandler } from './components/bits.tsx';
import { InstallSheet } from './components/InstallSheet.tsx';
import { refFromUrl } from '../game/invite.ts';
import { scrollToTop } from './scroll.ts';
import { armBack, setBackHandler, leaveGame } from './back.ts';
import { ExitSheet } from './components/ExitSheet.tsx';
import { AdPlayer } from './components/AdPlayer.tsx';
import { pickAd } from '../game/adWatch.ts';
import type { Ad } from '../data/ads.ts';

/**
 * Screens whose way out is simply the hub.
 *
 * Everything absent from this list has no back on purpose: a match, the press
 * room, a dilemma, the season end, a sacking. Those are moments the manager has
 * to answer, and letting a stray thumb walk out of them would lose the answer.
 */
const BACK_TO_HUB = new Set<G.Phase>([
  'squad', 'youth', 'stadium', 'coach', 'packs', 'captain', 'assistant',
]);

export function App() {
  const [introDone, setIntroDone] = useState(false);      // the cold open plays first, every launch
  const [booted, setBooted] = useState(false);            // still on the title screen
  const [gs, setGs] = useState<G.GameState>(() => G.newGame());
  const [squadFromHub, setSquadFromHub] = useState(false);
  const [saved, setSaved] = useState<SaveSummary | null>(() => savedSummary());
  const [fromPreseason, setFromPreseason] = useState(false);   // market opened from the summer board
  // who sent this link, kept for the moment a career actually starts. Read once
  // on load, because the url is tidied straight afterwards
  const [installOpen, setInstallOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  // the ad on screen, an overlay like the sheets so the shop stays underneath.
  // The key remounts the player for a fresh sitting when he asks to watch again
  const [ad, setAd] = useState<{ ad: Ad; key: number } | null>(null);
  const adBack = useRef<(() => void) | null>(null);
  const [ref] = useState<string | null>(() => {
    try { return refFromUrl(location.search); } catch { return null; }
  });

  // one handler for the share button that sits in the meters bar on every
  // screen. The functional update keeps it from closing over a stale state
  useEffect(() => {
    if (!booted) { setInviteHandler(null); setInstallHandler(null); return; }
    setInviteHandler(() => setGs(prev => G.openInvite(prev)));
    // the install offer is a sheet rather than a phase, so it can be opened
    // from the middle of anything without losing where the manager was
    setInstallHandler(() => setInstallOpen(true));
    return () => { setInviteHandler(null); setInstallHandler(null); };
  }, [booted]);

  // an invite link is read once on load; then the address bar is tidied so a
  // refresh does not look like a second invite
  useEffect(() => {
    try {
      if (location.search) history.replaceState(null, '', location.pathname);
    } catch { /* private mode, the link still worked */ }
  }, [ref]);

  // persist the career whenever it changes, so closing the tab is not a loss
  useEffect(() => { if (booted) saveCareer(gs); }, [gs, booted]);

  /**
   * The phone's back button, wired to whatever "back" means on this screen.
   *
   * Recomputed every render on purpose: back out of the squad screen goes to the
   * hub, back out of the market might go to the summer board instead, and back
   * during a match must do nothing at all — you do not get to leave a cup final
   * by brushing the wrong part of the phone. Anything with no way back asks
   * before it lets go of him.
   */
  useEffect(() => {
    if (!booted) { setBackHandler(null); return; }
    armBack();
    setBackHandler(() => {
      // sheets first: they sit on top of whatever screen is behind them
      if (ad) { adBack.current?.(); return true; }
      if (exitOpen) { setExitOpen(false); return true; }
      if (installOpen) { setInstallOpen(false); return true; }
      if (gs.phase === 'invite') { setGs(g => G.closeInvite(g)); return true; }

      const back = BACK_TO_HUB.has(gs.phase);
      if (gs.phase === 'squad' && squadFromHub) { setSquadFromHub(false); setGs(g => G.backToHub(g)); return true; }
      if (gs.phase === 'transfers') {
        if (fromPreseason) { setFromPreseason(false); setGs(g => G.backToPreseason(g)); }
        else setGs(g => G.backToHub(g));
        return true;
      }
      if (gs.phase === 'inbox') { setGs(g => G.closeInbox(g)); return true; }
      if (gs.phase === 'chronicle') { setGs(g => G.closeChronicle(g)); return true; }
      if (gs.phase === 'table') { setGs(g => G.closeTable(g)); return true; }
      if (back) { setGs(g => G.backToHub(g)); return true; }

      // nowhere left to go. Ask, rather than vanishing mid career
      setExitOpen(true);
      return false;
    });
    return () => setBackHandler(null);
  }, [booted, gs.phase, squadFromHub, fromPreseason, installOpen, exitOpen, ad]);

  // Every new page starts at the top. The phase alone is not enough: the press
  // room asks two questions and the summer runs three market rounds without it
  // ever changing, and each of those is a new page to whoever is reading it.
  const screenKey = !introDone ? 'intro' : !booted ? 'title'
    : `${gs.phase}|${gs.press?.q.text ?? ''}|${gs.preWeek}`;
  useLayoutEffect(scrollToTop, [screenKey]);

  function startNew() {
    clearCareer();
    setSaved(null);
    const fresh = G.newGame(Math.floor(Math.random() * 100000) + 1);
    setGs(ref ? G.acceptInvite(fresh, ref) : fresh);
    setBooted(true);
  }

  function continueCareer() {
    const loaded = loadCareer();
    if (loaded) setGs(loaded);
    setBooted(true);
  }

  if (!introDone) {
    return (
      <div className="frame">
        <IntroCinematic onDone={() => setIntroDone(true)} />
      </div>
    );
  }

  if (!booted) {
    return (
      <div className="frame">
        <>
          <TitleScreen saved={saved} onNew={startNew} onContinue={continueCareer} onInstall={() => setInstallOpen(true)} />
          {installOpen && <InstallSheet onClose={() => setInstallOpen(false)} />}
        </>
      </div>
    );
  }

  return (
    <div className="frame">
      {gs.phase === 'onboard-archetype' && (
        <ArchetypeScreen gs={gs} onPick={id => setGs(G.setArchetype(gs, id))} />
      )}
      {gs.phase === 'onboard-manager' && (
        <OnboardManager gs={gs} onDone={p => setGs(G.setProfile(gs, p))} />
      )}
      {gs.phase === 'onboard-club' && (
        <OnboardClub gs={gs} onPick={(city, kit, pattern) => setGs(G.pickCity(gs, city, kit, pattern))} />
      )}
      {gs.phase === 'signing' && (
        <SigningScreen gs={gs} onDone={effect => setGs(G.afterSigning(gs, effect))} />
      )}
      {gs.phase === 'squad' && (
        <SquadScreen gs={gs} firstTime={!squadFromHub}
          onSwap={(a, b) => setGs(g => G.swapPlayers(g, a, b))}
          onPart={(id, kind) => setGs(g => G.partWays(g, id, kind))}
          onDone={() => {
            if (squadFromHub) { setGs(G.backToHub(gs)); setSquadFromHub(false); }
            else setGs(G.enterPreseason(gs));
          }} />
      )}
      {gs.phase === 'preseason-market' && (
        <PreSeasonMarket gs={gs} firstCareer={gs.season === 1}
          onOpenMarket={line => { setFromPreseason(true); setGs(G.openTransfers(gs, line ?? null)); }}
          onResolveDeparture={(kind, oi) => setGs(g => G.resolveDeparture(g, kind, oi))}
          onRenew={id => setGs(g => G.renewContract(g, id))}
          onRelease={id => setGs(g => G.releasePlayer(g, id))}
          onDismissOutcome={() => setGs(G.clearPreseasonOutcome(gs))}
          onTakeCourse={() => setGs(g => G.takeCourse(g))}
          onAdvance={() => {
            setGs(G.advancePreseason(gs));
          }} />
      )}
      {gs.phase === 'transfers' && (
        <TransfersScreen gs={gs}
          onSign={id => setGs(g => G.signPlayer(g, id))}
          onSell={id => setGs(g => G.sellPlayer(g, id))}
          onBack={() => {
            if (fromPreseason) { setFromPreseason(false); setGs(G.backToPreseason(gs)); }
            else setGs(G.backToHub(gs));
          }} />
      )}
      {gs.phase === 'hub' && gs.notices.length > 0 && (
        <NoticeScreen gs={gs}
          onDismiss={() => setGs(g => G.dismissNotice(g))}
          onSquad={() => { setSquadFromHub(true); setGs(g => G.openSquad(G.dismissNotice(g))); }}
          onYouth={() => setGs(g => G.openYouth(G.dismissNotice(g)))}
          onTransfers={() => setGs(g => G.openTransfers(G.dismissNotice(g)))} />
      )}
      {gs.phase === 'hub' && gs.notices.length === 0 && (
        <Hub gs={gs}
          onStart={() => setGs(G.startWeek(gs))}
          onSquad={() => { setSquadFromHub(true); setGs(G.openSquad(gs)); }}
          onTransfers={() => setGs(G.openTransfers(gs))}
          onChronicle={() => setGs(G.openChronicle(gs))}
          onCaptain={() => setGs(G.openCaptain(gs))}
          onAssistant={() => setGs(G.openAssistant(gs))}
          onInbox={() => setGs(G.openInbox(gs))}
          onStadium={() => setGs(G.openStadium(gs))}
          onPacks={() => setGs(G.openPacks(gs))}
          onCoach={() => setGs(G.openCoach(gs))}
          onYouth={() => setGs(G.openYouth(gs))}
          onTable={() => setGs(G.openTable(gs))} />
      )}
      {gs.phase === 'youth' && (
        <YouthScreen gs={gs}
          onPromote={id => setGs(g => G.promoteYouth(g, id))}
          onRelease={id => setGs(g => G.releaseYouth(g, id))}
          onRegister={id => setGs(g => G.registerYouthEmergency(g, id))}
          onBack={() => setGs(G.backToHub(gs))} />
      )}
      {gs.phase === 'stadium' && (
        <StadiumScreen gs={gs}
          onBuild={key => setGs(g => G.startStadiumProject(g, key))}
          onBack={() => setGs(G.backToHub(gs))} />
      )}
      {gs.phase === 'coach' && (
        <CoachScreen gs={gs} onBack={() => setGs(G.backToHub(gs))} />
      )}
      {gs.phase === 'packs' && (
        <PacksScreen gs={gs}
          onWatchAd={() => { if (G.adsLeft(gs) > 0) setAd({ ad: pickAd(gs), key: Date.now() }); }}
          onBuy={id => setGs(g => G.buyPack(g, id))}
          onSign={() => setGs(g => G.signPull(g))}
          onSell={() => setGs(g => G.sellPull(g))}
          onBack={() => setGs(G.backToHub(gs))} />
      )}
      {gs.phase === 'inbox' && (
        <InboxScreen gs={gs}
          onAnswer={(item, opt) => setGs(g => G.answerInbox(g, item, opt))}
          onDismissOutcome={() => setGs(G.clearInboxOutcome(gs))}
          onBack={() => setGs(G.closeInbox(gs))} />
      )}
      {gs.phase === 'chronicle' && (
        <ChronicleScreen gs={gs} onBack={() => setGs(G.closeChronicle(gs))} />
      )}
      {gs.phase === 'captain' && (
        <CaptainScreen gs={gs} onSet={id => setGs(G.setCaptain(gs, id))} onBack={() => setGs(G.backToHub(gs))} />
      )}
      {gs.phase === 'assistant' && (
        <AssistantScreen gs={gs}
          onHire={() => setGs(G.hireAssistant(gs))}
          onFire={() => setGs(G.fireAssistant(gs))}
          onBack={() => setGs(G.backToHub(gs))} />
      )}
      {gs.phase === 'dilemma' && (
        <DilemmaChat gs={gs}
          onChoose={i => setGs(G.chooseDilemma(gs, i))}
          onContinue={() => setGs(G.toTactic(gs))} />
      )}
      {gs.phase === 'tactic' && (
        <TacticScreen gs={gs}
          onSet={t => setGs(G.setTactic(gs, t))}
          onGo={() => setGs({ ...gs, phase: 'vs' })} />
      )}
      {gs.phase === 'vs' && (
        <VsScreen gs={gs} onGo={() => setGs({ ...gs, phase: 'match' })} />
      )}
      {gs.phase === 'match' && (
        <MatchBroadcast gs={gs} onDone={result => setGs(G.commitRound(gs, result))} />
      )}
      {gs.phase === 'result' && <ResultScreen gs={gs} onContinue={() => setGs(G.continueFromResult(gs))} />}
      {gs.phase === 'press' && <PressScreen key={gs.press?.q.text} gs={gs} onAnswer={i => setGs(G.answerPress(gs, i))} />}
      {gs.phase === 'chat' && <ChatScreen gs={gs} onDone={() => setGs(G.closeChat(gs))} />}
      {installOpen && <InstallSheet onClose={() => setInstallOpen(false)} />}
      {exitOpen && <ExitSheet onStay={() => setExitOpen(false)} onLeave={() => { setExitOpen(false); leaveGame(); }} />}
      {ad && (
        <AdPlayer key={ad.key} ad={ad.ad} gems={gs.gems} left={G.adsLeft(gs)} backRef={adBack}
          onComplete={() => setGs(g => G.watchAdForGem(g))}
          onClose={() => setAd(null)}
          onRetry={() => setAd({ ad: pickAd(gs), key: Date.now() })} />
      )}
      {gs.phase === 'invite' && (
        <InviteScreen gs={gs}
          onRedeem={code => {
            const r = G.redeemThanks(gs, code);
            if (r.ok) setGs(r.gs);
            return { ok: r.ok, message: r.message };
          }}
          onBack={() => setGs(G.closeInvite(gs))} />
      )}
      {gs.phase === 'table' && <StandingsScreen gs={gs} onBack={() => setGs(G.closeTable(gs))} />}
      {gs.phase === 'season-end' && <SeasonEnd gs={gs} onContinue={() => setGs(G.startNextSeason(gs))} />}
      {gs.phase === 'ultimatum' && <UltimatumScreen gs={gs} onGo={() => setGs(G.advancePastPress(gs))} />}
      {gs.phase === 'sacked' && <SackedScreen gs={gs} onNext={() => setGs({ ...gs, phase: 'rescue' })} />}
      {gs.phase === 'rescue' && <RescueScreen gs={gs} onTake={() => setGs(G.takeRescue(gs))} onWalkAway={startNew} />}
      {gs.phase === 'kit' && <KitReveal gs={gs} onDone={() => setGs(G.closeKitReveal(gs))} />}
      {gs.phase === 'sponsor' && <SponsorScreen gs={gs} onPick={id => setGs(G.takeSponsor(gs, id))} />}
      {gs.phase === 'preseason' && <PreSeasonScreen gs={gs} onStart={() => setGs(G.enterPreseason(gs))} />}

      {/* the first-week explainer, owed by the save rather than by a click: it
          used to hang off the step out of the summer, and the sponsor screen
          added between the two meant it never showed again */}
      {G.tutorialDue(gs) && <Tutorial onDone={() => setGs(g => G.markTutorialSeen(g))} />}
    </div>
  );
}

