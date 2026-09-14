/**
 * Live match engine. Unlike simulateMatch, this advances the game minute by
 * minute from the CURRENT state, so the player's live decisions actually change
 * what happens next: substitutions, tactical shifts, and shot choices all feed
 * back into the simulation going forward.
 *
 * It reuses the calibrated ratings model from matchEngine, so the underlying
 * numbers stay the same, the difference is that the player is in the loop.
 *
 * State is held in a ref by the UI and mutated in place, which keeps the
 * per-minute loop cheap. Determinism is best effort (seed + a counter); once the
 * user makes a choice the match is theirs, not a fixed replay.
 */

import { createRng, teamRatings, overall } from '../engine/matchEngine.ts';
import type { Player, Approach, Press, MatchResult, MatchEvent, TeamInput } from '../engine/matchEngine.ts';
import { assignTraits } from '../data/personalities.ts';
import { DEFAULT_FORMATION, formationForClub, formation, fillFormation, FORMATIONS } from '../data/formations.ts';
import type { FormationId } from '../data/formations.ts';
import { playerMods, teamMoraleBump } from './traitEffects.ts';
import type { PlayerMods } from './traitEffects.ts';

export type Corner = 'left' | 'center' | 'right';

/** The player's live tactic: shape, approach, press, plus the in match shout. */
export type TacticMode = 'normal' | 'allin' | 'highpress';
export interface SimpleTactic { approach: Approach; press: Press; formation?: FormationId; mode?: TacticMode; }

/**
 * The in match tactic shout, applied ONLY in the live engine, never in the
 * calibrated simulateMatch that runs the rest of the league. It layers on top
 * of the approach and press mods, so a choice actually swings the game.
 *   allin      three up top, you create far more but the back is wide open
 *   highpress  a high line and a high press, you strangle them, at your own risk
 */
const MODE_MOD: Record<TacticMode, { att: number; def: number }> = {
  normal:    { att: 1.00, def: 1.00 },
  allin:     { att: 1.15, def: 0.83 },   // the wild gamble, goals fly both ways
  highpress: { att: 1.13, def: 0.96 },   // dominate them, the bill is paid in fitness
};

export interface Side {
  id: string;
  name: string;
  isHome: boolean;
  onPitch: Player[];   // 11, fitness decays as the match wears on
  bench: Player[];
  tactic: SimpleTactic;
  isPlayer: boolean;
  /** what the manager is worth to this side, only set for the player's team */
  coach?: { chemistry: number; att: number; def: number; cards: number };
}

export type MomentKind =
  | 'penalty' | 'shot' | 'one_on_one' | 'tactic' | 'free_kick'
  | 'def_keeper' | 'def_tackle' | 'def_penalty';   // defending is a decision too

export interface MomentOption { id: string; label: string; hint?: string; }

export interface Moment {
  kind: MomentKind;
  minute: number;
  title: string;
  subtitle: string;
  shooterId?: string;
  shooterName?: string;
  keeperDir?: Corner;
  /**
   * How good the chance actually was, 0..1. Every outcome is scaled by it, so a
   * scruffy half chance and a golden one no longer convert identically. Without
   * this the thresholds could not be lowered without inflating the scoreline,
   * because a rubbish chance handed over as a decision paid out like a clear one.
   */
  q?: number;
  options?: MomentOption[];
}

export interface LiveEvent {
  minute: number;
  type: MatchEvent['type'] | 'sub' | 'tactic' | 'ambient';
  teamId: string;
  text: string;
  playerId?: string;
  playerName?: string;
  /** who supplied the goal, counted into the assists chart */
  assistId?: string;
  assistName?: string;
  big?: boolean;   // goals, flashed
}

export interface LiveState {
  seed: number;
  rc: number;
  minute: number;
  addedTime: number;
  phase: 'play' | 'moment' | 'halftime' | 'done';
  halfTimeDone: boolean;
  home: Side;
  away: Side;
  iAmHome: boolean;
  score: [number, number];
  possession: number;     // home share 0..1
  shots: [number, number];
  xg: [number, number];
  events: LiveEvent[];
  subsUsed: number;
  /** the owner's boy, promised a half: he comes on at the break whatever the score */
  guestId?: string | null;
  /** the half-time shape change, kept so the reporter can ask about it */
  shape?: { to: string; atHalf: [number, number] };
  tacticOffered: boolean;
  pending: Moment | null;
  /** small personality effects, keyed by player id, see traitEffects.ts */
  mods: Map<string, PlayerMods>;
}

export const MAX_SUBS = 3;

const SHOOTER_W: Record<string, number> = {
  ST: 0.42, LW: 0.14, RW: 0.14, CAM: 0.12, CM: 0.08, CDM: 0.02, LB: 0.02, RB: 0.02, CB: 0.02, GK: 0,
};

/* -------------------------------------------------------------------- rng */

function rand(st: LiveState): number {
  st.rc += 1;
  return createRng(st.seed + st.rc * 2654435761)();
}

/* ---------------------------------------------------------------- helpers */

function sideRatings(s: Side) {
  const ti: TeamInput = {
    id: s.id, name: s.name, players: s.onPitch,
    tactic: { formation: s.tactic.formation ?? DEFAULT_FORMATION, approach: s.tactic.approach, press: s.tactic.press },
    // the manager on the touchline counts here too. Without this the coach
    // would only shape the AI's matches and never the one you actually watch
    chemistry: s.coach?.chemistry ?? 0.7,
    coach: s.coach ? { att: s.coach.att, def: s.coach.def } : undefined,
    isHome: s.isHome,
  };
  const r = teamRatings(ti);
  const m = MODE_MOD[s.tactic.mode ?? 'normal'];   // the live only shout layer
  return { ...r, att: r.att * m.att, def: r.def * m.def };
}

function playerSide(st: LiveState): Side { return st.iAmHome ? st.home : st.away; }
function oppSide(st: LiveState): Side { return st.iAmHome ? st.away : st.home; }

function pickShooter(s: Side, st: LiveState): Player {
  const outfield = s.onPitch.filter(p => p.position !== 'GK');
  const weights = outfield.map(p => SHOOTER_W[p.position] ?? 0.05);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand(st) * total;
  for (let i = 0; i < outfield.length; i++) { r -= weights[i]; if (r <= 0) return outfield[i]; }
  return outfield[outfield.length - 1];
}

/** Our keeper's name, for a screen that needs it before he is asked to dive. */
export function playerKeeperName(st: LiveState): string {
  return playerSide(st).onPitch.find(p => p.position === 'GK')?.name ?? 'השוער';
}

function keeperOvr(s: Side): number {
  const gk = s.onPitch.find(p => p.position === 'GK');
  return gk ? overall(gk) : 55;
}

function keeperDir(st: LiveState): Corner {
  const r = rand(st);
  return r < 0.34 ? 'left' : r < 0.67 ? 'center' : 'right';
}

/**
 * Where the keeper ACTUALLY dives. The scouting hint is his tendency, not a
 * tell: he goes that way about 60% of the time and guesses elsewhere the rest.
 * That turns picking a corner into a read with real risk, not a free goal.
 */
function actualDive(st: LiveState, hint: Corner): Corner {
  if (rand(st) < 0.6) return hint;
  const others = (['left', 'center', 'right'] as Corner[]).filter(c => c !== hint);
  return others[Math.floor(rand(st) * others.length)];
}

/* ------------------------------------------------------------------- init */

export function createLive(input: {
  seed: number;
  homeId: string; homeName: string;
  awayId: string; awayName: string;
  iAmHome: boolean;
  playerStarters: Player[]; playerBench: Player[]; playerTactic: SimpleTactic;
  oppStarters: Player[]; oppBench: Player[];
  moraleBias: number;
  captainId?: string | null;
  /** the owner's boy on the bench, to come on at half time */
  guestId?: string | null;
  /** what the manager brings, applied to the player's side only */
  coach?: { chemistry: number; att: number; def: number; cards: number };
}): LiveState {
  const clone = (p: Player): Player => ({ ...p, attrs: { ...p.attrs } });
  const pStarters = input.playerStarters.map(clone);
  // player morale nudges the on-pitch squad, same as the old engine did
  pStarters.forEach(p => { p.morale = Math.max(0, Math.min(100, p.morale + input.moraleBias * 20)); });

  const mods = new Map<string, PlayerMods>();
  const pBench = input.playerBench.map(clone);
  const oStarters = input.oppStarters.map(clone);
  const oBench = input.oppBench.map(clone);
  // personality touches the match, but only a little, and only here
  applySquadTraits(pStarters, pBench, mods);
  applySquadTraits(oStarters, oBench, mods);

  // the captain on the pitch lifts the room a touch, a small edge only
  if (input.captainId && pStarters.some(p => p.id === input.captainId)) {
    for (const p of pStarters) p.morale = Math.max(0, Math.min(100, p.morale + 2));
  }

  const playerSideObj: Side = {
    id: input.iAmHome ? input.homeId : input.awayId,
    name: input.iAmHome ? input.homeName : input.awayName,
    isHome: input.iAmHome, isPlayer: true,
    onPitch: pStarters, bench: pBench, tactic: input.playerTactic,
    coach: input.coach,
  };
  const oppSideObj: Side = {
    id: input.iAmHome ? input.awayId : input.homeId,
    name: input.iAmHome ? input.awayName : input.homeName,
    isHome: !input.iAmHome, isPlayer: false,
    onPitch: oStarters, bench: oBench,
    tactic: { approach: 'balanced', press: 'mid', formation: formationForClub(input.iAmHome ? input.awayId : input.homeId) },
  };

  const st: LiveState = {
    seed: input.seed, rc: 0, minute: 0, addedTime: 0, phase: 'play',
    home: input.iAmHome ? playerSideObj : oppSideObj,
    away: input.iAmHome ? oppSideObj : playerSideObj,
    iAmHome: input.iAmHome,
    halfTimeDone: false,
    score: [0, 0], possession: 0.5, shots: [0, 0], xg: [0, 0],
    events: [], subsUsed: 0, tacticOffered: false, pending: null, guestId: input.guestId ?? null,
    mods,
  };
  st.addedTime = 2 + Math.floor(rand(st) * 4);
  return st;
}

/**
 * Assign personalities across a squad and fold their small match effects in:
 * a fitness nudge at kickoff per player, and a capped morale bump for the XI.
 * Records each player's live modifiers into `mods` for the rest of the match.
 */
function applySquadTraits(starters: Player[], bench: Player[], mods: Map<string, PlayerMods>) {
  const tmap = assignTraits([...starters, ...bench]);
  for (const p of [...starters, ...bench]) {
    const pm = playerMods(tmap.get(p.id) ?? []);
    mods.set(p.id, pm);
    p.fitness = Math.max(40, Math.min(100, p.fitness + pm.fitnessStart));
  }
  const bump = teamMoraleBump(starters.map(p => tmap.get(p.id) ?? []));
  if (bump) for (const p of starters) p.morale = Math.max(0, Math.min(100, p.morale + bump));
}

/* ------------------------------------------------------------------- step */

function applyFatigue(st: LiveState) {
  for (const s of [st.home, st.away]) {
    // tuned so a starting XI is visibly gassed by the last half hour,
    // which is what makes a substitution a real decision and not a hidden button
    const modeDrain = s.tactic.mode === 'highpress' ? 0.12 : s.tactic.mode === 'allin' ? 0.06 : 0;
    const drain = 0.34 + (s.tactic.press === 'high' ? 0.24 : s.tactic.press === 'low' ? 0.06 : 0.13) + modeDrain;
    for (const p of s.onPitch) {
      const mul = st.mods.get(p.id)?.fatigueMul ?? 1;
      p.fitness = Math.max(40, p.fitness - drain * mul);
    }
  }
}

function sideIndex(st: LiveState, s: Side): 0 | 1 { return s === st.home ? 0 : 1; }

function commentGoal(st: LiveState, scorer: string): string {
  const lines = [
    `שער! ${scorer} קורע את הרשת`,
    `גוווול של ${scorer}!`,
    `${scorer} מבקיע, היציע רועד`,
  ];
  return lines[Math.floor(rand(st) * lines.length)];
}

/**
 * The line above which a chance becomes YOUR call.
 *
 * Itzik's rule, and the one the whole match now obeys: a goal never happens
 * without the manager having made a decision. So anything that could possibly
 * end in the net is handed over, and anything below these lines can never score
 * at all, it is a half chance that goes wide or is claimed, and it exists to
 * give the ticker and the pitch something to say.
 *
 * Lower thresholds mean more calls and more goals, so these two numbers are
 * what the scoreline is tuned on. scripts/goal-origin.mts is the check.
 */
const ATT_MOMENT = 0.13;    // your attack becomes a decision above this
const DEF_MOMENT = 0.13;    // their attack becomes a decision above this

/**
 * Penalties, per match, at each end.
 *
 * One penalty roughly every three matches, which is about what real football
 * gives you (0.27 a game across both sides) and rare enough that the whistle
 * still makes the room go quiet. Split so it goes your way a little more often
 * than against you, because a manager should feel his own attack earning them.
 *
 * These are rolled on their own, BEFORE the chance gate at either end, so the
 * rate is a rate and not a by-product of how much football is being played.
 * Measured over simulated seasons rather than trusted to this arithmetic.
 */
const PEN_FOR = 0.222;
const PEN_AGAINST = 0.128;

/**
 * What the chance was worth, as a multiplier on whatever the decision pays out.
 * Calibrated so a chance at the old handover line (about 0.36) is worth roughly
 * what it always was, and everything scruffier than that is worth less.
 */
function edge(q: number | undefined): number {
  return Math.max(0.42, Math.min(1.55, 0.42 + (q ?? 0.36) * 1.55));
}

/** Half chances, which never score. Flavour, so the match still breathes. */
const NEAR_MISS = [
  (n: string) => `${n} מנסה מרחוק, הכדור חולף מעל המשקוף`,
  (n: string) => `${n} בעט, השוער קופץ ומרחיק`,
  (n: string) => `${n} מצא רגע, אבל הבלם נשכב על הכדור`,
  (n: string) => `${n} מסובב אחת, יוצא מעט לצד`,
];
function nearMiss(st: LiveState, name: string): string {
  return NEAR_MISS[Math.floor(rand(st) * NEAR_MISS.length)](name);
}

/** A defender by preference, for the tackle moment. */
function pickDefender(s: Side): Player {
  return s.onPitch.find(p => p.position === 'CB')
    ?? s.onPitch.find(p => ['LB', 'RB', 'CDM'].includes(p.position))
    ?? s.onPitch.find(p => p.position !== 'GK')
    ?? s.onPitch[0];
}

/**
 * The opponent's attack. A half chance resolves on its own like before, but a
 * CLEAR one is handed to you as a defensive decision: come out on the striker,
 * or throw yourself into a tackle. This is what makes defending active dread
 * instead of a number moving on its own.
 */
function oppChance(st: LiveState, possNorm: number) {
  const atk = oppSide(st), def = playerSide(st);
  const ra = sideRatings(atk), rd = sideRatings(def);

  // A penalty against you is not a chance that has to fight its way through the
  // gate below: it is awarded, and from that second the only thing left in the
  // world is which way you send your keeper. Rolled first and on its own.
  if (rand(st) < PEN_AGAINST / 90) {
    const taker = pickShooter(atk, st);
    const gk = def.onPitch.find(p => p.position === 'GK');
    st.phase = 'moment';
    st.pending = {
      kind: 'def_penalty', minute: st.minute, shooterId: taker.id, shooterName: taker.name,
      // the hidden corner, which at this end is where the TAKER is going
      keeperDir: keeperDir(st),
      title: 'פנדל נגדנו!',
      subtitle: `${taker.name} מניח את הכדור מול ${gk?.name ?? 'השוער שלך'}`,
    };
    return;
  }

  const lambda = 4.9 * Math.pow(ra.att / rd.def, 1.9) * (0.7 + 0.6 * possNorm);
  if (rand(st) >= lambda / 90) return;

  const qMul = Math.min(1.35, Math.pow(ra.att / rd.def, 0.8));
  const q = Math.min(0.9, (0.03 + 0.7 * Math.pow(rand(st), 2.2)) * qMul);
  const striker = pickShooter(atk, st);
  const idx = sideIndex(st, atk);
  st.shots[idx]++; st.xg[idx] += q;

  // A dangerous chance is ALWAYS yours to defend. It used to slip past you 28%
  // of the time and settle itself, which is a goal conceded with nobody asked.
  if (q > DEF_MOMENT) {
    st.phase = 'moment';
    if (rand(st) < 0.5) {
      const gk = def.onPitch.find(p => p.position === 'GK');
      st.pending = {
        kind: 'def_keeper', minute: st.minute, q, shooterId: striker.id, shooterName: striker.name,
        title: 'הם לבד מול השוער!', subtitle: `${striker.name} בורח מ${gk?.name ?? 'השוער שלך'}`,
        options: [
          { id: 'rush', label: 'לצאת אליו', hint: 'מצמצם זווית, סוגר אפשרות לסיומת אבל חשוף להקפצה מעל השוער' },
          { id: 'stay', label: 'להישאר על הקו', hint: 'מוכן לבעיטה, פחות טוב מול כדרור' },
        ],
      };
    } else {
      const cb = pickDefender(def);
      st.pending = {
        kind: 'def_tackle', minute: st.minute, q, shooterId: striker.id, shooterName: striker.name,
        title: 'חדירה מסוכנת!', subtitle: `${striker.name} משתחרר מול ${cb.name}`,
        options: [
          { id: 'slide', label: 'גליץ׳', hint: 'אם תזכה בכדור מושלם, אם תפספס עבירה או שהם בפנים' },
          { id: 'contain', label: 'להישאר על הרגליים', hint: 'בטוח מול אחד, אבל אם יצטרף תוקף זה 2 על 1' },
        ],
      };
    }
    return;
  }

  // Below the line it is a half chance and it CANNOT score. It gets a line on
  // the ticker so the match still breathes, and the pitch acts it out, but the
  // scoreboard never moves without you.
  if (q > 0.05 && rand(st) < 0.72) {
    st.events.push({
      minute: st.minute, type: 'chance', teamId: atk.id, playerName: striker.name,
      text: rand(st) < 0.5 ? nearMiss(st, striker.name) : `${striker.name} מנסה, ${keeperName(def)} מרחיק לקרן`,
    });
  }
}

function keeperName(s: Side): string {
  return s.onPitch.find(p => p.position === 'GK')?.name ?? 'השוער';
}

/** The player's attacking chance, which may hand control to the user. */
function playerChance(st: LiveState) {
  const atk = playerSide(st), def = oppSide(st);
  const ra = sideRatings(atk), rd = sideRatings(def);
  const possNorm = playerPossNorm(st);
  const lambda = 4.9 * Math.pow(ra.att / rd.def, 1.9) * (0.7 + 0.6 * possNorm);

  // penalty, rare
  if (rand(st) < PEN_FOR / 90) {
    const taker = pickShooter(atk, st);
    st.phase = 'moment';
    st.pending = { kind: 'penalty', minute: st.minute, shooterId: taker.id, shooterName: taker.name, keeperDir: keeperDir(st), title: 'פנדל!', subtitle: `${taker.name} על הכדור` };
    return;
  }

  // free kick from distance, a real decision but not a gift
  if (rand(st) < 0.95 / 90) {
    const taker = pickShooter(atk, st);
    st.phase = 'moment';
    st.pending = { kind: 'free_kick', minute: st.minute, shooterId: taker.id, shooterName: taker.name, keeperDir: keeperDir(st), title: 'בעיטה חופשית', subtitle: `${taker.name} מסדר את הכדור מול החומה` };
    return;
  }

  if (rand(st) >= lambda / 90) return;

  const qMul = Math.min(1.35, Math.pow(ra.att / rd.def, 0.8));
  const q = Math.min(0.9, (0.03 + 0.7 * Math.pow(rand(st), 2.2)) * qMul);
  const shooter = pickShooter(atk, st);
  const idx = sideIndex(st, atk);
  st.shots[idx]++; st.xg[idx] += q;

  if (q > 0.58) {
    // one on one, a real decision
    st.phase = 'moment';
    st.pending = {
      kind: 'one_on_one', minute: st.minute, q, shooterId: shooter.id, shooterName: shooter.name,
      title: 'אחד על אחד!', subtitle: `${shooter.name} מול השוער לבד`,
      options: [
        { id: 'dribble', label: 'לעבור את השוער', hint: 'דורש כדרור, אבל אז השער ריק מולו' },
        { id: 'finish', label: 'סיומת לפינה', hint: 'בעיטה מיידית, תלוי בסיומת שלו' },
      ],
    };
    return;
  }
  if (q > ATT_MOMENT) {
    // clear chance, pick your corner
    st.phase = 'moment';
    st.pending = {
      kind: 'shot', minute: st.minute, q, shooterId: shooter.id, shooterName: shooter.name,
      keeperDir: keeperDir(st), title: 'הזדמנות!', subtitle: `${shooter.name} משתחרר לבעיטה`,
    };
    return;
  }

  // A half chance, and it CANNOT score. This is where goals used to appear out
  // of a quiet minute with nothing asked of you, which is the one thing a
  // manager should never see.
  if (q > 0.05 && rand(st) < 0.72) {
    st.events.push({
      minute: st.minute, type: 'chance', teamId: atk.id, playerName: shooter.name,
      text: nearMiss(st, shooter.name),
    });
  }
}

function playerPossNorm(st: LiveState): number {
  const rh = sideRatings(st.home), ra = sideRatings(st.away);
  let pHome = Math.pow(rh.mid, 1.6) / (Math.pow(rh.mid, 1.6) + Math.pow(ra.mid, 1.6));
  pHome = Math.max(0.28, Math.min(0.72, pHome));
  st.possession = pHome;
  const norm = (pHome - 0.28) / 0.44;
  return st.iAmHome ? norm : 1 - norm;
}

/**
 * How many bookings turn into a sending off.
 *
 * It used to be one in twenty, which came out at a red every five to seven
 * matches for your side — three or four times what real football does, and a
 * tester reported it as happening constantly. This is the share that puts it at
 * roughly one a season, which is what a sending off should feel like: the sort
 * of thing you remember, not the sort of thing you plan around.
 */
const RED_SHARE = 0.018;

/**
 * Send a man off, for real.
 *
 * This existed only as a line in the ticker: the game announced "אדום! X מורחק"
 * and then X carried on playing the other fifty minutes, because nothing ever
 * took him off the pitch. Four out of five red cards in the game were a caption
 * over nothing. Now he actually goes, and the side plays the rest of it short.
 *
 * A side already down to nine keeps its men. Football abandons a match at seven,
 * and a simulation that walks a team off the pitch one by one is not drama, it
 * is a bug with a whistle. Returns whether the sending off actually happened.
 */
function sendOff(s: Side, p: Player): boolean {
  if (s.onPitch.length <= 9) return false;
  const i = s.onPitch.findIndex(x => x.id === p.id);
  if (i < 0) return false;
  s.onPitch.splice(i, 1);
  return true;
}

function maybeDiscipline(st: LiveState) {
  for (const s of [st.home, st.away]) {
    if (rand(st) < 2.3 / 90) {
      const outs = s.onPitch.filter(p => p.position !== 'GK');
      // the card rate is unchanged, only WHO gets it leans to the hotheads
      const weights = outs.map(o => st.mods.get(o.id)?.cardProne ?? 1);
      const totalW = weights.reduce((a, b) => a + b, 0);
      let r = rand(st) * totalW;
      let p = outs[outs.length - 1];
      for (let i = 0; i < outs.length; i++) { r -= weights[i]; if (r <= 0) { p = outs[i]; break; } }
      // a hard coach keeps his players on the right side of the line
      const cardBias = (s.tactic.press === 'high' ? 1.3 : 1) * (s.coach?.cards ?? 1);
      if (rand(st) < RED_SHARE * cardBias && sendOff(s, p)) {
        st.events.push({ minute: st.minute, type: 'red', teamId: s.id, playerId: p.id, playerName: p.name, text: `אדום! ${p.name} מורחק`, big: true });
      } else {
        st.events.push({ minute: st.minute, type: 'yellow', teamId: s.id, playerName: p.name, text: `צהוב ל${p.name}` });
      }
    }
  }
}

/* ambient commentary, texture that fills the minutes without touching the score */
const AMBIENT_TEAM: ((t: string) => string)[] = [
  t => `קרן ל${t}, כולם עולים לרחבה`,
  t => `${t} מגלגלים את הכדור בסבלנות מאחור`,
  t => `כדור ארוך של ${t}, ההגנה מרחיקה בראש`,
  t => `בעיטה חופשית מהאגף ל${t}`,
  t => `הנפת דגל, נבדל נגד ${t}`,
  t => `${t} לוחצים גבוה, היריבה מתקשה לצאת`,
];
const AMBIENT_NEUTRAL = [
  'קרב עז בקישור, אף אחד לא מוותר על כדור',
  'השוער יוצא נמרץ ואוגרף בביטחון',
  'בעיטה מרחוק חולפת מעל המשקוף',
  'תיקול מציל ברגע האחרון על קו הרחבה',
  'היציע מתחיל לשיר, האווירה מתחממת',
  'הכדור יוצא לאאוט, רגע לנשום',
  'עצירה יפה של השוער, מרחיק לקרן',
  'המאמנים צועקים הוראות מהקווים',
  'חילופי מסירות מהירים באמצע המגרש',
  'תיקול קשה, השופט נותן להמשיך',
];

function ambientCommentary(st: LiveState) {
  if (rand(st) >= 0.3) return;
  if (rand(st) < 0.5) {
    // a line tied to whoever is on the ball right now
    const s = rand(st) < st.possession ? st.home : st.away;
    const line = AMBIENT_TEAM[Math.floor(rand(st) * AMBIENT_TEAM.length)];
    st.events.push({ minute: st.minute, type: 'ambient', teamId: s.id, text: line(s.name) });
  } else {
    const line = AMBIENT_NEUTRAL[Math.floor(rand(st) * AMBIENT_NEUTRAL.length)];
    st.events.push({ minute: st.minute, type: 'ambient', teamId: '', text: line });
  }
}

/** Offer a tactical decision once, when the player is chasing the game late. */
function maybeTacticMoment(st: LiveState) {
  if (st.tacticOffered || st.minute < 62 || st.minute > 82) return;
  const idx = st.iAmHome ? 0 : 1;
  const behind = st.score[idx] < st.score[1 - idx];
  if (!behind) return;
  st.tacticOffered = true;
  st.phase = 'moment';
  st.pending = {
    kind: 'tactic', minute: st.minute,
    title: 'אתה בפיגור', subtitle: 'הקהל דורש שתעשה משהו. מה ההוראה?',
    options: [
      { id: 'attack', label: 'אול אין, מצב התקפה', hint: 'שלושה חלוצים, יותר מצבים אבל נפתחים מאחור' },
      { id: 'balanced', label: 'לשמור על הראש', hint: 'ממשיכים באותו קצב, בלי פאניקה' },
      { id: 'press', label: 'לחץ גבוה, קו הגנה גבוה', hint: 'פוגע בכושר, אבל סיכוי גבוה יותר להכניע אותם' },
    ],
  };
}

/** Advance one minute. If it sets st.pending, the UI pauses for the user. */
export function step(st: LiveState) {
  if (st.phase !== 'play') return;
  const fullTime = 90 + st.addedTime;
  if (st.minute >= fullTime) { st.phase = 'done'; return; }

  st.minute += 1;

  // the whistle for half time, the match stops and the dressing room waits
  if (!st.halfTimeDone && st.minute >= 45) {
    st.halfTimeDone = true;
    st.phase = 'halftime';
    st.events.push({ minute: 45, type: 'tactic', teamId: '', text: 'שריקת המחצית' });
    return;
  }

  applyFatigue(st);
  const possNorm = playerPossNorm(st);

  // opponent attacks first, and a clear chance becomes YOUR decision to defend
  oppChance(st, st.iAmHome ? 1 - possNorm : possNorm);
  if (st.phase !== 'play') return;

  // the player's attack, may pause for a decision
  playerChance(st);
  if (st.phase !== 'play') return;

  maybeTacticMoment(st);
  if (st.phase !== 'play') return;

  maybeDiscipline(st);
  ambientCommentary(st);

  if (st.minute >= fullTime) st.phase = 'done';
}

/* --------------------------------------------------------------- resolving */

/**
 * Who laid the goal on. Open play goals usually come from a pass, set pieces
 * and penalties never do, so the assists chart stays honest.
 */
function pickAssister(st: LiveState, scorerId: string, solo: boolean): Player | null {
  if (solo || rand(st) < 0.3) return null;
  const mates = playerSide(st).onPitch.filter(p => p.id !== scorerId && p.position !== 'GK');
  if (!mates.length) return null;
  const w = mates.map(p => (['CM', 'CAM', 'CDM', 'DM', 'AM', 'LM', 'RM'].includes(p.position) ? 0.5
    : ['ST', 'CF', 'SS', 'LW', 'RW'].includes(p.position) ? 0.35 : 0.15));
  const total = w.reduce((a, b) => a + b, 0);
  let r = rand(st) * total;
  for (let i = 0; i < mates.length; i++) { r -= w[i]; if (r <= 0) return mates[i]; }
  return mates[mates.length - 1];
}

function scoreForPlayer(st: LiveState, scorerId: string, scorerName: string, text: string, solo = false) {
  const idx = st.iAmHome ? 0 : 1;
  st.score[idx]++;
  const a = pickAssister(st, scorerId, solo);
  st.events.push({
    minute: st.minute, type: 'goal', teamId: playerSide(st).id,
    playerId: scorerId, playerName: scorerName,
    assistId: a?.id, assistName: a?.name,
    text, big: true,
  });
}

/** The opponent scores on you, from a defensive moment you lost. */
function concede(st: LiveState, scorerName: string, text: string) {
  const idx = st.iAmHome ? 1 : 0;
  st.score[idx]++;
  st.events.push({ minute: st.minute, type: 'goal', teamId: oppSide(st).id, playerName: scorerName, text, big: true });
}

/* ------------------------------------------------------------ defending */

/**
 * A penalty against you. You do not kick it, you only choose where your keeper
 * goes, which is the whole of the job from the touchline: one guess, no way to
 * take it back, and a crowd watching you make it.
 *
 * Guessing right is most of a save but not all of it — a good keeper gets a
 * hand to one he read wrong, and a poor one lets in some he read right. Over a
 * random aim that lands around a fifth saved, which is what penalties are.
 *
 * Returns whether it was kept out, and the corner the ball actually went to, so
 * the screen can show where it ended up rather than where you sent the keeper.
 */
export interface DefPenaltyOutcome { saved: boolean; aim: Corner; }
export function resolveDefPenalty(st: LiveState, dive: Corner): DefPenaltyOutcome {
  const m = st.pending!;
  const aim = actualDive(st, m.keeperDir!);
  const gk = playerSide(st).onPitch.find(p => p.position === 'GK');
  const gkq = gk ? overall(gk) : 55;
  const right = dive === aim;
  const saved = rand(st) < (right
    ? 0.55 + (gkq - 60) / 250
    : 0.06 + (gkq - 60) / 500);

  const idx = st.iAmHome ? 1 : 0;   // it is their shot and their expected goal
  st.shots[idx]++; st.xg[idx] += 0.76;

  if (saved) {
    st.events.push({
      minute: st.minute, type: 'penalty_miss', teamId: oppSide(st).id, playerName: m.shooterName,
      text: right
        ? `${gk?.name ?? 'השוער'} הלך לפינה הנכונה ועצר פנדל!`
        : `${gk?.name ?? 'השוער'} הלך לצד השני והספיק להחזיר יד. איזו הצלה!`,
      big: true,
    });
  } else {
    concede(st, m.shooterName!, `פנדל. ${m.shooterName} כובש מ-11 מטר`);
  }
  clearMoment(st);
  return { saved, aim };
}

export type DefKeeperOutcome = 'rush-save' | 'rush-goal' | 'stay-save' | 'stay-goal';
export function resolveDefKeeper(st: LiveState, optionId: string): DefKeeperOutcome {
  const m = st.pending!;
  const striker = oppSide(st).onPitch.find(p => p.id === m.shooterId);
  const shooting = striker?.attrs.shooting ?? 60;
  const dribbling = striker?.attrs.dribbling ?? 60;
  const gk = playerSide(st).onPitch.find(p => p.position === 'GK');
  const gkq = gk ? overall(gk) : 55;
  const isRush = optionId === 'rush';

  // rushing narrows the angle, superb against a finisher but exposed to a dribble;
  // staying keeps you set for a shot but a clever striker rounds you
  const save = isRush
    ? 0.48 + (gkq - 60) / 200 - (dribbling - 60) / 150
    : 0.34 + (gkq - 60) / 200 - (shooting - 60) / 190;
  // the better the chance they got into, the less the keeper can do about it
  const p = Math.max(0.10, Math.min(0.94, save / edge(m.q)));
  const saved = rand(st) < p;

  if (saved) {
    st.events.push({ minute: st.minute, type: 'chance', teamId: playerSide(st).id, playerName: gk?.name,
      text: isRush ? `${gk?.name ?? 'השוער'} יוצא בזמן ומטיל את גופו, הצלה ענקית!` : `${gk?.name ?? 'השוער'} עומד גדול על הקו ועוצר!` });
  } else {
    concede(st, m.shooterName!, isRush
      ? `${m.shooterName} מעגל את השוער שיצא ומכניס לשער ריק`
      : `${m.shooterName} מוצא את הפינה, אין לשוער סיכוי`);
  }
  clearMoment(st);
  return isRush
    ? (saved ? 'rush-save' : 'rush-goal')
    : (saved ? 'stay-save' : 'stay-goal');
}

export type DefTackleOutcome = 'slide-clear' | 'slide-yellow' | 'slide-red' | 'slide-beaten' | 'hold-contain' | 'hold-2v1';
export function resolveDefTackle(st: LiveState, optionId: string): DefTackleOutcome {
  const m = st.pending!;
  const striker = oppSide(st).onPitch.find(p => p.id === m.shooterId);
  const dribbling = striker?.attrs.dribbling ?? 60;
  const cb = pickDefender(playerSide(st));
  const defending = cb.attrs.defending;
  let outcome: DefTackleOutcome;

  if (optionId === 'slide') {
    const win = Math.max(0.15, Math.min(0.85, 0.44 + (defending - 60) / 150 - (dribbling - 60) / 150));
    if (rand(st) < win) {
      st.events.push({ minute: st.minute, type: 'chance', teamId: playerSide(st).id, playerName: cb.name,
        text: `${cb.name} עם גליץ׳ מושלם, מנקה את הכדור לקרן!` });
      outcome = 'slide-clear';
    } else if (rand(st) < 0.28) {
      // mistimed: a foul, and sometimes the last man walks. A tactical foul on a
      // clear run is a straight red far more often than a routine booking is,
      // so this stays well above the general share below
      const red = rand(st) < 0.13 && sendOff(playerSide(st), cb);
      st.events.push({ minute: st.minute, type: red ? 'red' : 'yellow', teamId: playerSide(st).id, playerName: cb.name,
        text: red ? `אדום! ${cb.name} עוצר אותו בעבירה טקטית ומורחק` : `צהוב, ${cb.name} מפיל אותו ועוצר את ההתקפה`, big: red });
      outcome = red ? 'slide-red' : 'slide-yellow';
    } else {
      // beaten: they are through
      if (rand(st) < 0.8 * edge(m.q)) concede(st, m.shooterName!, `${m.shooterName} עובר את ${cb.name} ומבקיע`);
      else st.events.push({ minute: st.minute, type: 'chance', teamId: oppSide(st).id, playerName: m.shooterName, text: `${m.shooterName} עבר את הבלם אבל בעט החוצה` });
      outcome = 'slide-beaten';
    }
  } else {
    // contain: you hold the ball carrier up. Safe against a lone striker, but a
    // patient one waits for a runner, and suddenly it is two on one on you.
    const oppAtk = sideRatings(oppSide(st)).att;
    const p2v1 = Math.max(0.16, Math.min(0.55, 0.2 + (oppAtk - 60) / 130));
    if (rand(st) < p2v1) {
      const mates = oppSide(st).onPitch.filter(p => p.id !== m.shooterId && p.position !== 'GK');
      const mate = mates[Math.floor(rand(st) * mates.length)] ?? striker!;
      if (rand(st) < 0.64 * edge(m.q)) concede(st, mate.name, `2 על 1! ${m.shooterName} מחכה, ${mate.name} מצטרף ומגמר`);
      else st.events.push({ minute: st.minute, type: 'chance', teamId: oppSide(st).id, playerName: mate.name, text: `2 על 1! ${mate.name} קיבל מסירה אבל בעט לצד` });
      outcome = 'hold-2v1';
    } else {
      st.events.push({ minute: st.minute, type: 'chance', teamId: playerSide(st).id, playerName: cb.name, text: `${cb.name} מעכב יפה, אין למי למסור והכדור אבד להם` });
      outcome = 'hold-contain';
    }
  }
  clearMoment(st);
  return outcome;
}

export type ShotOutcome = 'goal' | 'save' | 'wide';
export function resolveShot(st: LiveState, pick: Corner): ShotOutcome {
  const m = st.pending!;
  const beats = pick !== actualDive(st, m.keeperDir!);
  const scored = rand(st) < (beats ? 0.42 : 0.12) * edge(m.q);
  let outcome: ShotOutcome;
  if (scored) { scoreForPlayer(st, m.shooterId!, m.shooterName!, `${m.shooterName} מנצח את השוער וכובש!`); outcome = 'goal'; }
  else if (beats) { st.events.push({ minute: st.minute, type: 'chance', teamId: playerSide(st).id, playerName: m.shooterName, text: `${m.shooterName} כיוון טוב, אבל זה יוצא מעט לצד` }); outcome = 'wide'; }
  else { st.events.push({ minute: st.minute, type: 'chance', teamId: playerSide(st).id, playerName: m.shooterName, text: `${m.shooterName} בעט, השוער ניחש נכון ועוצר` }); outcome = 'save'; }
  clearMoment(st);
  return outcome;
}

export type FreeKickOutcome = 'goal' | 'save' | 'wall';
export function resolveFreeKick(st: LiveState, pick: Corner): FreeKickOutcome {
  const m = st.pending!;
  const idx = st.iAmHome ? 0 : 1;
  st.shots[idx]++; st.xg[idx] += 0.09;
  // free kicks are genuinely hard: even outguessing the keeper it has to clear the wall
  const beats = pick !== actualDive(st, m.keeperDir!);
  const scored = beats ? rand(st) < 0.3 : rand(st) < 0.08;
  let outcome: FreeKickOutcome;
  if (scored) { scoreForPlayer(st, m.shooterId!, m.shooterName!, `בעיטה חופשית מדהימה! ${m.shooterName} מסובב אותה מעל החומה`, true); outcome = 'goal'; }
  else if (beats) { st.events.push({ minute: st.minute, type: 'chance', teamId: playerSide(st).id, playerName: m.shooterName, text: `${m.shooterName} כיוון לפינה, השוער עף והודף את הכדור` }); outcome = 'save'; }
  else { st.events.push({ minute: st.minute, type: 'chance', teamId: playerSide(st).id, playerName: m.shooterName, text: `${m.shooterName} בעט, הכדור פוגע בחומה` }); outcome = 'wall'; }
  clearMoment(st);
  return outcome;
}

export function resolvePenalty(st: LiveState, pick: Corner): boolean {
  const m = st.pending!;
  const beats = pick !== actualDive(st, m.keeperDir!);
  const scored = beats ? rand(st) < 0.85 : rand(st) < 0.25;
  const idx = st.iAmHome ? 0 : 1;
  st.xg[idx] += 0.76;
  if (scored) scoreForPlayer(st, m.shooterId!, m.shooterName!, `פנדל! ${m.shooterName} לא מפספס מ-11 מטר`, true);
  else st.events.push({ minute: st.minute, type: 'penalty_miss', teamId: playerSide(st).id, playerName: m.shooterName, text: `פנדל מבוזבז, ${m.shooterName} יזכור את זה` });
  clearMoment(st);
  return scored;
}

export type OneOnOneChoice = 'dribble' | 'finish';
export type OneOnOneOutcome = 'dribble-goal' | 'dribble-save' | 'finish-goal' | 'finish-miss';
export function resolveOneOnOne(st: LiveState, optionId: string): OneOnOneOutcome {
  const m = st.pending!;
  const shooter = playerSide(st).onPitch.find(p => p.id === m.shooterId);
  const isDribble = optionId === 'dribble';
  const skill = shooter ? (isDribble ? shooter.attrs.dribbling : shooter.attrs.shooting) : 60;
  const base = isDribble ? 0.34 : 0.31;
  const scored = rand(st) < (base + (skill - 60) / 200) * edge(m.q);
  if (scored) scoreForPlayer(st, m.shooterId!, m.shooterName!, isDribble ? `${m.shooterName} עובר את השוער ומכניס לשער ריק!` : `${m.shooterName} משגר בפס לפינה, אין לשוער סיכוי!`);
  else st.events.push({ minute: st.minute, type: 'chance', teamId: playerSide(st).id, playerName: m.shooterName, text: isDribble ? `${m.shooterName} ניסה לעבור אותו, השוער קרא את זה` : `${m.shooterName} בעט מעל השער, החמצה כואבת` });
  clearMoment(st);
  return isDribble
    ? (scored ? 'dribble-goal' : 'dribble-save')
    : (scored ? 'finish-goal' : 'finish-miss');
}

export function resolveTactic(st: LiveState, optionId: string) {
  const side = playerSide(st);
  let label: string;
  if (optionId === 'attack') {
    side.tactic = { ...side.tactic, approach: 'attacking', mode: 'allin' };
    label = 'אול אין, שלושה חלוצים למעלה';
  } else if (optionId === 'press') {
    side.tactic = { ...side.tactic, press: 'high', mode: 'highpress' };
    label = 'לחץ גבוה וקו הגנה גבוה';
  } else {
    side.tactic = { ...side.tactic, approach: 'balanced', mode: 'normal' };
    label = 'שומרים על הראש';
  }
  st.events.push({ minute: st.minute, type: 'tactic', teamId: side.id, text: `הוראה מהקווים, ${label}` });
  clearMoment(st);
}

function clearMoment(st: LiveState) {
  st.pending = null;
  const fullTime = 90 + st.addedTime;
  st.phase = st.minute >= fullTime ? 'done' : 'play';
}

/* ---------------------------------------------------------------- halftime */

export type TalkId = 'calm' | 'fire' | 'praise';

export interface TalkOption { id: TalkId; label: string; hint: string; }

export const TALKS: TalkOption[] = [
  { id: 'praise', label: 'מחמיא להם', hint: 'מרים ביטחון, פחות אפקטיבי כשמפגרים' },
  { id: 'calm', label: 'מרגיע ומסביר', hint: 'בטוח, משפר קצת בכל מצב' },
  { id: 'fire', label: 'נכנס בהם', hint: 'עוצמתי בפיגור, מסוכן כשמובילים' },
];

/** Goal difference from the player's point of view. */
function playerDiff(st: LiveState): number {
  const idx = st.iAmHome ? 0 : 1;
  return st.score[idx] - st.score[1 - idx];
}

/** The dressing room speech. Its value depends on the scoreline, so it is a real choice. */
export function halfTimeTalk(st: LiveState, id: TalkId) {
  const diff = playerDiff(st);
  let delta = 0;
  let line = '';

  if (id === 'praise') {
    delta = diff >= 0 ? 6 : 1;
    line = diff >= 0 ? 'מחמיא לשחקנים, הם יוצאים זקופים' : 'מנסה להרים אותם, זה לא ממש נתפס';
  } else if (id === 'calm') {
    delta = 3;
    line = 'מסביר בשקט מה משנים, הראש נקי';
  } else {
    delta = diff < 0 ? 8 : -3;
    line = diff < 0 ? 'נכנס בהם חזק, הם יוצאים רותחים' : 'צועק למרות היתרון, חלקם נלחצים';
  }

  const side = playerSide(st);
  for (const p of side.onPitch) p.morale = Math.max(0, Math.min(100, p.morale + delta));
  st.events.push({ minute: 45, type: 'tactic', teamId: side.id, text: `בחדר ההלבשה, המאמן ${line}` });
  // The talk is the only door out of half time the screen offers. It used to
  // set play directly and walk past resumeFromHalfTime, so the owner's boy the
  // manager had promised a half to never once came on in a real match.
  resumeFromHalfTime(st);
}

/** Leave half time without saying anything special. */
export function resumeFromHalfTime(st: LiveState) {
  // the owner's boy was promised a half. He takes the weakest outfield shirt,
  // and the manager finds out what that costs
  if (st.guestId && st.subsUsed < MAX_SUBS) {
    const side = playerSide(st);
    const guest = side.bench.find(p => p.id === st.guestId);
    const off = [...side.onPitch].filter(p => p.position !== 'GK').sort((a, b) => overall(a) - overall(b))[0];
    if (guest && off) {
      makeSub(st, off.id, guest.id);
      st.events.push({ minute: 45, type: 'tactic', teamId: side.id, text: `${guest.name} נכנס במחצית. הבעלים ביקש, המאמן קיים` });
    }
    st.guestId = null;
  }
  st.phase = 'play';
}

/* ------------------------------------------------------- changing the shape */

/**
 * Change the shape at half time.
 *
 * A manager who set up 4-4-2, watched it get overrun for forty-five minutes and
 * can only give a team talk about it is not managing, he is commentating. This
 * is the other half of the dressing room: go to three at the back, or throw a
 * third man up front, and live with it.
 *
 * The eleven are re-seated into the new shape rather than left where they were.
 * onPitch is an ordered array whose index IS the slot, so leaving it alone would
 * put a striker at wing back and draw him there on the pitch. fillFormation
 * picks who fills each line and seats each line by who fits it.
 *
 * Nobody's position is rewritten. A midfielder asked to play wing back is still
 * a midfielder having a hard evening, which is what the squad screen has always
 * said and what the ratings model already prices in.
 *
 * Deliberately half time only. Reshaping mid-play would be a free tactical
 * reset every time the opponent threatened, and the in-match shout already
 * exists for that.
 */
/** The shapes a manager may switch to, for a picker that never hard-codes them. */
export const FORMATION_CHOICES = FORMATIONS.map(f => ({ id: f.id, label: f.label, name: f.name, desc: f.desc }));

export function canChangeFormation(st: LiveState): boolean {
  return st.phase === 'halftime';
}

export function changeFormation(st: LiveState, id: FormationId): boolean {
  if (!canChangeFormation(st)) return false;
  const side = playerSide(st);
  if ((side.tactic.formation ?? DEFAULT_FORMATION) === id) return false;

  side.tactic = { ...side.tactic, formation: id };
  side.onPitch = fillFormation(side.onPitch, formation(id));
  st.shape = { to: formation(id).label, atHalf: [st.score[0], st.score[1]] };
  st.events.push({
    minute: 45, type: 'tactic', teamId: side.id,
    text: `שינוי מערך בהפסקה, ${formation(id).label} ${formation(id).name}`,
  });
  return true;
}

/**
 * The shirt each man is wearing in the CURRENT shape, slot by slot.
 *
 * The bench sheet used to show only a player's natural position, which was fine
 * while the shape never moved. Once it can move at half time, "who do I take off
 * and who comes on" needs the answer to "who is playing where NOW" — otherwise
 * a manager who switched to a back five is picking substitutes off a map of the
 * formation he just abandoned.
 */
export function slotRoles(st: LiveState): Map<string, string> {
  const side = playerSide(st);
  const f = formation(side.tactic.formation);
  const out = new Map<string, string>();
  fillFormation(side.onPitch, f).forEach((p, i) => {
    if (f.slots[i]) out.set(p.id, f.slots[i].role);
  });
  return out;
}

/* ------------------------------------------------------------- substitution */

export function canSub(st: LiveState): boolean {
  // the whistle closes the bench: the quick-sub buttons used to stay live
  // after full time and a tap there counted a substitution in a finished match
  return st.phase !== 'done' && st.subsUsed < MAX_SUBS && playerSide(st).bench.length > 0;
}

/** The player side, exposed so the UI can list who is on the pitch and on the bench. */
export function mySide(st: LiveState): Side {
  return playerSide(st);
}

const LINE_OF: Record<string, 'gk' | 'def' | 'mid' | 'atk'> = {
  GK: 'gk', CB: 'def', LB: 'def', RB: 'def',
  CDM: 'mid', CM: 'mid', CAM: 'mid',
  LW: 'atk', RW: 'atk', ST: 'atk',
};

export interface SubSuggestion {
  player: Player;
  /** why this name is being offered, shown to the manager */
  reason: string;
  exact: boolean;
}

/**
 * Who should come on for this player. Ranked by how well they cover the role
 * first and how fresh they are second, so one tap on a tired midfielder offers
 * midfielders, not whoever happens to sit first on the bench.
 */
export function suggestSubs(st: LiveState, offId: string, limit = 3): SubSuggestion[] {
  const side = playerSide(st);
  const off = side.onPitch.find(p => p.id === offId);
  if (!off) return [];
  const offLine = LINE_OF[off.position];

  return side.bench
    .filter(p => (p.position === 'GK') === (off.position === 'GK'))
    .map(p => {
      const exact = p.position === off.position;
      const sameLine = LINE_OF[p.position] === offLine;
      // Quality first, position second. The old weights ran the other way,
      // a hundred points for the exact shirt number against half a point per
      // rating point, so a 45 rated natural beat a 59 rated man one role over
      // and the suggestion was reliably the WORSE player. A position bonus is
      // worth a couple of rating points, not a career.
      const roleScore = exact ? 6 : sameLine ? 3 : -25;
      const score = roleScore + overall(p) + p.fitness * 0.3;
      const reason = exact
        ? `${p.position} טבעי, כושר ${Math.round(p.fitness)}`
        : sameLine
          ? `מכסה את אותו אזור, כושר ${Math.round(p.fitness)}`
          : `לא התפקיד שלו, אבל רענן`;
      return { player: p, reason, exact, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ player, reason, exact }) => ({ player, reason, exact }));
}

export function subBlockedReason(st: LiveState, offId: string, onId: string): string | null {
  if (st.phase === 'done') return 'שריקת סיום, אין יותר חילופים';
  if (st.subsUsed >= MAX_SUBS) return `נגמרו החילופים, ${MAX_SUBS} מקסימום`;
  const off = playerSide(st).onPitch.find(p => p.id === offId);
  const on = playerSide(st).bench.find(p => p.id === onId);
  if (!off || !on) return 'בחר שחקן יוצא ושחקן נכנס';
  // exactly one keeper stays in goal, which also lets a keeper stranded in an
  // outfield slot be taken off for an outfield man
  const gksNow = playerSide(st).onPitch.filter(p => p.position === 'GK').length;
  const gksAfter = gksNow - (off.position === 'GK' ? 1 : 0) + (on.position === 'GK' ? 1 : 0);
  if (gksAfter === 0) return 'חייב להישאר שוער אחד בשער';
  if (gksAfter > 1) return 'יש כבר שוער בשער, שוער שני לא עולה';
  return null;
}

export function makeSub(st: LiveState, offId: string, onId: string) {
  if (subBlockedReason(st, offId, onId)) return;
  const side = playerSide(st);
  const oi = side.onPitch.findIndex(p => p.id === offId);
  const bi = side.bench.findIndex(p => p.id === onId);
  const off = side.onPitch[oi];
  const on = side.bench[bi];
  // He keeps his own position. This used to stamp the outgoing man's shirt on
  // him, from before the shape existed: a CDM sent on for a CAM was rewritten
  // as a CAM, his rating recomputed for a role he does not play (62 became 58),
  // and the team sheet read "CAM by nature" about a man who never was. The slot
  // is the formation's business; fillFormation seats him by fit, and a man
  // asked to cover a strange role is priced as exactly that.
  side.onPitch[oi] = { ...on };
  side.bench[bi] = off;
  st.subsUsed++;
  st.events.push({ minute: st.minute, type: 'sub', teamId: side.id, text: `חילוף, ${on.name} נכנס במקום ${off.name}` });
}

/* --------------------------------------------------------------- finalize */

export function finalize(st: LiveState): MatchResult {
  const events: MatchEvent[] = st.events
    .filter(e => e.type !== 'sub' && e.type !== 'tactic' && e.type !== 'ambient')
    .map(e => ({
      minute: e.minute, type: e.type as MatchEvent['type'], teamId: e.teamId,
      playerId: e.playerId ?? '', playerName: e.playerName ?? '', text: e.text,
    }))
    .sort((a, b) => a.minute - b.minute);

  const ratings: Record<string, number> = {};
  for (const s of [st.home, st.away]) for (const p of [...s.onPitch, ...s.bench]) ratings[p.id] = 6.0;
  for (const e of events) if ((e.type === 'goal' || e.type === 'penalty_goal') && e.playerId) ratings[e.playerId] = Math.min(10, (ratings[e.playerId] ?? 6) + 1.2);

  const mk = (i: 0 | 1) => ({ possession: i === 0 ? st.possession : 1 - st.possession, chances: st.shots[i], goals: st.score[i], xg: st.xg[i] });
  return {
    seed: st.seed,
    home: { id: st.home.id, name: st.home.name, stats: mk(0) },
    away: { id: st.away.id, name: st.away.name, stats: mk(1) },
    score: st.score,
    events,
    ratings,
    shape: st.shape,
  };
}

/* ---------------------------------------------------------------- banner */

/**
 * The words on the big banner, by what actually happened. Every "big" event
 * used to shout גוווול, so a red card at 0-0, or a penalty the keeper kept
 * out, flashed a goal that never was. `good` is whether it is good for us.
 */
export function flashWords(ev: Pick<LiveEvent, 'type'>, mine: boolean): { word: string; good: boolean } {
  if (ev.type === 'red') return { word: 'אדום!', good: !mine };
  if (ev.type === 'penalty_miss') return mine ? { word: 'החמצה', good: false } : { word: 'הצלה!', good: true };
  return { word: 'גוווול', good: mine };
}
