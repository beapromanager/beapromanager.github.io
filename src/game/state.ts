import type { Club } from '../data/clubs.ts';
import { surnameOf } from '../data/names.ts';
import type { ManagerId, ManagerType } from '../data/managers.ts';
import { getManager } from '../data/managers.ts';
import type { Squad } from '../data/squadGen.ts';
import { playerValue, squadAvgOvr, nextPlayerId, makePlayer } from '../data/squadGen.ts';
import type { MatchResult, TeamInput, Approach, Press, Player, Position, Rng } from '../engine/matchEngine.ts';
import { simulateMatch, overall, createRng } from '../engine/matchEngine.ts';
import type { LeagueState, Fixture } from './league.ts';
import { initLeague, applyResult, sortedTable, buildFixtures, emptyTable } from './league.ts';
import { LEAGUE_C, isDerby, LEAGUE_NAMES, setDerbies, derbiesFromClubs, leagueCeiling } from '../data/clubs.ts';
import { buildRegionLeague, buildSiblingLeague, siblingClub } from '../data/cities.ts';
import { kitColor, type KitColorId } from '../data/palette.ts';
import { isLegend, isLegendClub, withLegend } from '../data/legends.ts';
import { seasonKit, firstKit, reasonFor } from '../data/seasonKit.ts';
import type { SeasonKit } from '../data/seasonKit.ts';
import type { KitPattern } from '../data/kits.ts';
import { debtState, debtLine, debtLimit } from './finance.ts';
import { emptyYouth, seedYouth, advanceYouth } from './youth.ts';
import type { Youth } from './youth.ts';
export type { Youth };
import { sponsorOffers, signSponsor, sponsorRound } from './sponsor.ts';
import type { Sponsor, SponsorOffer, SponsorId } from './sponsor.ts';
export type { Sponsor, SponsorOffer, SponsorId };
export { SPONSOR_BRAND } from './sponsor.ts';
import type { DebtState } from './finance.ts';
export { debtLine };
export type { DebtState };
import { DEFAULT_FORMATION, formationForClub, formation, fillFormation } from '../data/formations.ts';
import type { FormationId } from '../data/formations.ts';
import { TEMPLATES, eligible, rollDilemma } from '../data/dilemmas.ts';
import type { RolledDilemma, DilemmaEffect, Ctx as DilemmaCtx, Act, Who } from '../data/dilemmas.ts';
import { pickPressQuestion } from '../data/press.ts';
import {
  emptyInvite, myCode, deviceId, makeThanks, verifyThanks, addClaim, claimsThisSeason,
  GEMS_PER_FRIEND, GEMS_FOR_JOINING, ROUNDS_TO_COUNT,
} from './invite.ts';
import type { InviteState } from './invite.ts';
import { pickPressQuestions } from '../data/pressFacts.ts';
import { matchFacts } from '../data/matchFacts.ts';
import { pickTrigger, rollChat } from '../data/chats.ts';
import type { RolledChat } from '../data/chats.ts';
import { fanMessage } from '../data/fans.ts';
import type { Post, FeedContext } from '../data/feed.ts';
import { buildFeed } from '../data/feed.ts';
import type { FanContext, FanMessage, FanTiming } from '../data/fans.ts';
import type { Outlet, PressQuestion, PressContext } from '../data/press.ts';
import type { FreeAgent } from './transfers.ts';
import { makeMarket, refreshMarket, settleMarket, windowState, sellPrice, transferFee, contractTerms, MIN_SQUAD, MAX_SQUAD } from './transfers.ts';
import {
  PRE_ROUNDS, seedContract, contractYears, renewTerms, raiseBonus,
  starTarget, starFee, feeSweetener, youngTarget,
} from './preseason.ts';
import type { ChronicleEntry } from './chronicle.ts';
import { chronicleAfterRound, chronicleAtSeasonEnd } from './chronicle.ts';
import type { SeasonReport } from './career.ts';
import {
  buildNextSeason, matchPrize, roundCosts, fillWithYouth, TOP_TIER, playerWage,
  STADIUM_START, requiredCapacity, stadiumImageTier, gateIncome, crowdDemand, signageRound, expansionOptions,
} from './career.ts';
import type { RoundCosts, ExpansionOption } from './career.ts';
import type { Coach } from './coach.ts';
import {
  newCoach, coachChemistry, coachAttBias, coachDefBias,
  coachMoraleBias, coachYouthGrowth, qualifiedFor, requiredLicence,
  licence, applyCourse, coachFitnessBonus, coachCardBias,
} from './coach.ts';
import type { PackPull, PackId } from './packs.ts';
import {
  openPack, packById, GEMS_AT_START, GEMS_PER_AD, GEMS_ON_PROMOTION,
  ADS_PER_SEASON, PACK_CONTRACT_YEARS,
} from './packs.ts';

export type Phase =
  | 'onboard-archetype' | 'onboard-manager' | 'onboard-club' | 'signing' | 'squad' | 'hub' | 'transfers' | 'invite'
  | 'dilemma' | 'tactic' | 'vs' | 'match' | 'result' | 'press' | 'season-end' | 'chronicle'
  | 'captain' | 'assistant' | 'coach' | 'preseason' | 'preseason-market' | 'inbox' | 'chat' | 'table' | 'stadium'
  | 'packs' | 'sacked' | 'sponsor' | 'ultimatum' | 'rescue' | 'youth' | 'kit';

export type MarketLine = 'gk' | 'def' | 'mid' | 'atk';

export interface Meters { money: number; morale: number; prestige: number; }

/**
 * The club that sacked you, pinned to the division it was in.
 *
 * It does not move while you are gone. You drop a level, take the other club in
 * the same town, and if you climb back you walk into the same league as the
 * people who let you go, with the derby already written. That is the whole point
 * of being sacked here: it is not an ending, it is the start of the grudge.
 */
export interface Nemesis {
  clubId: string;
  name: string;
  short: string;
  city: string;
  /** the division they stay in until you get back to it */
  tier: number;
  season: number;
}

/** The day it ended, kept so the letter can say what actually happened. */
export interface Sacking {
  reason: 'debt';
  debt: number;
  limit: number;
  week: number;
  season: number;
  league: string;
  /** who let you go, kept whole so the club across town can be found */
  clubId: string;
  club: string;
  short: string;
  city: string;
  tier: number;
  position: number;
  teams: number;
}

/** The home ground and any expansion currently under construction. */
export interface StadiumProject { label: string; addSeats: number; roundsLeft: number; total: number; }
export interface Stadium { capacity: number; project: StadiumProject | null; }
/** A just finished build, to unveil the new ground on the result screen. */
export interface StadiumReveal { image: number; capacity: number; addSeats: number; upgraded: boolean; }

/** What the round earned and what it cost to run. */
export interface RoundLedger extends RoundCosts { prize: number; gate: number; sponsor: number; signage: number; net: number; }
export interface Tactic { approach: Approach; press: Press; formation: FormationId; }

/** Something the manager must be told on the way back to the hub. */
export type SquadNotice =
  | { kind: 'suspended'; playerId: string; name: string; rival: string; needYouth: boolean }
  | { kind: 'youth_back'; name: string }
  | { kind: 'window'; weeks: number }
  | { kind: 'story'; title: string; body: string };

/** A man of yours who went to another club in the league. */
export interface PlayerExit {
  id: string;
  name: string;
  clubId: string;
  season: number;
  week: number;
}

/** What a pre match answer changed about the match. Cleared when the week ends. */
export interface MatchMods {
  /** condition for this match only, by player id */
  fitness?: Record<string, number>;
  /** chance a man sits the round after, by player id */
  injury?: Record<string, number>;
  /** both sides slower and sloppier */
  mud?: boolean;
  /** gate money multiplier */
  gate?: number;
  /** the owner's boy, coming on at half time */
  guest?: Player | null;
  /** the terrace was promised a result */
  promiseWin?: boolean;
}

/** A word that comes back to the hub in a few weeks. */
export interface FollowUp {
  season: number;
  week: number;
  title: string;
  body: string;
}

export interface RoundResult { homeId: string; awayId: string; hg: number; ag: number; }

export interface ManagerProfile {
  name: string;
  nickname: string;
  age: number;
  type: ManagerId;
}

/**
 * Who you turn out to be. Nobody picks this at the start, it is counted from
 * the choices you actually make: backing the dressing room, playing the media,
 * or protecting the budget. That makes the identity yours rather than a menu.
 */
/**
 * A player's current season. Kept for EVERY player in the division, not just
 * your squad, because a golden boot race with only your own strikers in it is
 * not a race. Name and club are stored on the record so the charts render even
 * after a player moves or retires.
 */
export interface PlayerSeason {
  name: string;
  clubId: string;
  apps: number;
  goals: number;
  assists: number;
  lastGoalWeek: number;   // 0 = never scored this season
}

/** One finished season on a player's record, so a card can show a history. */
export interface CareerSeason {
  season: number;
  tier: number;
  clubShort: string;
  apps: number;
  goals: number;
  assists: number;
}

const blankSeason = (name = '', clubId = ''): PlayerSeason =>
  ({ name, clubId, apps: 0, goals: 0, assists: 0, lastGoalWeek: 0 });

export interface ManagerStyle {
  players: number;   // sided with the squad
  media: number;     // played the press and the standing
  money: number;     // guarded the wallet
}

export function styleTitle(style: ManagerStyle): { title: string; note: string } {
  const { players, media, money } = style;
  const total = players + media + money;
  if (total < 4) return { title: 'מאמן חדש', note: 'עוד לא הספיקו להכיר אותך' };
  const top = Math.max(players, media, money);
  if (top === players) return { title: 'איש של השחקנים', note: 'בחדר ההלבשה הולכים אחריך באש ובמים' };
  if (top === media) return { title: 'איש התקשורת', note: 'אתה יודע לשחק את המשחק גם מחוץ למגרש' };
  return { title: 'מנהל עם ראש על הכתפיים', note: 'לא זורק שקל, והבעלים מעריך את זה' };
}

export interface GameState {
  phase: Phase;
  seasonSeed: number;
  clubId: string;
  profile: ManagerProfile;
  meters: Meters;
  tactic: Tactic;
  week: number;
  league: LeagueState;
  market: FreeAgent[];
  /** the position line the market opens filtered to, when reached from a gap */
  marketFocus: MarketLine | null;
  dilemma: RolledDilemma | null;
  dilemmaHistory: string[];
  /** messages that can wait, read from the hub whenever you like */
  inbox: RolledDilemma[];
  /** the money in and out of the round just played, shown on the result screen */
  lastLedger: RoundLedger | null;
  /** the conversation waiting on the phone after a week worth talking about */
  chat: RolledChat | null;
  chatHistory: string[];
  /** press question ids asked lately, so the reporter does not repeat himself */
  pressHistory: string[];
  /**
   * Who sits out. A red card puts a man here as PENDING (-1) during the round
   * it happened in; the end of that week turns it into the one round he misses,
   * and the end of that round clears it. No week arithmetic, so a red in the
   * last round carries cleanly into the first round of next season.
   */
  suspensions: Record<string, number>;
  /**
   * A youth registered for one round so the team sheet has sixteen eligible
   * names. He is on the list and never on the pitch, and he goes back down
   * the moment the round is over.
   */
  emergencyYouth: string | null;
  /** what the manager has to be told before he sees the hub again */
  notices: SquadNotice[];
  /** men sold to clubs in this league, so the story can follow them */
  exits: PlayerExit[];
  /** men out of this round by the manager's own decision, id to the chip that says why */
  sitOut: Record<string, string>;
  /** the same, owed for the round after (an injury risk that came in) */
  sitOutNext: Record<string, string>;
  /** what this round's answers changed about the match itself */
  matchMods: MatchMods;
  /** words that come back to the hub later */
  followUps: FollowUp[];
  /** academy kids training with the seniors, boosted in the summer */
  youthBoost: string[];
  /** the academy kid who may walk in the summer, and how likely */
  youthLeaveRisk: { name: string; p: number } | null;
  /** men who agreed to stay until the summer, and then go */
  summerExits: string[];
  /**
   * The first-week explainer has been read. A flag in the save rather than a
   * moment in the UI: it used to fire off the step that led to the hub, and
   * the day a sponsor screen was put between the summer and the hub it never
   * fired again. The hub itself now asks, and a refresh mid-explainer does
   * not lose it.
   */
  tutorialSeen: boolean;
  pendingOutcome: string | null;
  lastPlayerMatch: MatchResult | null;
  lastRound: RoundResult[];
  /** the question on screen, plus whatever the reporter still has waiting.
   *  q is kept as the current one so a save written before the second question
   *  existed still opens on a valid press room. */
  press: { outlet: Outlet; q: PressQuestion; queue?: PressQuestion[] } | null;
  /** set the moment the owner ends it, and never cleared: the career is over */
  sacking: Sacking | null;
  /** the shirt deal for this season, re-negotiated every summer */
  sponsor: Sponsor | null;
  /** the club that let you go, waiting a division above until you climb back */
  nemesis: Nemesis | null;
  /** the season the owner delivered his ultimatum, so it is delivered once */
  ultimatumSeason: number | null;
  /** the club's money has already collapsed once, and it only happens once */
  crisisDone: boolean;
  /** what actually happened to the money, for the owner to explain */
  crisisReason: string | null;
  /** the youth academy: 16-18 year olds training toward the senior squad */
  youth: Youth;
  style: ManagerStyle;
  /** per player season record for the whole division, drives the charts */
  seasonStats: Record<string, PlayerSeason>;
  /** finished seasons per player, so you can read a career off a card */
  careerStats: Record<string, CareerSeason[]>;
  form: ('W' | 'D' | 'L')[];   // most recent last
  seasonOver: boolean;
  /** Autobiography that writes itself, see chronicle.ts */
  chronicle: ChronicleEntry[];
  /** How many chronicle entries the manager has already looked at */
  chronicleSeen: number;
  /** recently shown fan line ids, so the terrace does not repeat itself */
  fanHistory: string[];
  /** which season of the career this is, 1 based */
  season: number;
  /** what happened last time the season rolled over, drives the summary screen */
  lastReport: SeasonReport | null;
  /** the armband. null means fall back to the highest ranked candidate */
  captainId: string | null;
  /** the assistant coach, all heart and no clue, see below */
  assistant: Assistant;
  /** the home ground, which grows with the club across seasons */
  stadium: Stadium;
  /** set the round a build opens, drives the unveil on the result screen */
  stadiumReveal: StadiumReveal | null;
  /** years left on each of my players' contracts, defaulted from a hash */
  contracts: Record<string, number>;
  /** which summer round we are on, 1..3, or 0 when the league is running */
  preWeek: number;
  /** pre season events already handled, so a saga does not reappear */
  preResolved: string[];
  /** premium currency for packs. Never convertible from shekels, see packs.ts */
  gems: number;
  /** ads watched for gems this season, capped at ADS_PER_SEASON */
  adsWatched: number;
  /** friends brought in, and who brought me */
  invite: InviteState;
  /** the screen to return to when the invite sheet closes */
  inviteFrom: Phase | null;
  /** what the club looked like when this summer round opened, so the game can
   *  tell a manager who is about to skip a round he has not used */
  summerMark: string | null;
  /** every shirt this career has worn, newest last. A career you can read */
  wardrobe: SeasonKit[];
  /** the shirt waiting to be unveiled, cleared once he has seen it */
  kitReveal: SeasonKit | null;
  /** the card just pulled from a pack, waiting to be signed or sold */
  pull: PackPull | null;
  /** the manager's own career: his abilities, his badge, his seasons */
  coach: Coach;
}

/**
 * The assistant coach. He loves football more than anyone and understands it
 * less than the tea lady. His whole job is to agree with the manager and repeat
 * the question back as if it were an answer. He never actually helps, and the
 * day the club reaches ליגה א' he leaves to manage a team of his own.
 */
export interface Assistant {
  hired: boolean;
  name: string;
  departed: boolean;
}

/** Tier at which the assistant graduates to a manager and leaves. */
export const ASSISTANT_LEAVES_TIER = 3;   // ליגה א'

const ASSISTANT_NAMES = ['שוקי', 'בוזי', 'ג׳קי', 'מוטי', 'ציון', 'פפו'];

export const START_MONEY = 180_000;

/** Manager age changes how the dressing room and the boardroom treat you. */
export function ageProfile(age: number) {
  if (age <= 35) return { label: 'מאמן צעיר', note: 'קרוב לשחקנים, פחות כבוד מהמערכת', morale: +5, prestige: -6, youth: 1.15 };
  if (age <= 49) return { label: 'בשיא הדרך', note: 'איזון בין ניסיון לאנרגיה', morale: 0, prestige: 0, youth: 1.0 };
  return { label: 'מאמן ותיק', note: 'מכובד מאוד, פחות סבלנות מהצעירים', morale: -4, prestige: +8, youth: 0.9 };
}

export function newGame(seed = 12345): GameState {
  return {
    phase: 'onboard-manager',
    seasonSeed: seed,
    clubId: '',
    profile: { name: '', nickname: '', age: 38, type: 'mental' },
    meters: { money: START_MONEY, morale: 65, prestige: 30 },
    tactic: { approach: 'balanced', press: 'mid', formation: DEFAULT_FORMATION },
    week: 1,
    league: initLeague(LEAGUE_C, seed),
    market: [],
    marketFocus: null,
    dilemma: null,
    dilemmaHistory: [],
    inbox: [],
    lastLedger: null,
    chat: null,
    chatHistory: [],
    pressHistory: [],
    suspensions: {},
    emergencyYouth: null,
    notices: [],
    exits: [],
    sitOut: {},
    sitOutNext: {},
    matchMods: {},
    followUps: [],
    youthBoost: [],
    youthLeaveRisk: null,
    summerExits: [],
    tutorialSeen: false,
    pendingOutcome: null,
    lastPlayerMatch: null,
    lastRound: [],
    press: null,
    sacking: null,
    sponsor: null,
    nemesis: null,
    ultimatumSeason: null,
    crisisDone: false,
    crisisReason: null,
    youth: emptyYouth(),
    style: { players: 0, media: 0, money: 0 },
    seasonStats: {},
    careerStats: {},
    form: [],
    seasonOver: false,
    chronicle: [],
    chronicleSeen: 0,
    fanHistory: [],
    season: 1,
    lastReport: null,
    captainId: null,
    assistant: { hired: false, name: '', departed: false },
    stadium: { capacity: STADIUM_START, project: null },
    stadiumReveal: null,
    contracts: {},
    preWeek: 0,
    preResolved: [],
    gems: GEMS_AT_START,
    adsWatched: 0,
    invite: emptyInvite(),
    inviteFrom: null,
    summerMark: null,
    wardrobe: [],
    kitReveal: null,
    pull: null,
    coach: newCoach('mental'),
  };
}

export function club(gs: GameState): Club {
  return gs.league.clubs.find(c => c.id === gs.clubId) ?? gs.league.clubs[0];
}
export function manager(gs: GameState): ManagerType {
  return getManager(gs.profile.type);
}
export function mySquad(gs: GameState): Squad {
  return gs.league.squads[gs.clubId];
}
export function playerFixture(gs: GameState): Fixture | null {
  return gs.league.fixtures.find(f => f.round === gs.week && (f.homeId === gs.clubId || f.awayId === gs.clubId)) ?? null;
}
export function transferWindow(gs: GameState) {
  // the market is always open during the pre season summer
  if (gs.preWeek > 0) {
    return { open: true, label: 'שוק הקיץ', weeksLeft: PRE_ROUNDS - gs.preWeek + 1, nextOpensWeek: null };
  }
  return windowState(gs.week, gs.league.rounds);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The three meters the manager reads are whole numbers, always.
 *
 * Morale drifted fractional because the coach's motivation is worth a fraction
 * of a point per match (coachMoraleBias), and 70 + 6 + 0.36 was stored and then
 * printed as 76.36000000000001. Anything shown as a number is rounded where it
 * is STORED, not where it is drawn, so it cannot come back somewhere else.
 */
const meter = (v: number) => Math.round(clamp(v, 0, 100));

/**
 * How the dressing room actually moves.
 *
 * Good news is worth less the higher the mood already is, bad news is worth all
 * of it. A flat +6 a win had a squad at 85 by the sixth round and 92 by the end
 * of a first season, which made the whole meter decoration: it was pinned near
 * the top from the spring of year one and never came down.
 *
 * Now a happy squad is hard to make happier and just as easy to upset, so
 * ninety is a run you went on rather than a number you passed through.
 */
function moraleShift(current: number, delta: number): number {
  if (delta <= 0) return meter(current + delta);
  const room = clamp((100 - current) / 50, 0.2, 1);
  return meter(current + delta * room);
}
const cash = (v: number) => Math.round(v);

/* ------------------------------------------------------------- onboarding */

/** Your name, the first thing the chairman asks for. */
export function setProfile(gs: GameState, profile: ManagerProfile): GameState {
  return { ...gs, profile, phase: 'onboard-club' };
}

/**
 * The CV, asked for once the chairman knows who you are and which club you are
 * joining. It comes after the club, so the budget the club set has to be redone
 * here: a recruiter talks his way into more money than a youth coach does.
 */
export function setArchetype(gs: GameState, id: ManagerId): GameState {
  const c = club(gs);
  const m = getManager(id);
  const ap = ageProfile(gs.profile.age);
  return {
    ...gs,
    profile: { ...gs.profile, type: id },
    coach: newCoach(id),
    meters: {
      ...gs.meters,
      money: Math.round(START_MONEY * m.budgetBias * c.traits.budget),
      prestige: clamp(c.traits.prestige + ap.prestige, 0, 100),
    },
    phase: 'signing',
  };
}

/** Club choice sets the money, the prestige and the squad you inherit. */
/**
 * Pick your city. The bottom division is rebuilt around it, your town plus the
 * seven nearest real towns, and the club of your city becomes yours. This is
 * the belonging hook, so the whole region is real, not a menu of invented names.
 */
export function pickCity(gs: GameState, cityName: string, kit?: KitColorId, pattern?: KitPattern): GameState {
  const region = buildRegionLeague(cityName, 1);
  setDerbies(derbiesFromClubs(region.clubs));
  // the manager's chosen colours and pattern become the club's, so the crest,
  // the shirts and the dots on the pitch all follow from one choice
  const clubs = (kit || pattern)
    ? region.clubs.map(c => (c.id === region.myId
        ? {
            ...c,
            ...(kit ? { primary: kitColor(kit).hex, accent: kitColor(kit).trim } : {}),
            ...(pattern ? { kitPattern: pattern } : {}),
          }
        : c))
    : region.clubs;
  const league = initLeague(clubs, gs.seasonSeed, gs.profile.name);
  // the chosen city rides on the club itself (club.city), no extra state needed
  return pickClub({ ...gs, league }, region.myId);
}

export function pickClub(gs: GameState, clubId: string): GameState {
  const c = gs.league.clubs.find(x => x.id === clubId)!;
  const m = getManager(gs.profile.type);
  const ap = ageProfile(gs.profile.age);
  const rng = createRng(gs.seasonSeed + 777);
  const squad = gs.league.squads[clubId];
  const takenNames = new Set([...squad.starters, ...squad.bench].map(p => p.name));
  return {
    ...gs,
    clubId,
    meters: {
      money: Math.round(START_MONEY * m.budgetBias * c.traits.budget),
      morale: clamp(65 + ap.morale, 0, 100),
      prestige: clamp(c.traits.prestige + ap.prestige, 0, 100),
    },
    market: makeMarket(c.tier, rng, 12, takenNames),
    phase: 'onboard-archetype',
  };
}

/* ------------------------------------------------ sacked, and the way back */

/** Who is on the phone the morning after, and what they are asking. */
export interface RescueOffer {
  club: Club;
  /** the division they are in, one below the club that let you go */
  tier: number;
  league: string;
  /** the full name, since both clubs in a town share the short one */
  nemesisName: string;
  nemesisLeague: string;
  city: string;
  /** true when the sacking was in the bottom division and there is no lower one */
  sameLeague: boolean;
}

/**
 * The club across town, a division below, calling the morning after.
 *
 * Every Israeli city has two clubs and they cannot stand each other, so the
 * people who never liked your old employer are exactly the people who want the
 * man he just threw out. Take it, drag them up, and the season after that you
 * are in his league with a derby circled on the calendar.
 */
export function rescueOffer(gs: GameState): RescueOffer | null {
  const s = gs.sacking;
  if (!s) return null;
  const tier = Math.max(1, s.tier - 1);
  const club = siblingClub(s.city, tier, s.clubId);
  return {
    club, tier, league: LEAGUE_NAMES[tier],
    nemesisName: s.club, nemesisLeague: s.league,
    city: s.city, sameLeague: tier === s.tier,
  };
}

/**
 * Take it. A new club, a new division, the same manager: the badge, the money
 * and the table start again, while the profile, the coach and the whole
 * chronicle carry over, because the story is his and not the club's.
 */
export function takeRescue(gs: GameState): GameState {
  const offer = rescueOffer(gs);
  const s = gs.sacking;
  if (!offer || !s) return gs;
  const seed = gs.seasonSeed + gs.season * 131 + 17;
  const region = buildSiblingLeague(s.city, offer.tier, s.clubId);
  const nemesis: Nemesis = {
    clubId: s.clubId, name: s.club, short: s.short, city: s.city, tier: s.tier, season: s.season,
  };
  let league = initLeague(region.clubs, seed, gs.profile.name);

  // Sacked in the bottom division there is nothing below it, so the club across
  // town is in the same league and the derby is this season rather than the one
  // after. Put him in the division now, since that is what the call promised.
  let clubs = region.clubs;
  if (offer.sameLeague) {
    const staged = { ...gs, clubId: region.myId, nemesis } as GameState;
    const swap = returnOfTheNemesis(staged, clubs, league.squads, offer.tier);
    if (swap.met) {
      clubs = swap.clubs;
      league = {
        ...league,
        clubs,
        squads: swap.squads,
        ovr: Object.fromEntries(Object.entries(swap.squads).map(([id, sq]) => [id, squadAvgOvr(sq)])),
        fixtures: buildFixtures(clubs.map(x => x.id)),
        table: emptyTable(clubs),
      };
    }
  }
  setDerbies(derbiesFromClubs(clubs));
  const c = clubs.find(x => x.id === region.myId)!;
  const squad = league.squads[region.myId];
  const rng = createRng(seed + 777);
  const taken = new Set([...squad.starters, ...squad.bench].map(p => p.name));

  return {
    ...gs,
    sacking: null,
    ultimatumSeason: null,
    // he does not move while you are away, and the day you get back he is there.
    // Already in the same division, the account is open on the pitch instead.
    nemesis: offer.sameLeague ? null : nemesis,
    clubId: region.myId,
    league,
    seasonSeed: seed,
    season: gs.season + 1,
    week: 1,
    meters: {
      // a club that just called a sacked manager is not a rich club
      money: cash(START_MONEY * 0.8 * c.traits.budget),
      morale: meter(58),
      prestige: meter(Math.max(18, gs.meters.prestige - 8)),
    },
    market: makeMarket(offer.tier, rng, 12, taken),
    marketFocus: null,
    sponsor: null,
    youth: { ...emptyYouth(), players: seedYouth(offer.tier, createRng(seed + 5501), taken) },
    stadium: { capacity: STADIUM_START, project: null },
    stadiumReveal: null,
    lastLedger: null,
    lastPlayerMatch: null,
    lastRound: [],
    form: [],
    seasonStats: {},
    seasonOver: false,
    contracts: {},
    captainId: null,
    dilemma: null,
    inbox: [],
    press: null,
    chat: null,
    pendingOutcome: null,
    chronicle: [...gs.chronicle, {
      id: `rescue-s${gs.season}`,
      kind: 'sacked' as const,
      week: 0,
      title: `${c.name} התקשרו`,
      body: `הקבוצה השנייה ב${s.city}, זאת שתמיד הייתה בצל של ${s.short}, רצתה דווקא את מי ש${s.short} זרקו. ${LEAGUE_NAMES[offer.tier]}, מהתחלה, ועם חשבון פתוח.`,
      icon: 'flag' as const,
      tint: 'gold' as const,
    }],
    // the same welcome the first club got: the announcement, the badge and the
    // first question from the press. A new club is a new beginning or it is not one.
    phase: 'signing',
  };
}

/**
 * Give a freshly signed club its youth intake, if it has none yet. Rescued
 * managers keep whatever academy they walked into.
 */
function ensureYouth(gs: GameState): GameState {
  if (gs.youth.players.length) return gs;
  const rng = createRng(gs.seasonSeed + 5501);
  const sq = mySquad(gs);
  const used = new Set([...sq.starters, ...sq.bench].map(p => p.name));
  return { ...gs, youth: { ...emptyYouth(), players: seedYouth(club(gs).tier, rng, used) } };
}

/* --------------------------------------------------------- youth academy */

/** Move a player who has turned 18 up into the senior squad on a youth deal. */
export function promoteYouth(gs: GameState, playerId: string): GameState {
  const kid = gs.youth.players.find(p => p.id === playerId);
  if (!kid || kid.age < 18 || squadSize(gs) >= MAX_SQUAD) return gs;
  const sq = mySquad(gs);
  const next = writeSquad(gs, { starters: sq.starters, bench: [...sq.bench, kid] });
  return {
    ...next,
    youth: {
      ...gs.youth,
      players: gs.youth.players.filter(p => p.id !== playerId),
      ready: gs.youth.ready.filter(n => n !== kid.name),
    },
    contracts: { ...gs.contracts, [kid.id]: 3 },
    pendingOutcome: `${kid.name} חתם חוזה בכיר ועלה לסגל. ${squadSize(next)} שחקנים בסגל עכשיו.`,
  };
}

/** Let a youth player go, whatever his age. */
export function releaseYouth(gs: GameState, playerId: string): GameState {
  const kid = gs.youth.players.find(p => p.id === playerId);
  if (!kid) return gs;
  return {
    ...gs,
    youth: {
      ...gs.youth,
      players: gs.youth.players.filter(p => p.id !== playerId),
      ready: gs.youth.ready.filter(n => n !== kid.name),
    },
    pendingOutcome: `${kid.name} שוחרר מהמחלקה.`,
  };
}

/** A senior squad player, 18 or under, can be sent down to keep developing. */
export function demoteToYouth(gs: GameState, playerId: string): GameState {
  const sq = mySquad(gs);
  const p = [...sq.starters, ...sq.bench].find(x => x.id === playerId);
  if (!p || p.age > 18 || squadSize(gs) <= MIN_SQUAD) return gs;
  const next = removePlayer(gs, playerId);
  return {
    ...next,
    youth: { ...next.youth, players: [...next.youth.players, p] },
    pendingOutcome: `${p.name} ירד למחלקת הנוער כדי לקבל דקות ולהתפתח.`,
  };
}

export function openYouth(gs: GameState): GameState { return { ...gs, phase: 'youth', pendingOutcome: null }; }
export function closeYouth(gs: GameState): GameState { return { ...gs, phase: 'hub', pendingOutcome: null }; }
export function clearYouthOutcome(gs: GameState): GameState { return { ...gs, pendingOutcome: null }; }

/** Signing done, now go and look at the squad you inherited. */
export function afterSigning(gs: GameState, effect: { morale?: number; prestige?: number }): GameState {
  // A rescued manager has already met a squad and run a club. He does not need
  // the onboarding tour again, he needs somebody on the shirt. A rescue is the
  // one path that arrives here with a nemesis set, so that, not the incidental
  // crisisDone, is what tells a returning manager from a first timer.
  const next = gs.nemesis ? 'sponsor' as const : 'squad' as const;
  gs = ensureYouth(gs);
  // the shirt he arrives in goes into the wardrobe here, not at the season
  // opening, because a fresh career walks to the squad screen and never passes
  // through enterSeason at all. Without this his first shirt is missing and the
  // summer after it reads as a first season, so he is never handed a new kit
  gs = wearChosenKit(gs);
  return {
    ...gs,
    meters: {
      money: cash(gs.meters.money),
      morale: moraleShift(gs.meters.morale, (effect.morale ?? 0)),
      prestige: meter(gs.meters.prestige + (effect.prestige ?? 0)),
    },
    style: scoreStyle(gs.style, effect),
    phase: next,
  };
}

/* ------------------------------------------------------------- pre season */

/**
 * Open the summer. Runs once between seasons: every contract ticks down a year,
 * the map is pruned to the men actually here, and any player new to us signs on
 * fresh. From here the three market rounds play out before the league starts.
 */
export function enterPreseason(gs: GameState): GameState {
  const sq = mySquad(gs);
  const ids = [...sq.starters, ...sq.bench].map(p => p.id);
  const firstEver = Object.keys(gs.contracts).length === 0;
  const contracts: Record<string, number> = {};
  for (const id of ids) {
    if (id in gs.contracts) contracts[id] = clamp(gs.contracts[id] - 1, 0, 5);
    // the opening squad gets full 1..3 year deals, so nobody expires in the
    // first summer. Contracts only bite from the second season, once these
    // have ticked down, which keeps ליגה ג׳ amateur to begin with.
    else if (firstEver) contracts[id] = seedContract(id);
    else contracts[id] = 3;   // a kid up from the youth signs a three year deal
  }
  const opened = { ...gs, phase: 'preseason-market' as const, preWeek: 1, preResolved: [], contracts, pendingOutcome: null };
  return { ...opened, summerMark: summerFingerprint(opened) };
}

/* --------------------------------------------------- using the summer */

/**
 * Everything a summer round lets a manager change, in one string.
 *
 * Taken as a fingerprint rather than a counter incremented by each action, so
 * it cannot drift: anything new that touches the squad, the contracts, the
 * ground, the badge or the academy registers here without being told to.
 */
export function summerFingerprint(gs: GameState): string {
  const sq = mySquad(gs);
  return [
    [...sq.starters, ...sq.bench].map(p => p.id).sort().join(','),
    gs.preResolved.length,
    gs.stadium.project ? `${gs.stadium.project.label}:${gs.stadium.project.roundsLeft}` : '',
    gs.coach.licence,
    gs.gems,
    gs.youth.players.length,
    Object.keys(gs.contracts).length,
  ].join('|');
}

/**
 * Is the manager about to skip a summer round without having used it? The
 * window is the one part of the year where the squad can actually be changed,
 * so walking past it in silence is a decision worth asking about once.
 */
export function summerUntouched(gs: GameState): boolean {
  return gs.summerMark !== null && summerFingerprint(gs) === gs.summerMark;
}

/* ------------------------------------------------------- coaching badges */

/** Is the manager unqualified for the division he is about to open? */
export function courseRequired(gs: GameState): boolean {
  return !qualifiedFor(gs.coach.licence, club(gs).tier);
}

/** The badge on offer this summer, or null when there is nothing to take. */
export function courseOnOffer(gs: GameState) {
  const nextId = requiredLicence(club(gs).tier);
  if (qualifiedFor(gs.coach.licence, club(gs).tier)) return null;
  return licence(nextId);
}

export function courseBlockedReason(gs: GameState): string | null {
  const l = courseOnOffer(gs);
  if (!l) return null;
  if (gs.meters.money < l.cost) return 'אין מספיק תקציב לקורס';
  return null;
}

/** Take the course. Costs money, upgrades the badge and the man. */
export function takeCourse(gs: GameState): GameState {
  const l = courseOnOffer(gs);
  if (!l || courseBlockedReason(gs)) return gs;
  return {
    ...gs,
    meters: { ...gs.meters, money: cash(gs.meters.money - l.cost) },
    coach: applyCourse(gs.coach, l.id),
    pendingOutcome: `סיימת את ${l.course}. מהיום אתה ${l.name}.`,
  };
}

/** Return to the summer board after a trip to the open market. No state moves. */
export function backToPreseason(gs: GameState): GameState {
  return { ...gs, phase: 'preseason-market', pendingOutcome: null };
}

/**
 * Why the summer cannot be closed yet, or null when it can. Contracts are the
 * one thing you are not allowed to walk past: leaving the window with men who
 * have no deal would quietly cost you the squad, so the whistle waits until
 * every expiring contract has been answered, renewed or released.
 */
export function preseasonBlockedReason(gs: GameState): string | null {
  if (gs.preWeek < PRE_ROUNDS) return null;
  // the badge comes first: a division you are not qualified for will not let
  // you take the touchline at all, whatever else you sorted out this summer
  if (courseRequired(gs)) {
    return `בלי ${licence(requiredLicence(club(gs).tier)).name} אי אפשר לפתוח עונה ב${LEAGUE_NAMES[club(gs).tier]}`;
  }
  const open = preseasonEvents(gs).filter(e => e.kind === 'renew');
  if (!open.length) return null;
  return open.length === 1
    ? 'נשאר חוזה אחד לסגור לפני שהעונה מתחילה'
    : `נשארו ${open.length} חוזים לסגור לפני שהעונה מתחילה`;
}

/** Advance one summer round, or kick the season off after the third. */
export function advancePreseason(gs: GameState): GameState {
  if (gs.preWeek >= PRE_ROUNDS) {
    if (preseasonBlockedReason(gs)) return gs;   // contracts must be answered first
    return finishPreseason(gs);
  }
  // the window moves on: whoever was on notice has signed elsewhere, new names
  // come in, and the last round of the summer brings the one big name
  const next = gs.preWeek + 1;
  const sq = mySquad(gs);
  const taken = new Set([...sq.starters, ...sq.bench].map(p => p.name));
  const market = refreshMarket(
    gs.market, club(gs).tier, createRng(gs.seasonSeed + 4100 + next * 31), taken,
    { marquee: next >= PRE_ROUNDS },
  );
  const opened = { ...gs, preWeek: next, market, pendingOutcome: null };
  // a fresh mark for the new round, so each one is judged on its own
  return { ...opened, summerMark: summerFingerprint(opened) };
}

/**
 * The whistle. Anyone still out of contract and not renewed now walks for free,
 * but never below a legal squad, then the league begins.
 */
function finishPreseason(gs: GameState): GameState {
  let next = gs;
  const expiring = expiringPlayers(gs);
  for (const p of expiring) {
    if (squadSize(next) <= MIN_SQUAD) break;   // cannot gut the whole team
    next = removePlayer(next, p.id);
  }
  // if summer sales left the squad short, blood youth up to a legal minimum
  const contracts = { ...next.contracts };
  if (squadSize(next) < MIN_SQUAD) {
    const rng = createRng(gs.seasonSeed * 733 + gs.season * 97 + 5);
    const filled = fillWithYouth(mySquad(next), rng, club(next).tier, MIN_SQUAD);
    next = writeSquad(next, filled.squad);
    for (const p of [...filled.squad.starters, ...filled.squad.bench]) {
      if (!(p.id in contracts)) contracts[p.id] = 3;
    }
  }
  // whoever we were forced to keep gets a bare one year deal so they are legal
  for (const p of expiringPlayers({ ...next, contracts })) contracts[p.id] = 1;
  return enterSeason({ ...next, contracts, preWeek: 0, preResolved: [], pendingOutcome: null });
}

export function enterSeason(gs: GameState): GameState {
  // the summer is over, so its warnings and its star are over too
  gs = { ...gs, market: settleMarket(gs.market) };
  gs = seasonWithLegend(gs);
  gs = dressForTheSeason(gs);
  // the new shirt is unveiled before anything else, because it is the first
  // thing a club shows the world in the summer
  if (gs.kitReveal) return { ...gs, phase: 'kit' };
  return afterKit(gs);
}

/** The rest of the summer, once the shirt is on the table. */
function afterKit(gs: GameState): GameState {
  // the shirt is sold before a ball is kicked, and re-sold every summer
  if (!gs.sponsor || gs.sponsor.season !== gs.season) return { ...gs, phase: 'sponsor' };
  return maybeAssistantDeparture({ ...gs, phase: 'hub' });
}

/**
 * This season's shirt, unveiled before a ball is kicked.
 *
 * The colour never moves, because the colour is who the club is. What changes
 * is the cut, the shade and the trim, and what decides them is what the manager
 * did last season: gold across the chest for a title, a deeper shade for the
 * year you went up. Over a career the wardrobe stops being decoration and turns
 * into a record you can read without a word of text.
 *
 * Written onto the club as kitShirt and kitTrim rather than onto primary, so the
 * crest and the club's identity stay exactly where they were.
 */
function dressForTheSeason(gs: GameState): GameState {
  const worn = gs.wardrobe ?? [];
  if (worn.some(k => k.season === gs.season && k.clubId === gs.clubId)) return gs;  // already dressed

  const me = club(gs);
  const last = previousKit(gs);
  const reason = last ? reasonFor(gs.lastReport?.result, gs.season) : 'first';

  // his first season at a club is the shirt HE chose on the way in, recorded as
  // it is. There is nothing to unveil either: a reveal needs a shirt to stand
  // the new one beside, and at the first one there is none
  if (reason === 'first') return wearChosenKit(gs);

  const kit = seasonKit(me, gs.season, reason, last);
  const clubs = gs.league.clubs.map(c =>
    c.id === gs.clubId ? { ...c, kitShirt: kit.shirt, kitTrim: kit.trim, kitPattern: kit.pattern } : c);

  return {
    ...gs,
    league: { ...gs.league, clubs },
    wardrobe: [...worn, kit],
    kitReveal: kit,
  };
}

/**
 * Record the shirt he chose, as he chose it.
 *
 * Nothing is generated and nothing is unveiled: he picked these colours and this
 * pattern himself on the way in, so the wardrobe simply opens with them. It is
 * what every later kit is a change FROM, which is why it has to be here even
 * though it looks like it does nothing.
 */
function wearChosenKit(gs: GameState): GameState {
  const worn = gs.wardrobe ?? [];
  if (worn.some(k => k.clubId === gs.clubId)) return gs;
  return { ...gs, wardrobe: [...worn, firstKit(club(gs), gs.season)] };
}

/** He has seen the new shirt; on with the summer. */
export function closeKitReveal(gs: GameState): GameState {
  return afterKit({ ...gs, kitReveal: null });
}

/**
 * The shirt this club wore last, for standing the new one beside.
 *
 * Same club only. A sacked manager's wardrobe spans two clubs, and holding up
 * the shirt of the people who let him go as "last season" would be nonsense.
 */
export function previousKit(gs: GameState): SeasonKit | null {
  const mine = (gs.wardrobe ?? []).filter(k => k.clubId === gs.clubId && k.season < gs.season);
  return mine.length ? mine[mine.length - 1] : null;
}

/**
 * One of the ראש העין regulars is in the dressing room when the season opens.
 *
 * They were being put in when a career BEGINS and again when a season rolls
 * over, and that missed the case that matters most: a career already in
 * progress. Itzik opened a season in ראש העין and there was nobody, because his
 * squad was built before any of this existed and the rollover had not come
 * round yet. The season opening is the boundary every career crosses, new or
 * old, so it is the honest place for it.
 *
 * Does nothing at any other club, and nothing if one of them is already here.
 */
function seasonWithLegend(gs: GameState): GameState {
  const me = club(gs);
  if (!isLegendClub(me.city)) return gs;
  const squad = mySquad(gs);
  const next = withLegend(
    squad, me.city, gs.profile.name,
    createRng(gs.seasonSeed + gs.season * 811 + 5501), nextPlayerId,
    { mode: 'join', maxSquad: MAX_SQUAD },
  );
  if (next === squad) return gs;
  return { ...gs, league: { ...gs.league, squads: { ...gs.league.squads, [gs.clubId]: next } } };
}

/** The three deals on the table this summer. */
export function sponsorChoices(gs: GameState): SponsorOffer[] {
  return sponsorOffers(club(gs).tier, gs.meters.prestige, gs.league.rounds);
}

export function takeSponsor(gs: GameState, id: SponsorId): GameState {
  const offer = sponsorChoices(gs).find(o => o.id === id) ?? sponsorChoices(gs)[0];
  return maybeAssistantDeparture({
    ...gs, phase: 'hub', sponsor: signSponsor(offer, gs.season),
  });
}

/** What the shirt is worth this round, given who is in the ground. */
export function sponsorThisRound(gs: GameState, isDerby = false): number {
  return sponsorRound(gs.sponsor, club(gs).tier, homeAttendance(gs, isDerby));
}

/* ------------------------------------------------- pre season, the business */

export type PreEventKind = 'star' | 'young' | 'renew';

export interface PreEvent {
  id: string;
  kind: PreEventKind;
  player: Player;
  /** the money attached: a suitor's fee, a raise, or a renewal bonus */
  amount: number;
  /** what else is in the deal, down where the money is not the point */
  sweetener?: string | null;
}

/** My players whose contract has run out this summer. */
function expiringPlayers(gs: GameState): Player[] {
  const sq = mySquad(gs);
  return [...sq.starters, ...sq.bench].filter(p => contractYears(gs.contracts, p.id) <= 0);
}

/**
 * What is on the manager's desk this summer round. Departure sagas surface in
 * the first round, the out of contract men from the second, and everything
 * stays until it is dealt with.
 */
export function preseasonEvents(gs: GameState): PreEvent[] {
  const done = new Set(gs.preResolved);
  const out: PreEvent[] = [];
  const sq = mySquad(gs);

  // a player caught in an unresolved saga is not also listed as a renewal, so
  // one man never fills two cards at once
  const inSaga = new Set<string>();
  if (!done.has('dep-star') && club(gs).tier < TOP_TIER) {
    const star = starTarget(sq);
    if (star) {
      out.push({
        id: 'dep-star', kind: 'star', player: star,
        amount: starFee(star, club(gs).tier),
        sweetener: feeSweetener(club(gs).tier, gs.seasonSeed + star.name.length),
      });
      inSaga.add(star.id);
    }
  }
  // the whole contract business, raises and renewals, only starts the second
  // summer. The first season is amateur ליגה ג׳ football: no contracts, just
  // build a squad. It gives the player a clean first year before the paperwork.
  if (gs.season >= 2) {
    if (!done.has('dep-young')) {
      const young = youngTarget(sq);
      if (young) { out.push({ id: 'dep-young', kind: 'young', player: young, amount: raiseBonus(young) }); inSaga.add(young.id); }
    }
    if (gs.preWeek >= 2) {
      for (const p of expiringPlayers(gs)) {
        if (inSaga.has(p.id)) continue;
        if (!done.has(`renew-${p.id}`)) out.push({ id: `renew-${p.id}`, kind: 'renew', player: p, amount: renewTerms(p, club(gs).tier).signOn });
      }
    }
  }
  return out;
}

/** Remove a player from my squad entirely, keeping eleven on the field. */
function removePlayer(gs: GameState, playerId: string): GameState {
  const sq = mySquad(gs);
  let starters = sq.starters.filter(p => p.id !== playerId);
  let bench = sq.bench.filter(p => p.id !== playerId);
  // if a starter left, pull the first bench player up so the eleven stays whole
  if (starters.length < sq.starters.length && bench.length) {
    const gone = sq.starters.find(p => p.id === playerId)!;
    const idx = gone.position === 'GK'
      ? bench.findIndex(p => p.position === 'GK')
      : bench.findIndex(p => p.position !== 'GK');
    const take = idx >= 0 ? idx : 0;
    starters = [...starters, bench[take]];
    bench = bench.filter((_, i) => i !== take);
  }
  const contracts = { ...gs.contracts };
  delete contracts[playerId];
  return { ...writeSquad(gs, { starters, bench }), contracts };
}

/**
 * Answer a transfer saga. The star can be cashed in or kept, the kid can be
 * given his raise or told to earn it. Every path lands an outcome bubble.
 */
export function resolveDeparture(gs: GameState, kind: 'star' | 'young', optionIndex: number): GameState {
  const sq = mySquad(gs);
  if (kind === 'star') {
    const p = starTarget(sq);
    if (!p) return gs;
    const fee = starFee(p, club(gs).tier);
    const extra = feeSweetener(club(gs).tier, gs.seasonSeed + p.name.length);
    const resolved = [...gs.preResolved, 'dep-star'];
    if (optionIndex === 0) {
      // cash in: he gets his move, you get the money and a weaker team
      const next = removePlayer(gs, p.id);
      return {
        ...next, preResolved: resolved,
        meters: { ...gs.meters, money: cash(gs.meters.money + fee), morale: moraleShift(gs.meters.morale, 2) },
        style: scoreStyle(gs.style, { money: fee, morale: 2 }),
        // the count is said out loud, because a squad that reads the same size
        // afterwards (the summer tops it back up) made the sale look ignored
        pendingOutcome: (extra
          ? `${p.name} נמכר תמורת ${formatK(fee)} ו${extra}. הסגל איבד את השחקן הכי טוב שלו, אבל לפחות יש ציוד.`
          : `${p.name} נמכר תמורת ${formatK(fee)}. הכסף בקופה, אבל הסגל איבד את השחקן הכי טוב שלו.`)
          + ` נשארתם עם ${squadSize(next)} שחקנים.`,
      };
    }
    // block the move: he stays, the dressing room grumbles
    return {
      ...gs, preResolved: resolved,
      meters: { ...gs.meters, morale: moraleShift(gs.meters.morale, -(5)) },
      style: scoreStyle(gs.style, { morale: -5, prestige: 1 }),
      pendingOutcome: `אמרת לא. ${p.name} נשאר, אבל הוא לא מרוצה והחדר הרגיש את זה.`,
    };
  }

  const p = youngTarget(sq);
  if (!p) return gs;
  const resolved = [...gs.preResolved, 'dep-young'];
  if (optionIndex === 0) {
    // the raise: a loyalty bonus now, a longer deal, a happy kid
    const bonus = raiseBonus(p);
    const contracts = { ...gs.contracts, [p.id]: 3 };
    return {
      ...gs, preResolved: resolved, contracts,
      meters: { ...gs.meters, money: cash(gs.meters.money - bonus), morale: moraleShift(gs.meters.morale, 4) },
      style: scoreStyle(gs.style, { money: -bonus, morale: 4 }),
      pendingOutcome: `${p.name} חתם חוזה חדש ומחייך. ${formatK(bonus)} מהקופה, אבל הכישרון נשאר בבית לשלוש שנים.`,
    };
  }
  // refuse: saves the money, costs you the mood, and he remembers. He still
  // sees out at least this season, so an already expired deal ticks up to one.
  const kept = Math.max(1, contractYears(gs.contracts, p.id));
  return {
    ...gs, preResolved: resolved,
    contracts: { ...gs.contracts, [p.id]: kept },
    meters: { ...gs.meters, morale: moraleShift(gs.meters.morale, -(4)) },
    style: scoreStyle(gs.style, { money: 1, morale: -4 }),
    pendingOutcome: `סירבת להעלאה. ${p.name} בלע את זה, אבל הפעם הבאה שהחוזה שלו ייגמר, הוא כבר לא יבקש יפה.`,
  };
}

/** Keep an out of contract player on a fresh deal. */
export function renewContract(gs: GameState, playerId: string): GameState {
  const sq = mySquad(gs);
  const p = [...sq.starters, ...sq.bench].find(x => x.id === playerId);
  if (!p) return gs;
  const terms = renewTerms(p, club(gs).tier);
  const contracts = { ...gs.contracts, [playerId]: terms.years };
  return {
    ...gs, contracts,
    preResolved: [...gs.preResolved, `renew-${playerId}`],
    meters: { ...gs.meters, money: cash(gs.meters.money - terms.signOn) },
    pendingOutcome: `${p.name} חתם חוזה ל${terms.years === 1 ? 'עונה' : `${terms.years} עונות`}. ${formatK(terms.signOn)} דמי חתימה.`,
  };
}

/** Let an out of contract player walk now instead of at the whistle. */
export function releasePlayer(gs: GameState, playerId: string): GameState {
  const sq = mySquad(gs);
  if (squadSize(gs) <= MIN_SQUAD) {
    return { ...gs, pendingOutcome: `אי אפשר לרדת מתחת ל-${MIN_SQUAD} שחקנים. תחתים מישהו קודם.` };
  }
  const p = [...sq.starters, ...sq.bench].find(x => x.id === playerId);
  if (!p) return gs;
  return {
    ...removePlayer(gs, playerId),
    preResolved: [...gs.preResolved, `renew-${playerId}`],
    pendingOutcome: `${p.name} עוזב חופשי. חסכת את השכר, אבל הסגל מצטמצם.`,
  };
}

/** Dismiss the outcome bubble on the pre season board. */
export function clearPreseasonOutcome(gs: GameState): GameState {
  return { ...gs, pendingOutcome: null };
}

/** Compact money label for the short outcome lines, e.g. 120K, 1.4M. */
function formatK(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a % 1_000_000 === 0 ? 0 : 1)}M`;
  if (a >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

/* -------------------------------------------------------------- the ground */

export function openStadium(gs: GameState): GameState { return { ...gs, phase: 'stadium' }; }

/** Which stadium photo is showing right now (0 is the opening ground). */
export function stadiumImg(gs: GameState): 0 | 1 | 2 | 3 | 4 {
  return stadiumImageTier(gs.stadium.capacity);
}

/** How full the ground gets, from standing, form and the occasion. */
export function attendanceFill(gs: GameState, isDerby: boolean): number {
  const recent = gs.form.slice(-3);
  const formBump = recent.reduce((s, r) => s + (r === 'W' ? 0.03 : r === 'L' ? -0.02 : 0), 0);
  const f = 0.5 + gs.meters.prestige / 250 + formBump + (isDerby ? 0.12 : 0);
  return Math.max(0.35, Math.min(0.99, f));
}

/** A representative home gate, for showing on the stadium screen. */
/** What the boards pay each round, which is why a bigger ground is worth more. */
export function signageEstimate(gs: GameState): number {
  return gs.sponsor ? signageRound(club(gs).tier, gs.stadium.capacity) : 0;
}

export function homeGateEstimate(gs: GameState): number {
  return gateIncome(homeAttendance(gs, false), club(gs).tier);
}

/**
 * The people actually in the ground: the smaller of the seats you own and the
 * crowd the town will turn out, times how full that gets. Seats past the town's
 * appetite earn nothing, which is why over building for a division is waste
 * rather than free money.
 */
/** How many the town would come if there were room, whatever the ground holds. */
export function crowdWanted(gs: GameState): number {
  return crowdDemand(club(gs).tier, gs.meters.prestige);
}

export function homeAttendance(gs: GameState, isDerby: boolean): number {
  const want = crowdDemand(club(gs).tier, gs.meters.prestige) * (isDerby ? 1.15 : 1);
  return Math.round(Math.min(gs.stadium.capacity, want) * attendanceFill(gs, isDerby));
}

/**
 * What this season is FOR, in one glance.
 *
 * The hub used to show a table and leave the manager to work out what it meant.
 * Nothing on the home screen said what winning looks like, how close he was, or
 * what he stood to lose, so there was nothing pulling him into the next round.
 * This is that missing sentence, and the ladder above it is the same fact drawn
 * rather than written.
 */
export interface SeasonGoal {
  pos: number;
  teams: number;
  pts: number;
  played: number;
  /** rounds still to play */
  left: number;
  zone: 'promo' | 'safe' | 'drop';
  /** what the season is being played for */
  target: string;
  /** the one line under the ladder */
  line: string;
  /** promotion is on the pitch but the ground is too small */
  blocked: boolean;
  /** there is a division above to climb to, and one below to fall into */
  up: boolean;
  down: boolean;
}

export function seasonGoal(gs: GameState): SeasonGoal {
  const table = sortedTable(gs.league);
  const i = Math.max(0, table.findIndex(s => s.clubId === gs.clubId));
  const me = table[i];
  const pos = i + 1, teams = table.length;
  const tier = club(gs).tier;
  const up = tier < TOP_TIER;          // somewhere to climb to
  const down = tier > 1;               // and something to fall out of
  const left = Math.max(0, gs.league.rounds - me.played);
  const gate = stadiumGate(gs);
  const blocked = up && pos <= 2 && !!gate && !gate.meets;

  const zone: SeasonGoal['zone'] =
    up && pos <= 2 ? 'promo' : down && pos >= teams ? 'drop' : 'safe';
  // a side in the drop is not playing for promotion, whatever the table says
  const target = zone === 'drop' ? 'להישאר בליגה'
    : up ? `עלייה ל${LEAGUE_NAMES[tier + 1]}` : 'אליפות המדינה';
  const ptsAt = (n: number) => table[Math.min(teams, Math.max(1, n)) - 1]?.pts ?? 0;
  const pt = (n: number) => `${n} ${n === 1 ? 'נקודה' : 'נקודות'}`;
  const rounds = `${left} ${left === 1 ? 'מחזור' : 'מחזורים'}`;

  let line: string;
  if (me.played === 0) {
    line = up ? 'שני המקומות הראשונים עולים ליגה. מתחילים.' : 'העונה נפתחת, והכל עוד פתוח.';
  } else if (blocked) {
    line = 'אתם במקום שעולה, אבל האצטדיון קטן מדי לליגה מעל.';
  } else if (zone === 'promo') {
    line = pos === 1
      ? `ראשונים, ${pt(Math.max(0, me.pts - ptsAt(3)))} מעל אזור העלייה.`
      : `במקום שעולה, ${pt(Math.max(0, me.pts - ptsAt(3)))} מעל הרודף.`;
  } else if (zone === 'drop') {
    line = `אחרונים. ${pt(Math.max(0, ptsAt(teams - 1) - me.pts))} מהצלה, ${rounds} נשארו.`;
  } else {
    const need = Math.max(0, (up ? ptsAt(2) : ptsAt(1)) - me.pts);
    if (need === 0) {
      line = up ? 'צמודים למקום שעולה. ניצחון אחד וזה שלכם.' : 'צמודים לפסגה. ניצחון אחד ואתם שם.';
      // two points a round clawed back is already a heroic run; past that
      // the promotion talk stops being encouraging and starts being a taunt
    } else if (need <= left * 2) {
      line = `${pt(need)} מ${up ? 'אזור העלייה' : 'הפסגה'}, ${rounds} נשארו.`;
    } else {
      // The climb is gone this season. Telling a manager he is fifteen points
      // off with five games left is just rubbing it in, so the goal shrinks to
      // the one place he can still take: the club immediately above him.
      const above = table[i - 1];
      const name = above ? (gs.league.clubs.find(c => c.id === above.clubId)?.short ?? '') : '';
      line = above
        ? `העלייה כבר לא בהישג. עקפו את ${name} (${pt(above.pts - me.pts)} מעליכם) וסיימו גבוה.`
        : `${rounds} לסיום. סיימו את העונה בכבוד ותבנו סגל לעונה הבאה.`;
    }
  }

  return { pos, teams, pts: me.pts, played: me.played, left, zone, target, line, blocked, up, down };
}

/**
 * The season the money goes.
 *
 * Every manager gets sacked once, and it happens in ליגה א׳ or the לאומית,
 * because that is where the wage bill outgrows the club. It is not a punishment
 * for playing badly: the club's money collapses under him, the way it does at
 * that level in Israel every other year. The owner explains it to his face, and
 * then the ordinary rules take over: a warning, and the next defeat.
 *
 * The debt is imposed past the line rather than near it, because a manager who
 * could sell his way out of it would never see the rest of the story.
 */
const CRISIS_TIERS = [3, 4];
const CRISIS_WEEK = 4;

const CRISIS_REASONS = [
  'העסק של הבעלים קרס, והחשבון של המועדון הלך איתו.',
  'הגיע חוב מס משנים שלפניך, והוא נחת עליך.',
  'הספונסר הראשי ביטל את החוזה באמצע העונה ולקח את הכסף בחזרה.',
  'הבעלים משך את ההשקעה כדי לכסות חובות אחרים שלו.',
];

/** Has the money already gone, or is this the round it goes? */
function maybeCrisis(gs: GameState): GameState {
  if (gs.crisisDone) return gs;
  const t = club(gs).tier;
  if (!CRISIS_TIERS.includes(t) || gs.week < CRISIS_WEEK) return gs;
  const reason = CRISIS_REASONS[Math.abs(gs.seasonSeed + gs.season) % CRISIS_REASONS.length];
  // straight past what the owner will carry, so there is no trading out of it
  const hole = -Math.round(debtLimit(t) * 1.5);
  return {
    ...gs,
    crisisDone: true,
    crisisReason: reason,
    meters: { ...gs.meters, money: cash(Math.min(gs.meters.money, hole)) },
  };
}

/** The books as the owner sees them, and how close he is to acting. */
export function debt(gs: GameState): DebtState {
  return debtState(gs.meters.money, club(gs).tier);
}

/** The promotion gate: what the division above wants, and whether we meet it. */
export function stadiumGate(gs: GameState): { nextTier: number; need: number; meets: boolean } | null {
  const t = club(gs).tier;
  if (t >= TOP_TIER) return null;
  const need = requiredCapacity(t + 1);
  if (need <= 0) return null;
  return { nextTier: t + 1, need, meets: gs.stadium.capacity >= need };
}

export function expansions(gs: GameState): ExpansionOption[] {
  return expansionOptions(club(gs).tier);
}

/** Why an expansion cannot be started, or null when it can. */
export function expansionBlockedReason(gs: GameState, opt: ExpansionOption): string | null {
  if (gs.stadium.project) return 'כבר יש בנייה בתהליך';
  if (gs.meters.money < opt.cost) return 'אין מספיק תקציב';
  return null;
}

/** Commit money to a build. It finishes a few rounds later, in commitRound. */
export function startStadiumProject(gs: GameState, key: ExpansionOption['key']): GameState {
  const opt = expansions(gs).find(o => o.key === key);
  if (!opt || expansionBlockedReason(gs, opt)) return gs;
  return {
    ...gs,
    meters: { ...gs.meters, money: cash(gs.meters.money - opt.cost) },
    stadium: {
      capacity: gs.stadium.capacity,
      project: { label: opt.label, addSeats: opt.addSeats, roundsLeft: opt.rounds, total: opt.rounds },
    },
  };
}

/** Move a build one round on. Returns the ground, a chronicle, and an unveil. */
function advanceStadium(gs: GameState): { stadium: Stadium; done: ChronicleEntry | null; reveal: StadiumReveal | null } {
  const p = gs.stadium.project;
  if (!p) return { stadium: gs.stadium, done: null, reveal: null };
  if (p.roundsLeft > 1) {
    return { stadium: { ...gs.stadium, project: { ...p, roundsLeft: p.roundsLeft - 1 } }, done: null, reveal: null };
  }
  const capacity = gs.stadium.capacity + p.addSeats;
  const upgraded = stadiumImageTier(capacity) !== stadiumImageTier(gs.stadium.capacity);
  const id = `stadium-${capacity}`;
  const done: ChronicleEntry | null = gs.chronicle.some(e => e.id === id) ? null : {
    id, kind: 'season_end', week: gs.week, icon: 'flag', tint: 'gold',
    title: 'האצטדיון גדל',
    body: `הבנייה הסתיימה. הקיבולת עלתה ל${capacity.toLocaleString('en-US')} מקומות, ועוד אוהדים אומרים שהם ישמעו יותר טוב מעכשיו.`,
  };
  const reveal: StadiumReveal = { image: stadiumImageTier(capacity), capacity, addSeats: p.addSeats, upgraded };
  return { stadium: { capacity, project: null }, done, reveal };
}

/** The player closed the stadium unveil overlay. */
export function clearStadiumReveal(gs: GameState): GameState {
  return { ...gs, stadiumReveal: null };
}
export function openSquad(gs: GameState): GameState {
  return { ...gs, phase: 'squad' };
}
export function openTransfers(gs: GameState, focus: MarketLine | null = null): GameState {
  return { ...gs, phase: 'transfers', marketFocus: focus };
}
export function backToHub(gs: GameState): GameState {
  return { ...gs, phase: 'hub' };
}

/** Whether the first-week explainer is owed: the hub, nothing in the way, unread. */
export function tutorialDue(gs: GameState): boolean {
  return gs.phase === 'hub' && gs.notices.length === 0 && !gs.tutorialSeen;
}
export function markTutorialSeen(gs: GameState): GameState {
  return gs.tutorialSeen ? gs : { ...gs, tutorialSeen: true };
}

/* ---------------------------------------------------------- squad editing */

function writeSquad(gs: GameState, squad: Squad): GameState {
  return {
    ...gs,
    league: { ...gs.league, squads: { ...gs.league.squads, [gs.clubId]: squad } },
  };
}

/* -------------------------------------------------------------- discipline */

/**
 * A red card costs the next match, and the manager has to deal with it
 * himself: the man is still in his squad, he is simply not allowed on the team
 * sheet, so the round will not start while he is in the eleven. The sheet also
 * needs sixteen eligible names, and a squad of sixteen with one man banned has
 * fifteen, so a youth is registered for the round to make up the number. He
 * never plays; he goes back to the academy the moment the round is over.
 */
const PENDING = -1;

/** Sitting out the coming round. */
export function isSuspended(gs: GameState, playerId: string): boolean {
  return (gs.suspensions[playerId] ?? 0) > 0;
}

/** On the sheet but not allowed on the pitch: suspended, or the registered youth. */
export function isUnavailable(gs: GameState, playerId: string): boolean {
  return isSuspended(gs, playerId) || gs.emergencyYouth === playerId || !!gs.sitOut[playerId];
}

/** Names the league will accept on the sheet: the squad less the suspended. */
export function eligibleCount(gs: GameState): number {
  const sq = mySquad(gs);
  return [...sq.starters, ...sq.bench].filter(p => !isSuspended(gs, p.id)).length;
}

/** Why the round cannot start yet, or null when the sheet is in order. */
export function weekBlockedReason(gs: GameState): string | null {
  const sq = mySquad(gs);
  const banned = sq.starters.find(p => isSuspended(gs, p.id));
  if (banned) return `${banned.name} מורחק למחזור הזה. תוציא אותו מההרכב.`;
  const sitting = sq.starters.find(p => gs.sitOut[p.id]);
  if (sitting) return `${sitting.name} ${gs.sitOut[sitting.id]} במחזור הזה, כמו שהחלטת. תוציא אותו מההרכב.`;
  const n = eligibleCount(gs);
  if (n < MIN_SQUAD) return `יש רק ${n} שמות כשירים לסגל, הליגה דורשת ${MIN_SQUAD}. תרשום שחקן מהנוער למחזור.`;
  return null;
}

/** The sheet is short and the academy is the only place a name can come from. */
export function needsEmergencyYouth(gs: GameState): boolean {
  return eligibleCount(gs) < MIN_SQUAD && !gs.emergencyYouth;
}

/**
 * Register a youth for one round, any age. He fills the sixteenth line on the
 * sheet and nothing else: not the eleven, not the bench, and after the round
 * he is back at the academy.
 */
export function registerYouthEmergency(gs: GameState, playerId: string): GameState {
  const kid = gs.youth.players.find(p => p.id === playerId);
  if (!kid || !needsEmergencyYouth(gs) || squadSize(gs) >= MAX_SQUAD) return gs;
  const sq = mySquad(gs);
  const next = writeSquad(gs, { starters: sq.starters, bench: [...sq.bench, kid] });
  return {
    ...next,
    emergencyYouth: kid.id,
    youth: { ...gs.youth, players: gs.youth.players.filter(p => p.id !== playerId) },
    pendingOutcome: `${kid.name} נרשם לסגל למחזור. הוא לא ישחק, ויחזור לנוער אחרי המשחק.`,
  };
}

/** After the round: the registered youth goes back down, with a word to the manager. */
function returnEmergencyYouth(gs: GameState): GameState {
  const id = gs.emergencyYouth;
  if (!id) return gs;
  const sq = mySquad(gs);
  const kid = [...sq.starters, ...sq.bench].find(p => p.id === id);
  const cleared = { ...gs, emergencyYouth: null };
  if (!kid) return cleared;   // sold or released in the meantime, nothing to send down
  const next = removePlayer(cleared, id);
  return {
    ...next,
    youth: { ...next.youth, players: [...next.youth.players, kid] },
    notices: [...next.notices, { kind: 'youth_back', name: kid.name }],
  };
}

/**
 * Bank the reds from the match just played. They sit as pending until the
 * week ends, so the round they happened in is not also the round they cost.
 */
function bookSuspensions(gs: GameState, r: MatchResult): Record<string, number> {
  const out = { ...gs.suspensions };
  for (const e of r.events ?? []) {
    if (e.type === 'red' && e.teamId === gs.clubId && e.playerId) out[e.playerId] = PENDING;
  }
  return out;
}

/**
 * The week is over: pending reds become the one round they cost, the round
 * just served is cleared, and the manager is told about anyone newly banned
 * before he sees the hub, with the sixteen names problem spelled out when his
 * squad is exactly sixteen.
 */
function serveSuspensions(gs: GameState): GameState {
  const sq = mySquad(gs);
  const all = [...sq.starters, ...sq.bench];
  const suspensions: Record<string, number> = {};
  const notices: SquadNotice[] = [...gs.notices];
  for (const [id, v] of Object.entries(gs.suspensions)) {
    if (v === PENDING) suspensions[id] = 1;
    else if (v > 1) suspensions[id] = v - 1;
  }
  const after = { ...gs, suspensions };
  const nextFx = playerFixture({ ...after, week: gs.week + 1 });
  const rivalId = nextFx ? (nextFx.homeId === gs.clubId ? nextFx.awayId : nextFx.homeId) : null;
  const rival = gs.league.clubs.find(c => c.id === rivalId)?.short ?? 'היריבה הבאה';
  for (const [id, v] of Object.entries(gs.suspensions)) {
    if (v !== PENDING) continue;
    const p = all.find(x => x.id === id);
    if (!p) continue;
    notices.push({ kind: 'suspended', playerId: id, name: p.name, rival, needYouth: eligibleCount(after) < MIN_SQUAD });
  }
  return { ...after, notices };
}

/** The manager has read the notice on top of the pile. */
export function dismissNotice(gs: GameState): GameState {
  return { ...gs, notices: gs.notices.slice(1) };
}

/* ---------------------------------------------------------- squad editing */

/** Why a swap is not allowed, or null when it is fine. */
export function swapBlockedReason(a: Player, b: Player, gs?: GameState): string | null {
  const aGk = a.position === 'GK', bGk = b.position === 'GK';
  // The rule is that exactly one keeper is in the eleven after the swap, not
  // that a keeper only ever swaps with a keeper. The old wording trapped a
  // reserve keeper who had been pushed into an outfield slot over the summer:
  // he was not in goal, and still nobody but a keeper could replace him.
  const gksNow = gs ? mySquad(gs).starters.filter(p => p.position === 'GK').length : 1;
  const gksAfter = gksNow - (aGk ? 1 : 0) + (bGk ? 1 : 0);
  if (gksAfter === 0) return 'חייב להישאר שוער אחד בשער';
  if (gksAfter > 1) return 'יש כבר שוער בשער, שוער שני לא עולה';
  // the bench man is the one coming in
  if (gs && isSuspended(gs, b.id)) return `${b.name} מורחק למחזור הזה, הוא לא יכול לעלות להרכב`;
  if (gs && gs.emergencyYouth === b.id) return `${b.name} רשום לסגל בלבד, הוא לא משחק במחזור הזה`;
  if (gs && gs.sitOut[b.id]) return `${b.name} ${gs.sitOut[b.id]} במחזור הזה, כמו שהחלטת`;
  return null;
}

/** Move a starter to the bench and a bench player into the XI. */
export function swapPlayers(gs: GameState, starterId: string, benchId: string): GameState {
  const sq = mySquad(gs);
  const si = sq.starters.findIndex(p => p.id === starterId);
  const bi = sq.bench.findIndex(p => p.id === benchId);
  if (si < 0 || bi < 0) return gs;
  if (swapBlockedReason(sq.starters[si], sq.bench[bi], gs)) return gs;

  const starters = [...sq.starters];
  const bench = [...sq.bench];
  const tmp = starters[si];
  starters[si] = bench[bi];
  bench[bi] = tmp;
  return writeSquad(gs, { starters, bench });
}

/* ------------------------------------------------------------- transfers */

export function squadSize(gs: GameState): number {
  const sq = mySquad(gs);
  return sq.starters.length + sq.bench.length;
}

export function signBlockedReason(gs: GameState, fa: FreeAgent): string | null {
  if (!transferWindow(gs).open) return 'החלון סגור';
  if (gs.meters.money < fa.fee) return 'אין מספיק תקציב';
  if (squadSize(gs) >= MAX_SQUAD) return `הסגל מלא, מקסימום ${MAX_SQUAD} שחקנים`;
  return null;
}

export function signPlayer(gs: GameState, playerId: string): GameState {
  const fa = gs.market.find(f => f.player.id === playerId);
  if (!fa || signBlockedReason(gs, fa)) return gs;
  const sq = mySquad(gs);
  const next = writeSquad(gs, { starters: sq.starters, bench: [...sq.bench, fa.player] });
  return {
    ...next,
    meters: { ...gs.meters, money: cash(gs.meters.money - fa.fee) },
    market: gs.market.filter(f => f.player.id !== playerId),
    contracts: { ...gs.contracts, [fa.player.id]: contractTerms(fa, club(gs).tier).years },
  };
}

export function sellBlockedReason(gs: GameState): string | null {
  // A club in the red is always allowed to sell. Without this the owner could
  // sack you for a debt you had no way to pay off, which is a trap, not pressure.
  if (!transferWindow(gs).open && debt(gs).level === 'clear') return 'החלון סגור';
  if (squadSize(gs) <= MIN_SQUAD) return `אי אפשר לרדת מתחת ל-${MIN_SQUAD} שחקנים`;
  return null;
}

/** Only bench players can be sold, starters must be swapped out first. */
export function sellPlayer(gs: GameState, playerId: string): GameState {
  if (sellBlockedReason(gs)) return gs;
  const sq = mySquad(gs);
  const p = sq.bench.find(x => x.id === playerId);
  if (!p) return gs;
  const next = writeSquad(gs, { starters: sq.starters, bench: sq.bench.filter(x => x.id !== playerId) });
  const moved = moveToLeagueClub(next, p);
  return {
    ...moved.gs,
    meters: { ...gs.meters, money: cash(gs.meters.money + sellPrice(p, club(gs).tier)) },
  };
}

/* ------------------------------------------------- where a sold man goes */

const LINE: Record<string, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'FWD', RW: 'FWD', ST: 'FWD', CF: 'FWD',
};

/**
 * A man sold in the window goes somewhere real: a club in this league, and
 * he plays for it. He takes the shirt of their weakest man on his line when
 * he is the better player, otherwise their bench, so you will meet him, and
 * if he scores against you the reporter will know exactly who he is. The
 * buyer is the club that needs him most on his line, ties broken by the seed.
 */
export function moveToLeagueClub(gs: GameState, p: Player): { gs: GameState; clubId: string } {
  const rng = createRng(gs.seasonSeed * 53 + gs.week * 7 + hashId(p.id));
  const line = LINE[p.position] ?? 'MID';
  const others = gs.league.clubs.filter(c => c.id !== gs.clubId && gs.league.squads[c.id]);
  // the club whose weakest starter on his line is weakest of all wants him most
  const weakest = (id: string) => {
    const s = gs.league.squads[id].starters.filter(x => (LINE[x.position] ?? 'MID') === line);
    return s.length ? Math.min(...s.map(overall)) : 0;
  };
  const ranked = [...others].sort((a, b) => weakest(a.id) - weakest(b.id) || rng() - 0.5);
  const buyer = ranked[0] ?? others[0];
  if (!buyer) return { gs, clubId: gs.clubId };

  const sq = gs.league.squads[buyer.id];
  const starters = [...sq.starters];
  let bench = [...sq.bench];
  const onLine = starters.map((x, i) => ({ x, i })).filter(({ x }) => (LINE[x.position] ?? 'MID') === line);
  const worst = onLine.sort((a, b) => overall(a.x) - overall(b.x))[0];
  if (worst && overall(p) > overall(worst.x)) {
    bench.push(worst.x);
    starters[worst.i] = p;
  } else {
    bench.push(p);
  }
  // their squad does not grow forever: the weakest reserve makes room
  if (starters.length + bench.length > MAX_SQUAD) {
    const drop = [...bench].sort((a, b) => overall(a) - overall(b))[0];
    bench = bench.filter(x => x !== drop);
  }
  const exit: PlayerExit = { id: p.id, name: p.name, clubId: buyer.id, season: gs.season, week: gs.week };
  return {
    clubId: buyer.id,
    gs: {
      ...gs,
      league: { ...gs.league, squads: { ...gs.league.squads, [buyer.id]: { starters, bench } } },
      exits: [...gs.exits, exit],
      chronicle: [...gs.chronicle, {
        id: `sold-${p.id}-s${gs.season}`, kind: 'sold', week: gs.week,
        title: `${p.name} עבר ל${buyer.short}`,
        body: `נפרדתם בחלון. בפעם הבאה שתפגשו הוא בצד השני, ואל תתפלא אם הוא ירצה להוכיח משהו.`,
        icon: 'handshake', tint: 'draw',
      }],
    },
  };
}

function hashId(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 100000;
}

/** Men of yours now wearing the next opponent's shirt, most recent first. */
export function exesAtNextOpponent(gs: GameState): PlayerExit[] {
  const fx = playerFixture(gs);
  if (!fx) return [];
  const oppId = fx.homeId === gs.clubId ? fx.awayId : fx.homeId;
  const there = new Set([...gs.league.squads[oppId].starters, ...gs.league.squads[oppId].bench].map(p => p.id));
  return gs.exits.filter(e => e.clubId === oppId && there.has(e.id)).reverse();
}

/* ---------------------------------------------------------- parting ways */

/**
 * Letting a man go from his own card, two ways.
 *
 * In the window he is told to find himself a club and the club takes most of
 * his value. Out of the window, when the books are in the red, the two of you
 * part as friends: a quarter of his value, and his wage off the bill from the
 * next round, which is the point of it. The second is a way out of debt that
 * costs something, so it is only offered when the club is actually short.
 */
export type PartKind = 'transfer' | 'friends';
export interface PartOption {
  kind: PartKind;
  label: string;
  /** what the club receives */
  fee: number;
  /** his weekly wage, which stops with him */
  wage: number;
  detail: string;
}

/** Why he cannot be let go at all right now, or null. */
export function partBlockedReason(gs: GameState, playerId: string): string | null {
  const sq = mySquad(gs);
  const p = [...sq.starters, ...sq.bench].find(x => x.id === playerId);
  if (!p) return 'הוא לא בסגל שלך';
  if (gs.emergencyYouth === playerId) return 'הוא רשום רק למחזור הזה, אחריו הוא חוזר לנוער';
  if (squadSize(gs) <= MIN_SQUAD) return `אי אפשר לרדת מתחת ל-${MIN_SQUAD} שחקנים. תחתים מישהו קודם.`;
  return null;
}

/** The ways this man can be let go this week. Empty when none apply. */
export function partOptions(gs: GameState, playerId: string): PartOption[] {
  if (partBlockedReason(gs, playerId)) return [];
  const sq = mySquad(gs);
  const p = [...sq.starters, ...sq.bench].find(x => x.id === playerId)!;
  const tier = club(gs).tier;
  const wage = playerWage(p, tier);
  const out: PartOption[] = [];
  if (transferWindow(gs).open) {
    out.push({
      kind: 'transfer', label: 'תחפש לך קבוצה אחרת', fee: sellPrice(p, tier), wage,
      detail: 'הוא עובר בחלון, והמועדון מקבל 85% מהשווי שלו.',
    });
  } else if (debt(gs).level !== 'clear') {
    out.push({
      kind: 'friends', label: 'נפרדים כידידים', fee: Math.round(transferFee(p, tier) * 0.25 / 1000) * 1000, wage,
      detail: 'החלון סגור והקופה במינוס. הוא משוחרר, המועדון מקבל 25% מהשווי, והשכר שלו יורד מההוצאות מהמחזור הבא.',
    });
  }
  return out;
}

/** Let him go the chosen way. A kind that is not on offer this week does nothing. */
export function partWays(gs: GameState, playerId: string, kind: PartKind): GameState {
  const opt = partOptions(gs, playerId).find(o => o.kind === kind);
  if (!opt) return gs;
  const sq = mySquad(gs);
  const p = [...sq.starters, ...sq.bench].find(x => x.id === playerId)!;
  const gone = removePlayer(gs, playerId);
  // a transfer is to somewhere: he joins a club in this league and plays there
  const moved = kind === 'transfer' ? moveToLeagueClub(gone, p) : { gs: gone, clubId: null };
  const next = moved.gs;
  const buyer = moved.clubId ? gs.league.clubs.find(c => c.id === moved.clubId)?.short : null;
  return {
    ...next,
    meters: { ...next.meters, money: cash(next.meters.money + opt.fee) },
    preResolved: [...next.preResolved, `renew-${playerId}`],
    pendingOutcome: kind === 'transfer'
      ? `${p.name} עבר ל${buyer ?? 'קבוצה אחרת'}. ${formatShekels(opt.fee)} נכנסו לקופה.`
      : `${p.name} שוחרר בהסכמה. ${formatShekels(opt.fee)} נכנסו, ו-${formatShekels(opt.wage)} לשבוע ירדו מההוצאות.`,
  };
}

function formatShekels(n: number): string {
  return n >= 1000 ? `₪${Math.round(n / 1000)}K` : `₪${n}`;
}

export { playerValue, sellPrice, MIN_SQUAD, MAX_SQUAD };

/* ------------------------------------------------------------- friends */

/**
 * Rounds of football this manager has actually played, across every season of
 * the career. This is the number a friend has to reach before he is worth
 * anything to whoever invited him, which is what makes faking an invite cost
 * more than the gem it pays.
 */
export function roundsPlayed(gs: GameState): number {
  const perSeason = gs.league?.rounds ?? 14;
  return Math.max(0, (gs.season - 1) * perSeason + gs.week - 1);
}

/** The code this manager sends back to whoever invited him, once he has played. */
export function thanksCode(gs: GameState): string | null {
  const inviter = gs.invite?.invitedBy;
  if (!inviter) return null;
  const played = roundsPlayed(gs);
  if (played < ROUNDS_TO_COUNT) return null;
  return makeThanks(deviceId(), inviter, played);
}

/** How many more rounds before the thank you code exists. */
export function roundsUntilThanks(gs: GameState): number {
  return Math.max(0, ROUNDS_TO_COUNT - roundsPlayed(gs));
}

/** Remember who brought this manager in, and hand him his welcome gems. */
export function acceptInvite(gs: GameState, ref: string): GameState {
  // only once, and never your own code
  if (gs.invite?.invitedBy || ref === myCode()) return gs;
  return {
    ...gs,
    gems: gs.gems + GEMS_FOR_JOINING,
    invite: { ...(gs.invite ?? emptyInvite()), invitedBy: ref },
  };
}

export interface RedeemResult { gs: GameState; ok: boolean; message: string; }

/** Read a friend's thank you code and pay for him if it holds up. */
export function redeemThanks(gs: GameState, text: string): RedeemResult {
  const state = gs.invite ?? emptyInvite();
  const v = verifyThanks(text, myCode(), state, gs.season);
  if (!v.ok) return { gs, ok: false, message: v.why };
  return {
    gs: { ...gs, gems: gs.gems + GEMS_PER_FRIEND, invite: addClaim(state, v.friend, gs.season) },
    ok: true,
    message: `נספר. ${GEMS_PER_FRIEND} יהלומים נכנסו לחשבון.`,
  };
}

/** Friends counted this season, and how many the cap still allows. */
/** Open and close the invite screen, remembering where the manager was. */
export function openInvite(gs: GameState): GameState {
  return gs.phase === 'invite' ? gs : { ...gs, inviteFrom: gs.phase, phase: 'invite' };
}
export function closeInvite(gs: GameState): GameState {
  return { ...gs, phase: gs.inviteFrom ?? 'hub', inviteFrom: null };
}

export function friendsThisSeason(gs: GameState): number {
  return claimsThisSeason(gs.invite ?? emptyInvite(), gs.season);
}

/* -------------------------------------------------------- gems and packs */

export function openPacks(gs: GameState): GameState {
  return { ...gs, phase: 'packs' };
}

export function adsLeft(gs: GameState): number {
  return Math.max(0, ADS_PER_SEASON - gs.adsWatched);
}

/**
 * The ad reward. Deliberately capped per season: a gem that can be farmed is
 * not a premium currency, and an uncapped ad loop is the thing that makes a
 * game feel like a slot machine.
 */
export function watchAdForGem(gs: GameState): GameState {
  if (adsLeft(gs) <= 0) return gs;
  return { ...gs, gems: gs.gems + GEMS_PER_AD, adsWatched: gs.adsWatched + 1 };
}

export function packBlockedReason(gs: GameState, id: PackId): string | null {
  const spec = packById(id);
  if (gs.gems < spec.cost) return `צריך ${spec.cost} יהלומים`;
  if (squadSize(gs) >= MAX_SQUAD) return `הסגל מלא, מקסימום ${MAX_SQUAD} שחקנים`;
  return null;
}

/**
 * Spend the gems and roll the card. The pull is held on the state rather than
 * applied straight away, so the reveal screen can play out and the manager
 * still gets to choose: into the squad, or sold on for cash.
 */
export function buyPack(gs: GameState, id: PackId): GameState {
  if (packBlockedReason(gs, id)) return gs;
  const spec = packById(id);
  const sq = mySquad(gs);
  const taken = new Set([...sq.starters, ...sq.bench].map(p => p.name));
  // bias the roll toward whichever line is thinnest, so a reward is never a
  // twelfth striker while the defence is bare
  const rng = createRng(gs.seasonSeed + gs.season * 7919 + gs.gems * 131 + gs.adsWatched * 17);
  const pull = openPack(spec, club(gs).tier, rng, { position: thinnestPosition(gs, rng), taken });
  return { ...gs, gems: gs.gems - spec.cost, pull };
}

/** The position the squad is shortest of, for biasing a pack roll. */
function thinnestPosition(gs: GameState, rng: Rng): Position {
  const sq = mySquad(gs);
  const all = [...sq.starters, ...sq.bench];
  const counts: Record<MarketLine, number> = { gk: 0, def: 0, mid: 0, atk: 0 };
  for (const p of all) counts[lineOfPosition(p.position)]++;
  // a keeper is only ever wanted when there are fewer than two
  const order: [MarketLine, number, Position[]][] = [
    ['gk', counts.gk < 2 ? -99 : counts.gk, ['GK']],
    ['def', counts.def, ['CB', 'LB', 'RB']],
    ['mid', counts.mid, ['CDM', 'CM', 'CAM']],
    ['atk', counts.atk, ['ST', 'LW', 'RW']],
  ];
  order.sort((a, b) => a[1] - b[1]);
  const picks = order[0][2];
  return picks[Math.floor(rng() * picks.length)];
}

function lineOfPosition(pos: Position): MarketLine {
  if (pos === 'GK') return 'gk';
  if (pos === 'CB' || pos === 'LB' || pos === 'RB') return 'def';
  if (pos === 'CDM' || pos === 'CM' || pos === 'CAM') return 'mid';
  return 'atk';
}

/** Take the pulled card into the squad, on a short deal. */
export function signPull(gs: GameState): GameState {
  const pull = gs.pull;
  if (!pull) return gs;
  if (squadSize(gs) >= MAX_SQUAD) return gs;
  const sq = mySquad(gs);
  const next = writeSquad(gs, { starters: sq.starters, bench: [...sq.bench, pull.player] });
  return {
    ...next,
    pull: null,
    contracts: { ...gs.contracts, [pull.player.id]: PACK_CONTRACT_YEARS },
  };
}

/** Sell the pulled card on instead. There is never an empty pack. */
export function sellPull(gs: GameState): GameState {
  const pull = gs.pull;
  if (!pull) return gs;
  return {
    ...gs,
    pull: null,
    meters: { ...gs.meters, money: cash(gs.meters.money + pull.cashValue) },
  };
}

/* ---------------------------------------------------------------- the captain */

/**
 * Captaincy score. The armband goes to standing, which here is quality plus the
 * years a player has on him. Pure and explainable, no hidden dice.
 */
export function captainScore(p: Player): number {
  const seniority = Math.min(14, Math.max(0, p.age - 21)) * 0.9;
  return overall(p) + seniority;
}

/** The whole squad, best captaincy candidate first. */
export function captainCandidates(gs: GameState): Player[] {
  const sq = mySquad(gs);
  return [...sq.starters, ...sq.bench].sort((a, b) => captainScore(b) - captainScore(a));
}

/** Who wears the armband. Falls back to the top candidate when unset. */
export function currentCaptainId(gs: GameState): string | null {
  if (gs.captainId && captainCandidates(gs).some(p => p.id === gs.captainId)) return gs.captainId;
  return captainCandidates(gs)[0]?.id ?? null;
}

export function captain(gs: GameState): Player | null {
  const id = currentCaptainId(gs);
  const sq = mySquad(gs);
  return [...sq.starters, ...sq.bench].find(p => p.id === id) ?? null;
}

export function setCaptain(gs: GameState, playerId: string): GameState {
  return { ...gs, captainId: playerId };
}

/* -------------------------------------------------------------- the assistant */

/** Hire the assistant coach, a permanent source of useless encouragement. */
export function hireAssistant(gs: GameState): GameState {
  if (gs.assistant.hired) return gs;
  const rng = createRng(gs.seasonSeed * 53 + 17);
  const name = ASSISTANT_NAMES[Math.floor(rng() * ASSISTANT_NAMES.length)];
  return { ...gs, assistant: { hired: true, name, departed: false } };
}

export function fireAssistant(gs: GameState): GameState {
  return { ...gs, assistant: { hired: false, name: '', departed: false } };
}

/** Is the assistant around to chip in right now. */
export function assistantActive(gs: GameState): boolean {
  return gs.assistant.hired && !gs.assistant.departed;
}

/**
 * When the club reaches ליגה א' the assistant is finally offered a job of his
 * own, and off he goes, still not knowing his 4-4-2 from his elbow. Records the
 * goodbye in the chronicle. No-op until the club actually climbs that high.
 */
export function maybeAssistantDeparture(gs: GameState): GameState {
  if (!gs.assistant.hired || gs.assistant.departed) return gs;
  if (club(gs).tier < ASSISTANT_LEAVES_TIER) return gs;
  const id = `assistant-left-t${club(gs).tier}`;
  if (gs.chronicle.some(e => e.id === id)) return gs;
  const entry: ChronicleEntry = {
    id, kind: 'season_end', week: gs.week, icon: 'handshake', tint: 'gold',
    title: `${gs.assistant.name} עוזב לנהל`,
    body: `הגענו לליגה א׳, ו${gs.assistant.name} קיבל הצעה לנהל קבוצה משלו. הוא לא הבין אף פעם כלום מהמשחק, אבל אהב אותו יותר מכולם. בהצלחה, אלוף.`,
  };
  return {
    ...gs,
    assistant: { ...gs.assistant, departed: true },
    chronicle: [...gs.chronicle, entry],
  };
}

/**
 * The assistant's contribution to any choice: he repeats it back to you. Give
 * him the option labels, he hands you the same options dressed as advice.
 */
export function assistantEcho(gs: GameState, options: string[], salt = 0): string | null {
  if (!assistantActive(gs) || options.length < 2) return null;
  const a = options[0], b = options[1];
  const lines = [
    `אני אומר לך בלב שלם, או ${a} או ${b}. אחד מהם בטוח נכון.`,
    `תשמע, לדעתי ${a}. אבל גם ${b}, אה? קשה להגיד.`,
    `המספרים לא משקרים, אחי. או ${a} או ${b}.`,
    `אתה המאמן, אבל אני הייתי הולך על ${a}. או ${b}, תלוי איך אתה מרגיש.`,
    `יש לי הרגשה ממש טובה על ${a}. או ${b}. הרגשה זה הכל.`,
    `וואי איזו התלבטות. ${a}? ${b}? שתיהן אש. תבחר אתה.`,
  ];
  const rng = createRng(gs.seasonSeed * 131 + gs.week * 7 + salt);
  return lines[Math.floor(rng() * lines.length)];
}

/* ---------------------------------------------------------------- the fans */

/** Build what the terrace regulars actually know about right now. */
export function fanContext(gs: GameState, timing: FanTiming): FanContext {
  const fx = playerFixture(gs);
  const iAmHome = fx ? fx.homeId === gs.clubId : true;
  const oppId = fx ? (iAmHome ? fx.awayId : fx.homeId) : gs.clubId;
  const rival = gs.league.clubs.find(c => c.id === oppId)?.short ?? 'היריבה';
  const sq = mySquad(gs);

  // a forward who has not scored for a while
  let coldStriker: string | null = null;
  let coldWeeks = 0;
  const forwards = sq.starters.filter(p => ['ST', 'LW', 'RW', 'CAM'].includes(p.position));
  for (const p of forwards) {
    const rec = gs.seasonStats[p.id];
    const since = rec?.lastGoalWeek ? gs.week - rec.lastGoalWeek : (rec?.apps ?? 0);
    if (since > coldWeeks) { coldWeeks = since; coldStriker = p.name; }
  }

  const kid = sq.bench.concat(sq.starters).find(p => p.age <= 20);
  const table = sortedTable(gs.league);
  const tablePos = Math.max(1, table.findIndex(s => s.clubId === gs.clubId) + 1);

  let streak = 0;
  for (let i = gs.form.length - 1; i >= 0 && gs.form[i] === 'L'; i--) streak++;

  const ctx: FanContext = {
    timing, isDerby: fx ? isDerby(fx.homeId, fx.awayId) : false,
    isHome: iAmHome, rival, city: club(gs).city,
    coldStriker, coldWeeks,
    youngster: kid?.name ?? null,
    approach: gs.tactic.approach,
    tablePos, totalTeams: gs.league.clubs.length,
    streak,
  };

  if (timing === 'post' && gs.lastPlayerMatch) {
    const r = gs.lastPlayerMatch;
    const my = iAmHome ? r.score[0] : r.score[1];
    const opp = iAmHome ? r.score[1] : r.score[0];
    ctx.result = my > opp ? 'win' : my === opp ? 'draw' : 'loss';
    ctx.scoreLine = `${my}:${opp}`;
    const myGoal = r.events.find(e => (e.type === 'goal' || e.type === 'penalty_goal') && e.teamId === gs.clubId);
    ctx.scorer = myGoal?.playerName ?? null;
  }
  return ctx;
}

/** How many recent fan lines to remember, so the terrace stops repeating. */
export const FAN_HISTORY = 16;

/**
 * The club's timeline, built from what has actually happened this save. Stable
 * for a given week so it does not reshuffle while the manager is reading it.
 */
export function clubFeed(gs: GameState): Post[] {
  const c = club(gs);
  const sq = mySquad(gs);
  const all = [...sq.starters, ...sq.bench];
  const table = sortedTable(gs.league);
  const pos = Math.max(1, table.findIndex(t => t.clubId === gs.clubId) + 1);
  const shortOf = (id: string) => gs.league.clubs.find(x => x.id === id)?.short ?? '';

  // our last match, from the round just played
  const mine = gs.lastRound.find(m => m.homeId === gs.clubId || m.awayId === gs.clubId);
  const last = mine
    ? (() => {
        const home = mine.homeId === gs.clubId;
        return {
          opponent: shortOf(home ? mine.awayId : mine.homeId),
          mine: home ? mine.hg : mine.ag,
          theirs: home ? mine.ag : mine.hg,
          isDerby: isDerby(mine.homeId, mine.awayId),
        };
      })()
    : null;

  // who is scoring, and who has stopped
  const goalsOf = (p: Player) => gs.seasonStats[p.id]?.goals ?? 0;
  const scorer = [...all].sort((a, b) => goalsOf(b) - goalsOf(a))[0];
  const topScorer = scorer && goalsOf(scorer) > 0
    ? { name: scorer.name, goals: goalsOf(scorer) } : null;

  let coldStriker: FeedContext['coldStriker'] = null;
  for (const p of sq.starters.filter(x => ['ST', 'LW', 'RW', 'CAM'].includes(x.position))) {
    const rec = gs.seasonStats[p.id];
    const since = rec?.lastGoalWeek ? gs.week - rec.lastGoalWeek : (rec?.apps ?? 0);
    if (since > (coldStriker?.weeks ?? 0)) coldStriker = { name: p.name, weeks: since };
  }

  const rivalId = c.rivalId;
  const ctx: FeedContext = {
    clubName: c.name, clubShort: c.short, city: c.city,
    league: LEAGUE_NAMES[c.tier] ?? '',
    pos, teams: gs.league.clubs.length,
    form: gs.form,
    last,
    otherResults: gs.lastRound
      .filter(m => m.homeId !== gs.clubId && m.awayId !== gs.clubId)
      .map(m => ({ home: shortOf(m.homeId), away: shortOf(m.awayId), hg: m.hg, ag: m.ag })),
    topScorer,
    coldStriker,
    youngster: [...all].filter(p => p.age <= 21).sort((a, b) => overall(b) - overall(a))[0] ?? null,
    star: [...all].sort((a, b) => overall(b) - overall(a))[0] ?? null,
    marketTarget: gs.market.length ? gs.market[0].player : null,
    rival: rivalId ? shortOf(rivalId) : null,
  };
  return buildFeed(ctx, createRng(gs.seasonSeed * 31 + gs.week * 7 + 3));
}

/** The message shown this week, stable for a given week and timing. */
export function fanNote(gs: GameState, timing: FanTiming): FanMessage {
  const seed = gs.seasonSeed * 977 + gs.week * 41 + (timing === 'pre' ? 1 : 2);
  return fanMessage(fanContext(gs, timing), createRng(seed), gs.fanHistory);
}

/* ------------------------------------------------------------- scouting */

export interface Scout {
  oppShort: string;
  mine: number;
  opp: number;
  iAmHome: boolean;
  /** who the bookies would back */
  verdict: 'favourite' | 'even' | 'underdog';
  /** a plain read for the manager, tuned to the matchup */
  line: string;
}

function avgStarterOvr(sq: Squad): number {
  const xs = sq.starters.map(overall);
  return xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
}

/** What we know about this week's opponent, shown before picking a tactic. */
export function matchupScout(gs: GameState): Scout | null {
  const fx = playerFixture(gs);
  if (!fx) return null;
  const iAmHome = fx.homeId === gs.clubId;
  const oppId = iAmHome ? fx.awayId : fx.homeId;
  const oppClub = gs.league.clubs.find(c => c.id === oppId)!;
  const mine = avgStarterOvr(mySquad(gs));
  const opp = avgStarterOvr(gs.league.squads[oppId]);
  // a home game is worth roughly a couple of rating points on the read
  const edge = (mine - opp) + (iAmHome ? 2 : -1);
  const verdict: Scout['verdict'] = edge >= 4 ? 'favourite' : edge <= -4 ? 'underdog' : 'even';

  const derby = isDerby(gs.clubId, oppId);
  const pool = derby ? SCOUT_LINES.derby : SCOUT_LINES[verdict];
  // stable for this fixture, different from one round to the next, so the same
  // advice does not greet him fourteen weeks running
  const line = pool[lineSeed(`${gs.season}|${gs.week}|${oppId}`) % pool.length];

  return { oppShort: oppClub.short, mine: Math.round(mine), opp: Math.round(opp), iAmHome, verdict, line };
}

/**
 * What the assistant says before a tactic is picked.
 *
 * One fixed line per verdict used to do this, and one of the three ended with
 * "אל תיפתחו מטומטם", which is not a thing a coach says and is not advice
 * either. These are: every line names something the manager can actually go and
 * do on the tactic screen he is about to open — a shape, a line of defence, a
 * way of playing — so the read of the opponent turns into a decision instead of
 * a mood.
 *
 * A derby has its own pool, because a derby is not a harder or easier fixture,
 * it is a different kind of night.
 */
const SCOUT_LINES: Record<'favourite' | 'underdog' | 'even' | 'derby', string[]> = {
  favourite: [
    'על הנייר אתם חזקים יותר. אל תשחקו פתוח — אמצע חזק, ותנו להם לבוא אליכם.',
    'אתם הקבוצה הטובה יותר, אז הסכנה כאן היא מתפרצת. קו הגנה מסודר ולא לרוץ קדימה כולם ביחד.',
    'הפער לטובתכם. תחזיקו כדור, תשחקו סבלני, ואל תיתנו להם מצבים במתנה.',
    'אתם פייבוריט. תיכנסו רציני מהדקה הראשונה, קבוצה כזאת חיה על רבע שעה של הפתעה.',
  ],
  underdog: [
    'הם טובים מכם. קו הגנה נמוך, אמצע צפוף, ומתפרצות. לא להתפתות.',
    'על הנייר אתם מתחת. תשחקו סגור ותיקחו את המשחק לכדורים עומדים ולפרטים.',
    'הם חזקים. משחק פתוח מול קבוצה כזאת נגמר רע, תשמרו על הרשת וחכו לרגע.',
    'קבוצה מעליכם. תסבלו, תישארו במשחק עד ה-70, ואז תראו מה יש על הספסל.',
  ],
  even: [
    'מאבק שקול. מי שייקח את האמצע ייקח את המשחק, אז אל תוותרו עליו.',
    'קבוצות באותה רמה. תשחקו מאוזן ואל תיפתחו — השער הראשון פה שווה כפול.',
    'שקול לגמרי. תשמרו על הכדור, אל תמהרו, ותנצלו כל כדור עומד שתקבלו.',
    'אין פייבוריט. תשמרו כוחות לרבע השעה האחרונה, שם המשחק הזה ייפול.',
  ],
  derby: [
    'דרבי. תשכחו מהטבלה, תיכנסו חזק מהדקה הראשונה — פה מי שרוצה יותר לוקח.',
    'דרבי. היציע לא יסלח על משחק רך, אבל בלי כרטיסים מיותרים. הרחקה כאן הורגת משחק.',
    'זה דרבי. אמצע חזק וקור רוח, ואל תיסחפו אחרי האווירה.',
    'דרבי. אל תשחקו פתוח בשביל הכבוד, תוצאה אחת מספיקה כדי להציל עונה.',
  ],
};

/** Stable 0..999 from a string, so a fixture always gets the same line. */
function lineSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 1000;
}

export interface MatchPreview {
  home: Club; away: Club;
  homeOvr: number; awayOvr: number;
  iAmHome: boolean; isDerby: boolean;
  myForm: ('W' | 'D' | 'L')[];
  verdict: Scout['verdict'];
  line: string;
  /** men you sold who now wear the other shirt */
  exes: string[];
}

/** Everything the cinematic VS screen needs before kickoff. */
export function matchPreview(gs: GameState): MatchPreview | null {
  const fx = playerFixture(gs);
  const scout = matchupScout(gs);
  if (!fx || !scout) return null;
  const home = gs.league.clubs.find(c => c.id === fx.homeId)!;
  const away = gs.league.clubs.find(c => c.id === fx.awayId)!;
  // the starting eleven's real average, same figure the scout and squad screen
  // use, so the number here matches everywhere else
  const ovrOf = (id: string) => Math.round(avgStarterOvr(gs.league.squads[id]));
  return {
    home, away,
    homeOvr: ovrOf(fx.homeId), awayOvr: ovrOf(fx.awayId),
    iAmHome: scout.iAmHome, isDerby: isDerby(fx.homeId, fx.awayId),
    myForm: gs.form.slice(-5),
    exes: exesAtNextOpponent(gs).map(e => e.name),
    verdict: scout.verdict, line: scout.line,
  };
}

/* --------------------------------------------------------------- the week */

function topPlayerName(sq: Squad): string {
  const best = [...sq.starters].sort((a, b) => overall(b) - overall(a))[0];
  return surnameOf(best.name);
}

const FORWARD = new Set(['ST', 'CF', 'SS', 'LW', 'RW']);
const surname = surnameOf;

/**
 * The facts a dilemma is allowed to know about you. Everything here comes from
 * the live save, so the reserve who corners you really is the man you have not
 * picked, and the table position he quotes is the one on your screen.
 */
function dilemmaCtx(gs: GameState, star: string, rivalShort: string, rivalId: string): DilemmaCtx {
  const sq = mySquad(gs);
  // The ראש העין regulars are never the man asking to leave or demanding a move.
  // He lives up the road, the club is his home, and the whole point of him is
  // that he stayed. He is still eligible to be the scorer or the veteran, which
  // are things that happen TO him rather than demands he makes.
  const all = [...sq.starters, ...sq.bench].filter(p => !isLegend(p));
  const apps = (p: Player) => gs.seasonStats[p.id]?.apps ?? 0;
  const goals = (p: Player) => gs.seasonStats[p.id]?.goals ?? 0;

  // the forgotten man: fewest appearances, bench first, oldest as the tie break
  const forgotten = [...sq.bench, ...sq.starters].filter(p => !isLegend(p))
    .sort((a, b) => apps(a) - apps(b) || b.age - a.age)[0];
  const kid = all.filter(p => p.age <= 20).sort((a, b) => overall(b) - overall(a))[0];
  const old = all.filter(p => p.age >= 32).sort((a, b) => b.age - a.age)[0];
  const scorer = [...all].sort((a, b) => goals(b) - goals(a))[0];
  const drought = all
    .filter(p => FORWARD.has(p.position) && goals(p) === 0 && apps(p) >= 3)
    .sort((a, b) => apps(b) - apps(a))[0];

  const table = sortedTable(gs.league);
  const pos = Math.max(1, table.findIndex(t => t.clubId === gs.clubId) + 1);

  return {
    star, rival: rivalShort, club: club(gs).short, money: cash(gs.meters.money),
    benched: forgotten && apps(forgotten) <= 1 ? surname(forgotten.name) : '',
    benchedApps: forgotten ? apps(forgotten) : 0,
    youngster: kid ? surname(kid.name) : '',
    veteranName: old ? surname(old.name) : '',
    scorer: scorer && goals(scorer) > 0 ? surname(scorer.name) : '',
    dry: drought ? surname(drought.name) : '',
    // the academy, for the youth coach: his best kid, and the first three by name
    academy: [...gs.youth.players].sort((a, b) => overall(b) - overall(a))[0]?.name ?? '',
    kids3: gs.youth.players.length >= 3
      ? gs.youth.players.slice(0, 3).map(p => surname(p.name)).reduce((s, n, i, a) => i === 0 ? n : i === a.length - 1 ? `${s} ו${n}` : `${s}, ${n}`, '')
      : '',
    squadSize: squadSize(gs),
    pos, teams: gs.league.clubs.length,
    week: gs.week,
    isDerby: isDerby(gs.clubId, rivalId),
  };
}

export function startWeek(gs: GameState): GameState {
  // the sheet has to be in order first: nobody banned in the eleven, sixteen names
  if (weekBlockedReason(gs)) return gs;
  const fx = playerFixture(gs);
  const rivalId = fx ? (fx.homeId === gs.clubId ? fx.awayId : fx.homeId) : gs.clubId;
  const rival = gs.league.clubs.find(c => c.id === rivalId)!;
  const myClub = club(gs);
  const star = topPlayerName(mySquad(gs));
  const rng = createRng(gs.seasonSeed * 100 + gs.week * 7 + 3);

  // only templates that fit the live save, then a long cooldown so a season
  // of rounds keeps surfacing something you have not seen yet
  const ctx = dilemmaCtx(gs, star, rival.short, rivalId);
  const recent = new Set(gs.dilemmaHistory.slice(-8));
  const pick = (kind: 'now' | 'inbox'): RolledDilemma | null => {
    const fits = eligible(ctx, kind);
    if (!fits.length) return null;
    const fresh = fits.filter(t => !recent.has(t.id));
    const source = fresh.length ? fresh : fits;
    return rollDilemma(source[Math.floor(rng() * source.length)], ctx, rng);
  };

  // the blocking one is about the match you are walking into
  const urgent = pick('now')
    ?? rollDilemma(TEMPLATES[Math.floor(rng() * TEMPLATES.length)], ctx, rng);

  // and something that can wait lands in the inbox, capped so it never piles up
  const inbox = [...gs.inbox];
  if (inbox.length < INBOX_CAP && rng() < 0.6) {
    const waiting = pick('inbox');
    if (waiting && !inbox.some(m => m.id === waiting.id)) inbox.push(waiting);
  }

  // remember the pre match line the hub just showed, so it will not come round
  // again for a while
  const fanHistory = [...gs.fanHistory, fanNote(gs, 'pre').id].slice(-FAN_HISTORY);

  return { ...gs, phase: 'dilemma', dilemma: urgent, inbox, fanHistory };
}

/**
 * A promise made in a dilemma is kept in the save. Choosing to release the man
 * who asked really removes him, and the outcome says who left and how many are
 * left, so the manager can check his own decision against the squad screen.
 * Never below eleven plus a bench, whatever the fiction wants.
 */
function keepThePromise(gs: GameState, rolled: RolledDilemma, opt: RolledDilemma['options'][number]): { gs: GameState; note: string } {
  let note = '';
  if (opt.release && rolled.subjectName && squadSize(gs) > 14) {
    const him = subjectOf(gs, rolled.subjectName);
    if (him) {
      gs = removePlayer(gs, him.id);
      note = ` ${him.name} עזב, ונשארתם עם ${squadSize(gs)} שחקנים.`;
    }
  }
  const acted = applyActs(gs, rolled, opt.act ?? []);
  return { gs: acted.gs, note: note + acted.note };
}

/* ----------------------------------------------------- answers that act */

/** The dilemma names a man by surname; find him in the squad. */
function subjectOf(gs: GameState, surnameOrName: string): Player | undefined {
  const sq = mySquad(gs);
  const all = [...sq.starters, ...sq.bench];
  return all.find(x => x.name === surnameOrName) ?? all.find(x => surname(x.name) === surnameOrName);
}

/** Resolve who an act is about against the live squad. */
function whoIs(gs: GameState, rolled: RolledDilemma, who: Who): Player | undefined {
  const sq = mySquad(gs);
  const all = [...sq.starters, ...sq.bench];
  switch (who) {
    case 'subject': return rolled.subjectName ? subjectOf(gs, rolled.subjectName) : undefined;
    case 'star': return [...all].sort((a, b) => overall(b) - overall(a))[0];
    case 'gk': return sq.starters.find(p => p.position === 'GK') ?? all.find(p => p.position === 'GK');
    case 'captain': return captain(gs) ?? undefined;
    case 'striker': return [...sq.starters].filter(p => FORWARD.has(p.position)).sort((a, b) => overall(b) - overall(a))[0]
      ?? [...all].filter(p => FORWARD.has(p.position)).sort((a, b) => overall(b) - overall(a))[0];
    case 'dry': case 'benched': return rolled.subjectName ? subjectOf(gs, rolled.subjectName) : undefined;
    case 'academy': return undefined;
  }
}

/** Take a man out of the eleven for a bench man of the same kind, if he is in it. */
function benchHim(gs: GameState, id: string): GameState {
  const sq = mySquad(gs);
  const si = sq.starters.findIndex(p => p.id === id);
  if (si < 0) return gs;
  const him = sq.starters[si];
  const isGk = him.position === 'GK';
  const sub = sq.bench.find(p => (p.position === 'GK') === isGk && !isUnavailable(gs, p.id) && !(gs.sitOut[p.id]));
  if (!sub) return gs;
  return swapPlayers(gs, him.id, sub.id);
}

/** Put a man into the eleven, for the weakest of his line, if he is not in it. */
function startHim(gs: GameState, id: string): GameState {
  const sq = mySquad(gs);
  if (sq.starters.some(p => p.id === id)) return gs;
  const him = sq.bench.find(p => p.id === id);
  if (!him) return gs;
  const isGk = him.position === 'GK';
  const line = LINE[him.position] ?? 'MID';
  const out = [...sq.starters]
    .filter(p => (p.position === 'GK') === isGk && (isGk || (LINE[p.position] ?? 'MID') === line))
    .sort((a, b) => overall(a) - overall(b))[0]
    ?? [...sq.starters].filter(p => (p.position === 'GK') === isGk).sort((a, b) => overall(a) - overall(b))[0];
  if (!out) return gs;
  return swapPlayers(gs, out.id, him.id);
}

/** A signing the agent or the owner brings, built to the pitch that sold him. */
function agentSigning(gs: GameState, profile: 'dropped' | 'brazilian' | 'veteran' | 'striker'): Player {
  const tier = club(gs).tier;
  const rng = createRng(gs.seasonSeed * 19 + gs.week * 3 + 77);
  const used = new Set([...mySquad(gs).starters, ...mySquad(gs).bench].map(p => p.name));
  const ceiling = leagueCeiling(tier);
  const p = profile === 'striker' ? makePlayer('ST', ceiling + 3, rng, undefined, used)
    : profile === 'dropped' ? makePlayer(['CM', 'CB', 'RW'][Math.floor(rng() * 3)] as Position, ceiling + 4, rng, undefined, used)
    : profile === 'brazilian' ? makePlayer(['CAM', 'LW'][Math.floor(rng() * 2)] as Position, ceiling + 1, rng, undefined, used)
    : makePlayer(['CB', 'CM'][Math.floor(rng() * 2)] as Position, ceiling + 2, rng, undefined, used);
  if (profile === 'dropped') p.age = 31;
  if (profile === 'veteran') p.age = 34;
  if (profile === 'brazilian') { p.attrs.dribbling = Math.min(99, p.attrs.dribbling + 8); p.attrs.passing = Math.min(99, p.attrs.passing + 4); }
  return p;
}

/**
 * Do what the answer said. Each act touches the save in the smallest honest
 * way, and the note that comes back is appended to the outcome so the
 * manager can check the squad screen against what he was just told.
 */
function applyActs(gs: GameState, rolled: RolledDilemma, acts: Act[]): { gs: GameState; note: string } {
  let note = '';
  for (const a of acts) {
    switch (a.kind) {
      case 'sit': {
        const him = whoIs(gs, rolled, a.who);
        if (!him) break;
        gs = benchHim({ ...gs, sitOut: { ...gs.sitOut, [him.id]: a.label } }, him.id);
        break;
      }
      case 'play': {
        const him = whoIs(gs, rolled, a.who);
        if (!him) break;
        gs = startHim(gs, him.id);
        break;
      }
      case 'fitness': {
        const him = whoIs(gs, rolled, a.who);
        if (!him) break;
        const fitness = { ...(gs.matchMods.fitness ?? {}), [him.id]: (gs.matchMods.fitness?.[him.id] ?? 0) + a.delta };
        gs = { ...gs, matchMods: { ...gs.matchMods, fitness } };
        break;
      }
      case 'injury': {
        const him = whoIs(gs, rolled, a.who);
        if (!him) break;
        gs = { ...gs, matchMods: { ...gs.matchMods, injury: { ...(gs.matchMods.injury ?? {}), [him.id]: a.risk } } };
        break;
      }
      case 'mud': gs = { ...gs, matchMods: { ...gs.matchMods, mud: true } }; break;
      case 'formation': gs = { ...gs, tactic: { ...gs.tactic, formation: a.id } }; break;
      case 'gate': gs = { ...gs, matchMods: { ...gs.matchMods, gate: (gs.matchMods.gate ?? 1) * a.mult } }; break;
      case 'promiseWin': gs = { ...gs, matchMods: { ...gs.matchMods, promiseWin: true } }; break;
      case 'guest': {
        const rng = createRng(gs.seasonSeed * 11 + gs.week * 5 + 9);
        const used = new Set([...mySquad(gs).starters, ...mySquad(gs).bench].map(p => p.name));
        const boy = makePlayer('CM', leagueCeiling(club(gs).tier) - 14, rng, undefined, used);
        boy.age = 19;
        gs = { ...gs, matchMods: { ...gs.matchMods, guest: boy } };
        break;
      }
      case 'sign': {
        if (squadSize(gs) >= MAX_SQUAD) { note += ' הסגל מלא, הוא לא נכנס.'; break; }
        const p = agentSigning(gs, a.profile);
        const sq = mySquad(gs);
        gs = { ...writeSquad(gs, { starters: sq.starters, bench: [...sq.bench, p] }), contracts: { ...gs.contracts, [p.id]: 1 } };
        note += ` ${p.name} (${p.position}, ${overall(p)}) הצטרף לסגל.`;
        break;
      }
      case 'promote': {
        const kid = [...gs.youth.players].sort((a, b) => overall(b) - overall(a))[0];
        if (!kid || squadSize(gs) >= MAX_SQUAD) break;
        const sq = mySquad(gs);
        gs = {
          ...writeSquad(gs, { starters: sq.starters, bench: [...sq.bench, kid] }),
          youth: { ...gs.youth, players: gs.youth.players.filter(p => p.id !== kid.id), ready: gs.youth.ready.filter(n => n !== kid.name) },
          contracts: { ...gs.contracts, [kid.id]: 3 },
        };
        break;
      }
      case 'sell': {
        const him = whoIs(gs, rolled, a.who);
        if (!him || squadSize(gs) <= MIN_SQUAD) { note += ' הסגל על המינימום, המכירה נדחתה.'; break; }
        const moved = moveToLeagueClub(removePlayer(gs, him.id), him);
        const buyer = gs.league.clubs.find(c => c.id === moved.clubId)?.short ?? 'קבוצה אחרת';
        gs = { ...moved.gs, preResolved: [...moved.gs.preResolved, `renew-${him.id}`] };
        note += `|buyerClub=${buyer}`;
        break;
      }
      case 'summerExit': {
        const him = whoIs(gs, rolled, a.who);
        if (him && !gs.summerExits.includes(him.id)) gs = { ...gs, summerExits: [...gs.summerExits, him.id] };
        break;
      }
      case 'follow': gs = { ...gs, followUps: [...gs.followUps, { season: gs.season, week: gs.week + a.weeks, title: a.title, body: a.body }] }; break;
      case 'youthBoost': gs = { ...gs, youthBoost: [...new Set([...gs.youthBoost, ...gs.youth.players.slice(0, 3).map(p => p.name)])] }; break;
      case 'youthLeaveRisk': {
        const kid = [...gs.youth.players].sort((a, b) => overall(b) - overall(a))[0];
        if (kid) gs = { ...gs, youthLeaveRisk: { name: kid.name, p: a.p } };
        break;
      }
    }
  }
  return { gs, note };
}

/** The outcome text, with anything only the acts could know filled in. */
function finishOutcome(outcome: string, note: string): string {
  const m = note.match(/\|buyerClub=([^|]+)$/);
  const clean = note.replace(/\|buyerClub=[^|]+$/, '');
  return outcome.replace('{buyerClub}', m?.[1] ?? 'קבוצה אחרת') + clean;
}

export function chooseDilemma(gs: GameState, optionIndex: number): GameState {
  const rolled = gs.dilemma;
  if (!rolled) return gs;
  const opt = rolled.options[optionIndex];
  const e: DilemmaEffect = opt.effect;
  const kept = keepThePromise(gs, rolled, opt);
  gs = kept.gs;
  return {
    ...gs,
    meters: {
      money: cash(gs.meters.money + (e.money ?? 0)),
      morale: moraleShift(gs.meters.morale, (e.morale ?? 0)),
      prestige: meter(gs.meters.prestige + (e.prestige ?? 0)),
    },
    pendingOutcome: finishOutcome(opt.outcome, kept.note),
    style: scoreStyle(gs.style, e),
    dilemmaHistory: [...gs.dilemmaHistory, rolled.id],
  };
}

export function toTactic(gs: GameState): GameState {
  return { ...gs, phase: 'tactic', dilemma: null, pendingOutcome: null };
}

/* ------------------------------------------------------------- the inbox */

export const INBOX_CAP = 3;

export function openInbox(gs: GameState): GameState {
  return { ...gs, phase: 'inbox', pendingOutcome: null };
}
export function closeInbox(gs: GameState): GameState {
  return { ...gs, phase: 'hub', pendingOutcome: null };
}

/** Answer a message that was waiting. Same weight as a matchday dilemma. */
export function answerInbox(gs: GameState, itemIndex: number, optionIndex: number): GameState {
  const item = gs.inbox[itemIndex];
  if (!item) return gs;
  const opt = item.options[optionIndex];
  if (!opt) return gs;
  const e: DilemmaEffect = opt.effect;
  const kept = keepThePromise(gs, item, opt);
  gs = kept.gs;
  return {
    ...gs,
    meters: {
      money: cash(gs.meters.money + (e.money ?? 0)),
      morale: moraleShift(gs.meters.morale, (e.morale ?? 0)),
      prestige: meter(gs.meters.prestige + (e.prestige ?? 0)),
    },
    pendingOutcome: finishOutcome(opt.outcome, kept.note),
    style: scoreStyle(gs.style, e),
    dilemmaHistory: [...gs.dilemmaHistory, item.id],
    inbox: gs.inbox.filter((_, i) => i !== itemIndex),
  };
}

/** Dismiss the outcome bubble and go back to the list. */
export function clearInboxOutcome(gs: GameState): GameState {
  return { ...gs, pendingOutcome: null };
}
export function setTactic(gs: GameState, tactic: Tactic): GameState {
  return { ...gs, tactic };
}

/* --------------------------------------------------------------- the match */

function teamInput(gs: GameState, clubId: string, isHome: boolean, tactic?: Tactic): TeamInput {
  const sq = gs.league.squads[clubId];
  const c = gs.league.clubs.find(x => x.id === clubId)!;
  const players: Player[] = sq.starters.map(p => ({ ...p }));
  const t = tactic ?? { approach: 'balanced' as Approach, press: 'mid' as Press, formation: DEFAULT_FORMATION };
  const mine = clubId === gs.clubId;
  if (mine) {
    const bias = (gs.meters.morale - 65) / 100;
    players.forEach(p => { p.morale = clamp(p.morale + bias * 20, 0, 100); });
  }
  return {
    id: clubId, name: c.name, players,
    // your shape is the one you picked, every other club keeps its own
    tactic: { formation: mine ? (t.formation ?? DEFAULT_FORMATION) : formationForClub(clubId), approach: t.approach, press: t.press },
    // your side plays to the manager on the touchline, the AI keeps the
    // neutral baseline the engine was calibrated against
    chemistry: mine ? coachChemistry(gs.coach) : 0.7,
    coach: mine ? { att: coachAttBias(gs.coach), def: coachDefBias(gs.coach) } : undefined,
    isHome,
  };
}

export function simulatePlayerMatch(gs: GameState, momentPick: number | null): MatchResult {
  const fx = playerFixture(gs)!;
  const seedBase = gs.seasonSeed * 1000 + gs.week * 17 + (momentPick ?? 0) * 3;
  const home = fx.homeId === gs.clubId ? teamInput(gs, fx.homeId, true, gs.tactic) : teamInput(gs, fx.homeId, true);
  const away = fx.awayId === gs.clubId ? teamInput(gs, fx.awayId, false, gs.tactic) : teamInput(gs, fx.awayId, false);
  return simulateMatch(home, away, seedBase);
}

/** Everything the live match engine needs to start from the current state. */
export function liveMatchInput(gs: GameState) {
  const fx = playerFixture(gs)!;
  const iAmHome = fx.homeId === gs.clubId;
  const oppId = iAmHome ? fx.awayId : fx.homeId;
  // a banned man or the registered youth is on the sheet, never on the grass.
  // The hub will not start a round with a banned man in the eleven, but if
  // anything ever gets past that, the shape is refilled from the bench here
  const sq = mySquad(gs);
  const ok = (p: Player) => !isUnavailable(gs, p.id);
  let starters = sq.starters.filter(ok);
  let bench = sq.bench.filter(ok);
  if (starters.length < 11) {
    starters = fillFormation([...starters, ...bench], formation(gs.tactic.formation)).slice(0, 11);
    bench = bench.filter(p => !starters.includes(p));
  }
  // what this week's answers did to the match: a man playing hurt or fired up,
  // a pitch that is mud for both sides, the owner's boy waiting on the bench
  const mods = gs.matchMods;
  const tuned = (p: Player, mine: boolean): Player => {
    let q = p;
    const d = mine ? mods.fitness?.[p.id] : undefined;
    if (d) q = { ...q, fitness: Math.max(20, Math.min(100, q.fitness + d)) };
    if (mods.mud) q = { ...q, attrs: { ...q.attrs, passing: Math.max(20, q.attrs.passing - 8), pace: Math.max(20, q.attrs.pace - 8) } };
    return q;
  };
  const mine = {
    starters: starters.map(p => tuned(p, true)),
    bench: [...bench.map(p => tuned(p, true)), ...(mods.guest ? [mods.guest] : [])],
  };
  const oppSq = gs.league.squads[oppId];
  const opp = { starters: oppSq.starters.map(p => tuned(p, false)), bench: oppSq.bench.map(p => tuned(p, false)) };
  const homeClub = gs.league.clubs.find(c => c.id === fx.homeId)!;
  const awayClub = gs.league.clubs.find(c => c.id === fx.awayId)!;
  return {
    seed: gs.seasonSeed * 1000 + gs.week * 17,
    homeId: fx.homeId, homeName: homeClub.name,
    awayId: fx.awayId, awayName: awayClub.name,
    iAmHome,
    playerStarters: mine.starters, playerBench: mine.bench, playerTactic: gs.tactic,
    oppStarters: opp.starters, oppBench: opp.bench,
    guestId: mods.guest?.id ?? null,
    moraleBias: (gs.meters.morale - 65) / 100,
    captainId: currentCaptainId(gs),
    coach: {
      chemistry: coachChemistry(gs.coach),
      att: coachAttBias(gs.coach),
      def: coachDefBias(gs.coach),
      cards: coachCardBias(gs.coach),
    },
  };
}

export function commitRound(gs: GameState, playerResult: MatchResult): GameState {
  const fx = playerFixture(gs)!;
  const table = cloneTable(gs.league.table);
  const roundResults: RoundResult[] = [];

  applyResult(table, fx.homeId, fx.awayId, playerResult.score[0], playerResult.score[1]);
  roundResults.push({ homeId: fx.homeId, awayId: fx.awayId, hg: playerResult.score[0], ag: playerResult.score[1] });

  // the whole division's season record, so the scoring charts are a real race
  const seasonStats: Record<string, PlayerSeason> = {};
  for (const k of Object.keys(gs.seasonStats)) seasonStats[k] = { ...gs.seasonStats[k] };

  const rec = (id: string, name: string, clubId: string): PlayerSeason => {
    const r = seasonStats[id] ?? blankSeason(name, clubId);
    if (!r.name) r.name = name;
    if (!r.clubId) r.clubId = clubId;
    seasonStats[id] = r;
    return r;
  };
  /** everyone who started gets an appearance, goals and assists come off events */
  const logMatch = (homeId: string, awayId: string, events: { type: string; teamId: string; playerId?: string; playerName?: string; assistId?: string; assistName?: string }[]) => {
    for (const cid of [homeId, awayId]) {
      for (const p of gs.league.squads[cid]?.starters ?? []) rec(p.id, p.name, cid).apps += 1;
    }
    for (const e of events) {
      if (e.type !== 'goal' && e.type !== 'penalty_goal') continue;
      if (e.playerId) {
        const r = rec(e.playerId, e.playerName ?? '', e.teamId);
        r.goals += 1;
        r.lastGoalWeek = gs.week;
      }
      if (e.assistId) rec(e.assistId, e.assistName ?? '', e.teamId).assists += 1;
    }
  };

  logMatch(fx.homeId, fx.awayId, playerResult.events);

  const others = gs.league.fixtures.filter(f =>
    f.round === gs.week && f.homeId !== gs.clubId && f.awayId !== gs.clubId);
  for (const f of others) {
    const r = simulateMatch(
      teamInput(gs, f.homeId, true), teamInput(gs, f.awayId, false),
      gs.seasonSeed * 1000 + gs.week * 17 + hashPair(f.homeId, f.awayId),
    );
    applyResult(table, f.homeId, f.awayId, r.score[0], r.score[1]);
    roundResults.push({ homeId: f.homeId, awayId: f.awayId, hg: r.score[0], ag: r.score[1] });
    logMatch(f.homeId, f.awayId, r.events);
  }

  const iAmHome = fx.homeId === gs.clubId;
  const myGoals = iAmHome ? playerResult.score[0] : playerResult.score[1];
  const oppGoals = iAmHome ? playerResult.score[1] : playerResult.score[0];
  const won = myGoals > oppGoals, draw = myGoals === oppGoals;
  const prize = matchPrize(club(gs).tier, won ? 'W' : draw ? 'D' : 'L');
  // a motivator lifts the room after any result, a cold coach lets it sag
  const moraleDelta = (won ? +4 : draw ? -1 : -6) + coachMoraleBias(gs.coach);

  const derby = isDerby(fx.homeId, fx.awayId);
  // the week also costs money to run, so a result is a real financial event
  const costs = roundCosts({
    squad: mySquad(gs), tier: club(gs).tier, isHome: iAmHome,
    isDerby: derby, rounds: gs.league.rounds,
  });
  // a home crowd pays at the gate, the reward for a bigger ground
  const gate = iAmHome ? Math.round(gateIncome(homeAttendance(gs, derby), club(gs).tier) * (gs.matchMods.gate ?? 1)) : 0;
  // the shirt pays every week, and the crowd deal pays on who actually turns up
  const shirt = sponsorRound(gs.sponsor, club(gs).tier, homeAttendance(gs, derby));
  // and the boards around the pitch are bought for the ground, crowd or no crowd
  const boards = gs.sponsor ? signageRound(club(gs).tier, gs.stadium.capacity) : 0;
  // any build in progress moves a round closer to opening
  const built = advanceStadium(gs);

  const nextBase: GameState = {
    ...gs,
    phase: 'result',
    lastLedger: { prize, gate, sponsor: shirt, signage: boards, ...costs, net: prize + gate + shirt + boards - costs.total },
    meters: {
      money: cash(gs.meters.money + prize + gate + shirt + boards - costs.total),
      morale: moraleShift(gs.meters.morale, moraleDelta),
      prestige: meter(gs.meters.prestige + (won ? 2 : draw ? 0 : -1)),
    },
    league: { ...gs.league, table },
    stadium: built.stadium,
    stadiumReveal: built.reveal,
    lastPlayerMatch: playerResult,
    lastRound: roundResults,
    seasonStats,
    suspensions: bookSuspensions(gs, playerResult),
    // a man who played hurt may pay for it next round; a promise to the terrace
    // that was not kept comes back to the hub next week
    sitOutNext: settleInjuries(gs),
    followUps: gs.matchMods.promiseWin && !won
      ? [...gs.followUps, { season: gs.season, week: gs.week + 1, title: 'היציע זוכר', body: 'הבטחת להם שלא תפסידו בדרבי. הם באו, הם שרו, והם זוכרים. מנהיג היציע: "בפעם הבאה אל תבטיח. תעשה."' }]
      : gs.followUps,
    form: [...gs.form, won ? 'W' : draw ? 'D' : 'L'].slice(-6) as ('W'|'D'|'L')[],
    seasonOver: gs.week + 1 > gs.league.rounds,
  };

  const newEntries = chronicleAfterRound(gs, nextBase, playerResult);
  const extra = built.done ? [built.done, ...newEntries] : newEntries;
  const withChron = extra.length ? { ...nextBase, chronicle: [...nextBase.chronicle, ...extra] } : nextBase;
  // The crisis lands after the books are read for this round, so the week the
  // money disappears is never also the week you are sacked. The warning has to
  // come first, always.
  return maybeCrisis(checkTheBooks(withChron, !won && !draw));
}

/**
 * The owner reads the ledger the moment the round is settled. Past the line
 * there is no appeal and no waiting for the season to end: the result screen
 * still shows, and the letter is waiting behind it.
 */
function checkTheBooks(gs: GameState, lost: boolean): GameState {
  if (gs.sacking) return gs;
  const d = debt(gs);
  // An owner does not sack a manager on a Tuesday because of a spreadsheet. He
  // waits for a defeat and uses it. Past the line and still winning, you keep
  // your job another week, which is the difference between a rule and a story.
  if (d.level !== 'sacked' || !lost) return gs;
  const c = club(gs);
  const table = sortedTable(gs.league);
  const sacking: Sacking = {
    reason: 'debt', debt: d.debt, limit: d.limit,
    week: gs.week, season: gs.season,
    league: LEAGUE_NAMES[c.tier],
    clubId: c.id, club: c.name, short: c.short, city: c.city, tier: c.tier,
    position: Math.max(1, table.findIndex(x => x.clubId === gs.clubId) + 1),
    teams: table.length,
  };
  return {
    ...gs,
    sacking,
    chronicle: [...gs.chronicle, {
      id: `sacked-s${gs.season}`,
      kind: 'sacked' as const,
      week: gs.week,
      title: 'פוטרת',
      body: `${debtLine(d)} מקום ${sacking.position} מתוך ${sacking.teams} ב${sacking.league}, ושם זה נגמר.`,
      icon: 'alert' as const,
      tint: 'loss' as const,
    }],
  };
}

/**
 * How far back the reporter and the phone remember. A season is about
 * fourteen rounds, two questions a round, so twelve questions is roughly the
 * last six weeks, and eight chats is more than a season of buzzes: neither
 * repeats itself inside a run the manager would still remember.
 */
const PRESS_MEMORY = 12;
const CHAT_MEMORY = 8;

/** From the result screen, the reporter is waiting outside. */
export function continueFromResult(gs: GameState): GameState {
  gs = { ...gs, stadiumReveal: null };   // the unveil has had its moment
  // no press room, no next week: the owner is waiting
  if (gs.sacking) return { ...gs, phase: 'sacked', press: null, chat: null };
  // the warning he gets before it, delivered once, in person
  const lvl = debt(gs).level;
  if ((lvl === 'final' || lvl === 'sacked') && gs.ultimatumSeason !== gs.season) {
    return { ...gs, phase: 'ultimatum', ultimatumSeason: gs.season, press: null, chat: null };
  }
  const r = gs.lastPlayerMatch;
  const fx = playerFixture(gs);
  if (!r || !fx) return advancePastPress(gs);

  const iAmHome = fx.homeId === gs.clubId;
  const myGoals = iAmHome ? r.score[0] : r.score[1];
  const oppGoals = iAmHome ? r.score[1] : r.score[0];
  const margin = myGoals - oppGoals;
  const result: PressContext['result'] =
    margin >= 3 ? 'big_win' : margin > 0 ? 'win' : margin === 0 ? 'draw' : margin <= -3 ? 'thrashing' : 'loss';

  const table = sortedTable(gs.league);
  const tablePos = table.findIndex(s => s.clubId === gs.clubId) + 1;
  const oppId = iAmHome ? fx.awayId : fx.homeId;
  const rival = gs.league.clubs.find(c => c.id === oppId)!;

  const ctx: PressContext = {
    result,
    isDerby: isDerby(fx.homeId, fx.awayId),
    lowMorale: gs.meters.morale < 40,
    highPrestige: gs.meters.prestige > 60,
    tablePos, totalTeams: gs.league.clubs.length,
    star: topPlayerName(mySquad(gs)),
    rival: rival.short,
    city: club(gs).city,
  };
  const rng = createRng(gs.seasonSeed * 100 + gs.week * 31 + 5);
  // what the reporter actually watched, so his first question is about the
  // match and not about the scoreline in the abstract
  const facts = matchFacts(r, gs.clubId, mySquad(gs), new Set(gs.exits.map(e => e.id)));
  const { outlet, qs } = pickPressQuestions(ctx, rng, facts, gs.pressHistory);
  return {
    ...gs, phase: 'press', press: { outlet, q: qs[0], queue: qs.slice(1) },
    pressHistory: [...gs.pressHistory, ...qs.map(q => q.id)].slice(-PRESS_MEMORY),
  };
}

/** Apply the manager's answer to the reporter, then move on. */
export function answerPress(gs: GameState, index: number): GameState {
  const q = gs.press?.q;
  const ans = q?.answers[index];
  const meters = ans
    ? {
        money: cash(gs.meters.money),
        morale: moraleShift(gs.meters.morale, (ans.effect.morale ?? 0)),
        prestige: meter(gs.meters.prestige + (ans.effect.prestige ?? 0)),
      }
    : gs.meters;
  const style = ans ? scoreStyle(gs.style, ans.effect) : gs.style;
  // he has another one. A press conference is not one question and out.
  const rest = gs.press?.queue ?? [];
  if (rest.length) {
    return { ...gs, meters, style, press: { outlet: gs.press!.outlet, q: rest[0], queue: rest.slice(1) } };
  }
  return advancePastPress({ ...gs, meters, style });
}

/** How many questions are left, including the one on screen. */
export function pressRemaining(gs: GameState): number {
  return gs.press ? 1 + (gs.press.queue?.length ?? 0) : 0;
}

/** Where the week actually ends, once the phone has had its say. */
function endOfWeek(gs: GameState): GameState {
  // the registered youth goes back down and the reds are served, before the
  // manager is told anything about either
  gs = serveSuspensions(returnEmergencyYouth(gs));
  // this week's answers have done their work: the men who sat are free, the
  // ones who got hurt sit next, and the match mods are spent
  gs = { ...gs, sitOut: gs.sitOutNext, sitOutNext: {}, matchMods: {} };
  // remember the post match line shown on the result screen before moving on
  const fanHistory = gs.lastPlayerMatch
    ? [...gs.fanHistory, fanNote(gs, 'post').id].slice(-FAN_HISTORY)
    : gs.fanHistory;
  if (gs.seasonOver) {
    const finale = chronicleAtSeasonEnd(gs);
    const chronicle = finale ? [...gs.chronicle, finale] : gs.chronicle;
    return { ...gs, phase: 'season-end', press: null, chat: null, chronicle, fanHistory };
  }
  // the winter window opens with a word, not silently behind a green dot
  const next = gs.week + 1;
  const wintry = windowState(next, gs.league.rounds);
  const wasOpen = windowState(gs.week, gs.league.rounds).open;
  let notices = wintry.open && !wasOpen
    ? [...gs.notices, { kind: 'window' as const, weeks: wintry.weeksLeft }]
    : gs.notices;
  // and the words that were owed for this week come back
  const due = gs.followUps.filter(f => f.season === gs.season && f.week <= next);
  const followUps = gs.followUps.filter(f => !due.includes(f));
  notices = [...notices, ...due.map(f => ({ kind: 'story' as const, title: f.title, body: f.body }))];
  return { ...gs, phase: 'hub', week: next, press: null, chat: null, fanHistory, notices, followUps, market: winterMarket(gs, next) };
}

/**
 * The market as the week turns.
 *
 * It used to be frozen from the last summer round to the end of the season:
 * the winter window opened onto the summer's leftovers, three of them still
 * stamped "last round, after this he is gone" every week for the whole window,
 * and none of them ever went. Now the window opens on a fresh twelve, moves
 * the way the summer moves for as long as it stays open, and when it shuts
 * the list settles: whoever is left is simply around, nobody is on notice.
 */
function winterMarket(gs: GameState, next: number): FreeAgent[] {
  const wasOpen = windowState(gs.week, gs.league.rounds).open;
  const isOpen = windowState(next, gs.league.rounds).open;
  if (!wasOpen && !isOpen) return gs.market;
  const sq = mySquad(gs);
  const taken = new Set([...sq.starters, ...sq.bench].map(p => p.name));
  const rng = createRng(gs.seasonSeed + 6100 + next * 37);
  if (isOpen && !wasOpen) return makeMarket(club(gs).tier, rng, 12, taken);
  if (isOpen) return refreshMarket(gs.market, club(gs).tier, rng, taken);
  return settleMarket(gs.market);
}

/**
 * After the press room the phone buzzes, but only for a week worth talking
 * about: a hammering either way, a derby, or a run of three. Anything else and
 * we go straight home, which is what keeps the buzz meaningful.
 */
/** Carry on into the press room and the rest of the week. */
export function advancePastPress(gs: GameState): GameState {
  const r = gs.lastPlayerMatch;
  const fx = playerFixture(gs);
  if (!r || !fx) return endOfWeek(gs);

  const iAmHome = fx.homeId === gs.clubId;
  const margin = (iAmHome ? r.score[0] : r.score[1]) - (iAmHome ? r.score[1] : r.score[0]);
  const picked = pickTrigger({
    margin, isDerby: isDerby(fx.homeId, fx.awayId), form: gs.form,
    facts: matchFacts(r, gs.clubId, mySquad(gs), new Set(gs.exits.map(e => e.id))),
  });
  if (!picked) return endOfWeek(gs);

  const oppId = iAmHome ? fx.awayId : fx.homeId;
  const rival = gs.league.clubs.find(c => c.id === oppId);
  const my = iAmHome ? r.score[0] : r.score[1];
  const opp = iAmHome ? r.score[1] : r.score[0];
  const rng = createRng(gs.seasonSeed * 31 + gs.week * 977 + 11);
  const chat = rollChat(picked.trigger, {
    club: club(gs).short,
    rival: rival?.short ?? 'היריבה',
    score: `${my} - ${opp}`,
    star: topPlayerName(mySquad(gs)),
    mgr: gs.profile.nickname || gs.profile.name || 'מאמן',
    who: picked.who,
  }, rng, gs.chatHistory.slice(-CHAT_MEMORY));
  if (!chat) return endOfWeek(gs);

  return { ...gs, phase: 'chat', press: null, chat, chatHistory: [...gs.chatHistory, chat.id].slice(-CHAT_MEMORY) };
}

/** The player closed the phone, now the week can end. */
export function closeChat(gs: GameState): GameState {
  return endOfWeek(gs);
}

/** TEMP dev preview: a career with a few rounds played, for the /?league route. */
export function demoSeason(rounds = 8): GameState {
  let gs = newGame(4242);
  gs = setProfile(gs, { name: 'איציק', nickname: 'איציק', age: 38, type: 'mental' });
  gs = pickClub(gs, gs.league.clubs[0].id);
  gs = afterSigning(gs, {});
  gs = enterSeason(gs);
  for (let w = 1; w <= Math.min(rounds, gs.league.rounds); w++) {
    const inp = liveMatchInput(gs);
    const res = simulateMatch(
      { id: inp.homeId, name: inp.homeName, players: inp.iAmHome ? inp.playerStarters : inp.oppStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: true },
      { id: inp.awayId, name: inp.awayName, players: inp.iAmHome ? inp.oppStarters : inp.playerStarters,
        tactic: { formation: DEFAULT_FORMATION, approach: 'balanced', press: 'mid' }, chemistry: 0.7, isHome: false },
      inp.seed);
    gs = commitRound(gs, res);
    gs = continueFromResult(gs);
    while (gs.phase === 'press') gs = answerPress(gs, 0);
    if (gs.phase === 'chat') gs = closeChat(gs);
    if (gs.phase === 'season-end') break;
  }
  return { ...gs, phase: 'table' };
}

/** TEMP dev preview of one chat, used by the /?chat= route. Remove with it. */
export function demoChat(trigger: Parameters<typeof rollChat>[0]): GameState | null {
  const chat = rollChat(trigger, {
    club: 'עין סלע', rival: 'נחל עוז', score: '3 - 0', star: 'כהן', mgr: 'איציק', who: 'כהן',
  }, createRng(7), []);
  return chat ? { ...newGame(), phase: 'chat', week: 6, chat } : null;
}

/* ------------------------------------------------------------ the charts */

export interface ChartRow {
  id: string;
  name: string;
  clubId: string;
  apps: number;
  goals: number;
  assists: number;
  mine: boolean;
}

/** The division's scoring charts. Ties break on fewer appearances, then name. */
export function leagueChart(gs: GameState, by: 'goals' | 'assists'): ChartRow[] {
  return Object.entries(gs.seasonStats)
    .map(([id, s]): ChartRow => ({
      id, name: s.name, clubId: s.clubId, apps: s.apps,
      goals: s.goals, assists: s.assists, mine: s.clubId === gs.clubId,
    }))
    .filter(r => r[by] > 0 && r.name)
    .sort((a, b) => b[by] - a[by] || a.apps - b.apps || a.name.localeCompare(b.name, 'he'))
    .slice(0, 20);
}

/** A player's record this season, zeroed rather than missing so cards are simple. */
export function seasonOf(gs: GameState, playerId: string): PlayerSeason {
  return gs.seasonStats[playerId] ?? blankSeason();
}

/** Everything a player has done in the seasons already filed away. */
export function careerOf(gs: GameState, playerId: string): CareerSeason[] {
  return gs.careerStats[playerId] ?? [];
}

export function careerTotals(hist: CareerSeason[]) {
  return hist.reduce((t, s) => ({
    apps: t.apps + s.apps, goals: t.goals + s.goals, assists: t.assists + s.assists,
  }), { apps: 0, goals: 0, assists: 0 });
}

export function openTable(gs: GameState): GameState { return { ...gs, phase: 'table' }; }
export function closeTable(gs: GameState): GameState { return { ...gs, phase: 'hub' }; }

/* --------------------------------------------------------------- chronicle */

export function openChronicle(gs: GameState): GameState {
  return { ...gs, phase: 'chronicle', chronicleSeen: gs.chronicle.length };
}
export function closeChronicle(gs: GameState): GameState {
  return { ...gs, phase: 'hub' };
}
/* ------------------------------------------------------------ the new season */

/**
 * Roll the career forward one year. The club climbs or drops, the squad comes
 * with you a year older, and the new division is built around you. This is what
 * replaced "new career" at the end of a season, so a save is a real climb from
 * ליגה ג' rather than a fourteen round loop.
 */
export function startNextSeason(gs: GameState): GameState {
  const table = sortedTable(gs.league);
  const position = Math.max(1, table.findIndex(s => s.clubId === gs.clubId) + 1);
  const teams = gs.league.clubs.length;
  const myClub = club(gs);

  const next = buildNextSeason({
    seasonSeed: gs.seasonSeed,
    season: gs.season,
    tier: myClub.tier,
    myClub,
    myClubId: gs.clubId,
    squads: gs.league.squads,
    // who was actually in the division, in finishing order, so it is not rebuilt
    standings: table.map(row => gs.league.clubs.find(c => c.id === row.clubId)!).filter(Boolean),
    homeCity: myClub.city,
    // so a manager is never handed himself as a player
    managerName: gs.profile.name,
    position, teams,
    minSquad: MIN_SQUAD,
    stadiumOk: gs.stadium.capacity >= requiredCapacity(myClub.tier + 1),
    youthGrowth: coachYouthGrowth(gs.coach),
    fitnessBonus: coachFitnessBonus(gs.coach),
  });

  // the whole division carries forward, aged, rather than being regenerated
  // The day you climb back into his division, he is in it, and he is your derby.
  // Being sacked is not an ending here, it is the opening of an account, and
  // this is where it gets settled.
  // Read the tier the club actually landed on rather than working it out from
  // the result: a champion whose promotion was blocked by a small ground does
  // not go up, and duplicating that rule here had the nemesis appearing in a
  // division the manager had not reached.
  const myNewTier = next.clubs.find(c => c.id === gs.clubId)?.tier ?? myClub.tier;
  const back = returnOfTheNemesis(gs, next.clubs, next.squads, myNewTier);

  const league: LeagueState = {
    clubs: back.clubs,
    squads: back.squads,
    ovr: Object.fromEntries(
      Object.entries(back.squads).map(([id, sq]) => [
        id, Math.round(sq.starters.reduce((s, p) => s + overall(p), 0) / sq.starters.length),
      ]),
    ),
    fixtures: buildFixtures(back.clubs.map(c => c.id)),
    table: emptyTable(back.clubs),
    rounds: (back.clubs.length - 1) * 2,
  };
  // keep the derby registry in step with whoever is in the division now
  setDerbies(derbiesFromClubs(league.clubs));

  const r = next.report;
  const mine = next.squads[gs.clubId];
  const rng = createRng(next.seed + 991);
  const takenNames = new Set([...mine.starters, ...mine.bench].map(p => p.name));
  const academy = summerAcademy(gs, r.newTier, next.seed, takenNames);

  const report: SeasonReport = { ...r, season: gs.season };
  const prestigeDelta = r.result === 'champion' ? +9 : r.result === 'promoted' ? +6 : r.result === 'relegated' ? -8 : 0;

  // file the season away on each player's record before the slate is wiped.
  // only men still in the division are kept, and only fifteen years each, so a
  // forty season career does not quietly fill up localStorage.
  const stillHere = new Map<string, string>();
  for (const [cid, sq] of Object.entries(league.squads)) {
    const short = league.clubs.find(c => c.id === cid)?.short ?? '';
    for (const p of [...sq.starters, ...sq.bench]) stillHere.set(p.id, short);
  }
  const careerStats: Record<string, CareerSeason[]> = {};
  for (const [id, hist] of Object.entries(gs.careerStats)) {
    if (stillHere.has(id)) careerStats[id] = [...hist];
  }
  for (const [id, s] of Object.entries(gs.seasonStats)) {
    const short = stillHere.get(id);
    if (!short || s.apps === 0) continue;
    const entry: CareerSeason = {
      season: gs.season, tier: club(gs).tier, clubShort: short,
      apps: s.apps, goals: s.goals, assists: s.assists,
    };
    careerStats[id] = [...(careerStats[id] ?? []), entry].slice(-15);
  }

  // Wages are paid weekly during the season now, so the summer is the prize
  // money only. Arriving at the break already broke still costs you the room.
  // the results deal pays its lump the summer you actually go up
  const wentUp = r.result === 'champion' || r.result === 'promoted';
  const shirtBonus = wentUp ? (gs.sponsor?.promotionBonus ?? 0) : 0;
  const rawMoney = gs.meters.money + r.purse + shirtBonus;
  const brokeIt = gs.meters.money <= 0;
  const moraleDelta = (r.result === 'relegated' ? -12 : +6) + (brokeIt ? -10 : 0);

  const summer: GameState = {
    ...gs,
    // the summer sits between the seasons, where the report of who aged, who
    // retired and who came up from the youth actually belongs
    phase: 'preseason',
    season: gs.season + 1,
    lastReport: report,
    week: 1,
    league,
    market: makeMarket(r.newTier, rng, 12, takenNames),
    meters: {
      // prize money in, a full season of wages out. Not floored: a debt that
      // vanished every summer was the same bug as the one the round ledger had,
      // and it would have quietly forgiven anything the owner was about to sack
      // you for.
      money: cash(rawMoney),
      morale: moraleShift(gs.meters.morale, moraleDelta),
      prestige: meter(gs.meters.prestige + prestigeDelta - (brokeIt ? 4 : 0)),
    },
    seasonStats: {},
    careerStats,
    form: [],
    seasonOver: false,
    lastPlayerMatch: null,
    lastRound: [],
    dilemma: null,
    pendingOutcome: null,
    press: null,
    chronicle: [...gs.chronicle, ...seasonChronicle(gs, report, myClub.short),
      ...(back.met && gs.nemesis ? [{
        id: `nemesis-s${gs.season}`,
        kind: 'sacked' as const,
        week: 0,
        title: `חזרת לליגה של ${gs.nemesis.short}`,
        body: `הם פיטרו אותך בעונה ${gs.nemesis.season}, ומאז לא זזו משם. עכשיו אתם באותה ליגה, ויש דרבי.`,
        icon: 'flame' as const,
        tint: 'gold' as const,
      }] : [])],
    // the account is settled the moment you are back in his league
    nemesis: back.met ? null : gs.nemesis,
    // climbing a division is the milestone the premium currency is pinned to,
    // and the ad allowance refills with the new season
    gems: gs.gems + (r.result === 'champion' || r.result === 'promoted' ? GEMS_ON_PROMOTION : 0),
    adsWatched: 0,
    pull: null,
    // his CV, which is what his standing is read off. A division won counts as
    // a title as well as a climb, because winning one is not the same as
    // scraping up through the play off places
    coach: {
      ...gs.coach,
      seasons: gs.coach.seasons + 1,
      bestTier: Math.max(gs.coach.bestTier ?? 1, next.report.newTier),
      promotions: (gs.coach.promotions ?? 0) + (r.result === 'champion' || r.result === 'promoted' ? 1 : 0),
      titles: (gs.coach.titles ?? 0) + (r.result === 'champion' ? 1 : 0),
    },
    // the academy has its summer too: one kid breaks out, the eighteen year olds
    // come up for a decision, and a new intake arrives
    youth: academy.youth,
    youthBoost: [],
    youthLeaveRisk: null,
    notices: academy.left
      ? [...gs.notices, { kind: 'story' as const, title: ` עזב את הנוער`, body: 'מאמן הנוער הזהיר שאם לא יעלה, הוא ילך. הוא הלך. קבוצה אחרת חתמה אותו בקיץ.' }]
      : gs.notices,
  };
  // the man who was told "until the end of the season" goes now, to a club
  // in the league he is about to play in
  return settleSummerExits(summer);
}

/**
 * Put the club that sacked you back in front of you, the season you reach the
 * division they never left. The weakest side in the new league steps aside and
 * hands over its squad, so the table size and the fixture list are untouched,
 * and the two of them are written into each other's rivalId, which is what the
 * derby chip on the match card reads.
 */
function returnOfTheNemesis(
  gs: GameState, clubs: Club[], squads: Record<string, Squad>, myTier: number,
): { clubs: Club[]; squads: Record<string, Squad>; met: boolean } {
  const n = gs.nemesis;
  if (!n || myTier !== n.tier) return { clubs, squads, met: false };
  if (clubs.some(c => c.id === n.clubId)) return { clubs, squads, met: false };

  const mine = clubs.find(c => c.id === gs.clubId);
  // the side that makes way is the weakest one that is not yours
  const others = clubs.filter(c => c.id !== gs.clubId);
  if (!others.length || !mine) return { clubs, squads, met: false };
  const ovrOf = (c: Club) => {
    const sq = squads[c.id];
    if (!sq?.starters?.length) return 0;
    return sq.starters.reduce((t, p) => t + overall(p), 0) / sq.starters.length;
  };
  const out = others.reduce((a, b) => (ovrOf(b) < ovrOf(a) ? b : a));
  const him = { ...siblingClub(n.city, n.tier, gs.clubId), id: n.clubId, name: n.name, short: n.short, city: n.city, tier: n.tier, rivalId: gs.clubId };

  const nextClubs = clubs.map(c => (c.id === out.id ? him : c.id === gs.clubId ? { ...c, rivalId: n.clubId } : c));
  const nextSquads: Record<string, Squad> = { ...squads };
  nextSquads[n.clubId] = squads[out.id];
  delete nextSquads[out.id];
  return { clubs: nextClubs, squads: nextSquads, met: true };
}

/** The promotion or relegation itself is a chapter worth keeping. */
function seasonChronicle(gs: GameState, r: SeasonReport, clubShort: string): ChronicleEntry[] {
  const id = `season-${r.season}-${r.result}`;
  if (gs.chronicle.some(e => e.id === id)) return [];
  const league = LEAGUE_NAMES[r.newTier] ?? '';
  if (r.result === 'champion' || r.result === 'promoted') {
    return [{
      id, kind: 'season_end', week: r.season, icon: 'trophy', tint: 'gold',
      title: r.result === 'champion' ? `אלופים, ועולים ל${league}` : `עולים ל${league}`,
      body: `${clubShort} סיימה במקום ${r.position} וטיפסה דרגה. עונה הבאה כבר משחקים מול קבוצות אחרות לגמרי.`,
    }];
  }
  if (r.result === 'relegated') {
    return [{
      id, kind: 'season_end', week: r.season, icon: 'alert', tint: 'loss',
      title: `יורדים ל${league}`,
      body: `מקום ${r.position} בטבלה, וזה נגמר בירידה. עכשיו בונים מחדש ומטפסים שוב.`,
    }];
  }
  return [];
}

/** Is the club already at the top of the Israeli ladder. */
export function atTopTier(gs: GameState): boolean {
  return club(gs).tier >= TOP_TIER;
}

export function openCoach(gs: GameState): GameState { return { ...gs, phase: 'coach' }; }
export function openCaptain(gs: GameState): GameState { return { ...gs, phase: 'captain' }; }
export function openAssistant(gs: GameState): GameState { return { ...gs, phase: 'assistant' }; }
export function unreadChronicle(gs: GameState): number {
  return Math.max(0, gs.chronicle.length - gs.chronicleSeen);
}

/* --------------------------------------------------------------- utilities */

/** Which instinct did this choice express. Pure counting, no extra data needed. */
function scoreStyle(style: ManagerStyle, e: { money?: number; morale?: number; prestige?: number }): ManagerStyle {
  const money = e.money ?? 0, morale = e.morale ?? 0, prestige = e.prestige ?? 0;
  const next = { ...style };
  if (morale > 0 && (money < 0 || prestige < 0)) next.players += 1;
  else if (prestige > 0 && morale <= 0) next.media += 1;
  else if (money > 0 && morale < 0) next.money += 1;
  else if (morale > 0) next.players += 1;
  else if (prestige > 0) next.media += 1;
  else if (money > 0) next.money += 1;
  return next;
}

function cloneTable(t: LeagueState['table']): LeagueState['table'] {
  const out: LeagueState['table'] = {};
  for (const k of Object.keys(t)) out[k] = { ...t[k] };
  return out;
}

function hashPair(a: string, b: string): number {
  let h = 0;
  const s = a + '|' + b;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 9973;
}

export { sortedTable };

/** Roll the injury risks the manager took before the match: who sits the round after. */
function settleInjuries(gs: GameState): Record<string, string> {
  const out = { ...gs.sitOutNext };
  const risks = gs.matchMods.injury ?? {};
  const rng = createRng(gs.seasonSeed * 7 + gs.week * 131 + 3);
  for (const [id, p] of Object.entries(risks)) if (rng() < p) out[id] = 'פצוע';
  return out;
}

/**
 * The academy's summer, with what the manager decided during the season: the
 * kids he let train with the seniors grow more, and the one he would not
 * promote may have walked, as the youth coach warned he might.
 */
function summerAcademy(gs: GameState, newTier: number, seed: number, used: Set<string>): { youth: Youth; left: string | null } {
  let youth = advanceYouth(gs.youth, newTier, createRng(seed + 6602), used, coachYouthGrowth(gs.coach), new Set(gs.youthBoost));
  const risk = gs.youthLeaveRisk;
  let left: string | null = null;
  if (risk && youth.players.some(p => p.name === risk.name) && createRng(seed + 6603)() < risk.p) {
    youth = { ...youth, players: youth.players.filter(p => p.name !== risk.name), ready: youth.ready.filter(n => n !== risk.name) };
    left = risk.name;
  }
  return { youth, left };
}

/**
 * Roll one named dilemma against the live save, the way the week would.
 * For the checks, which need a particular question in front of the manager
 * rather than whichever the seed happens to draw.
 */
export function rollNamedDilemma(gs: GameState, id: string, seed = 1): RolledDilemma | null {
  const tpl = TEMPLATES.find(t => t.id === id);
  if (!tpl) return null;
  const fx = playerFixture(gs);
  const rivalId = fx ? (fx.homeId === gs.clubId ? fx.awayId : fx.homeId) : gs.clubId;
  const rival = gs.league.clubs.find(c => c.id === rivalId)!;
  const ctx = dilemmaCtx(gs, topPlayerName(mySquad(gs)), rival.short, rivalId);
  if (tpl.when && !tpl.when(ctx)) return null;
  return rollDilemma(tpl, ctx, createRng(seed));
}

/**
 * "Stay until the end of the season and then we will talk" was a promise
 * too. In the summer the man goes, to a club in the division you are about
 * to play in, with the story attached like any other sale, and a word about
 * it waits at the first hub of the new season. The fee is what the window
 * would have paid, since it was agreed and not forced.
 */
function settleSummerExits(gs: GameState): GameState {
  if (!gs.summerExits.length) return { ...gs, summerExits: [] };
  const sq = mySquad(gs);
  let out = gs;
  for (const id of gs.summerExits) {
    const p = [...sq.starters, ...sq.bench].find(x => x.id === id);
    if (!p) continue;
    // he goes even from a squad of sixteen: the academy tops the squad back up,
    // the way it does after any summer sale
    let gone = removePlayer(out, id);
    if (squadSize(gone) < MIN_SQUAD) {
      const filled = fillWithYouth(mySquad(gone), createRng(gone.seasonSeed + 8801), club(gone).tier, MIN_SQUAD);
      gone = writeSquad(gone, filled.squad);
    }
    const moved = moveToLeagueClub(gone, p);
    const buyer = out.league.clubs.find(c => c.id === moved.clubId)?.short ?? 'קבוצה אחרת';
    const fee = sellPrice(p, club(out).tier);
    out = {
      ...moved.gs,
      meters: { ...moved.gs.meters, money: cash(moved.gs.meters.money + fee) },
      notices: [...moved.gs.notices, { kind: 'story', title: `${p.name} עבר ל${buyer}`, body: `כמו שסיכמתם בחורף: עד סוף העונה, ואז הוא הולך. הלך. ${formatShekels(fee)} נכנסו לקופה, ובפעם הבאה שתפגשו הוא בצד השני.` }],
    };
  }
  return { ...out, summerExits: [] };
}
