/**
 * Which league a thing may happen in (Itzik, 13.10: "ליגת העל... דברים שלא קורים בליגת העל").
 * [lowest tier, highest tier], 1 = ליגה ג׳ .. 5 = ליגת העל. An id that is not here runs in all five.
 * The first audit was done line by line against the five worlds in PIC/team/league-audit/RUBRIC.md.
 */
import { TOP_DILEMMA_DROP, TOP_DILEMMA_NEW, TOP_PRESS_DROP, TOP_PRESS_NEW, TOP_CHAT_NEW, TOP_FAN_NEW } from './topFlightText.ts';

export type TierSpan = readonly [number, number];

export const DILEMMA_TIERS: Record<string, TierSpan> = {
  player_minutes_or_quit: [1, 3],
  agent_wants_raise: [3, 5],
  agent_offers_player: [3, 5],
  physio_pitch: [1, 4],
  owner_son: [1, 4],
  star_night_out: [3, 5],
  neighbor_training_noise: [1, 3],
  player_army: [1, 4],
  player_missed_training: [1, 4],
  player_late_work: [1, 4],
  captain_miluim: [1, 4],
  student_exam: [1, 4],
  yd_father_low: [1, 3],
  yd_father_pro: [4, 5],
  yd_europe_17: [4, 5],
  yd_bigger_club_low: [1, 3],
  yd_rival_offer_low: [1, 3],
  yd_rival_offer_pro: [5, 5],
  yd_facility_low: [1, 3],
  yd_facility_pro: [4, 5],
  city_pitch_closed: [1, 3],
  youth_parent_pressure: [1, 3],
  mascot_too_old: [1, 3],
  broken_bus: [1, 3],
  heavy_rain_week: [1, 4],
  gym_chain_offer: [3, 4],
  local_youtuber: [2, 4],
  owner_cousin_catering: [1, 3],
  groundskeeper_quits: [1, 3],
  fans_away_bus: [1, 4],
  derby_barber: [1, 3],
  keeper_gloves: [1, 3],
  floodlight_broken: [1, 3],
  director_bottom_sell: [2, 5],
  owner_grey_middle: [1, 4],
  agent_wants_youngster: [3, 5],
  agent_loan_offer: [3, 5],
  owner_new_kit_mid: [3, 5],
  captain_room_pairs: [3, 5],
  owner_vip_guests: [3, 5],
  car_dealer_star: [3, 5],
  mother_laundry: [3, 5],
  derby_police_cut: [3, 5],
  midweek_friendly: [1, 3],
};

export const PRESS_TIERS: Record<string, TierSpan> = {
  big_win_raise: [1, 4],
  loss_tactics_blame: [4, 5],
  thrash_tape: [3, 5],
  fans_kid: [1, 3],
  top_enjoy: [2, 5],
  local_town: [1, 4],
  national_derby_level: [4, 4],
  legend_goal: [1, 1],
  star_rating_agent: [3, 5],
};

export const CHAT_TIERS: Record<string, TierSpan> = {
  fans_hot_streak: [1, 4],
  fans_promotion: [1, 4],
  mother_promotion: [1, 4],
  owner_promotion: [1, 4],
  rival_mgr_promotion: [1, 4],
  fans_relegated: [2, 5],
  mother_relegated: [2, 5],
  captain_relegated: [3, 4],
  board_big_loss: [3, 5],
  board_derby_loss: [4, 5],
  gm_derby_loss_2: [3, 5],
  gm_hot_streak: [3, 5],
  gm_backed_win: [3, 5],
  gm_pen_save: [3, 5],
  fans_backed_win: [3, 5],
  owner_hot_streak: [4, 5],
  owner_big_win: [4, 5],
  mother_derby_win: [4, 5],
  mother_big_win: [4, 5],
  mother_hat_trick: [4, 5],
  mother_cold_streak_2: [4, 5],
  mother_derby_win_2: [4, 5],
  mother_pen_save: [4, 5],
  mother_big_loss: [4, 5],
  mother_red_card: [4, 5],
  mother_cold_streak: [3, 5],
  little_brother_cold_streak: [3, 5],
  reporter_big_loss: [3, 5],
  agent_hat_trick: [4, 5],
  agent_debut_goal: [3, 5],
  fans_hat_trick_2: [1, 4],
  who_father_red_card: [1, 3],
};

export const MATE_TIERS: Record<string, TierSpan> = {
  mate_promoted: [2, 5],
  mate_season_played: [1, 4],
};

export const FAN_TIERS: Record<string, TierSpan> = {
  "city-num": [1, 4],
  "city-win-hope": [1, 4],
  "fans-full-roar": [2, 5],
  "ctx-generic": [1, 3],
  rafi: [1, 3],
  yosef: [2, 5],
};

/** Personality traits (personalities.ts) that are a story of a certain league. */
export const TRAIT_TIERS: Record<string, TierSpan> = {
  almost: [1, 4], 'old-glory': [1, 4], 'dad-stands': [1, 4], wonderkid: [3, 5],
  'family-shop': [1, 3], 'mom-food': [1, 3], minimarket: [1, 3], 'street-ball': [1, 3], 'youth-coach': [1, 3],
};

export function inTier(table: Record<string, TierSpan>, id: string, tier: number): boolean {
  const s = table[id];
  return !s || (tier >= s[0] && tier <= s[1]);
}

/**
 * The sums written into the dilemmas were set for one middle world. A division's wage bill is about 25K a round in
 * ליגה ג׳ and ב׳, 170K in ליגה א׳, 235K in הלאומית and 600K in ליגת העל (PIC/sim-money), so the same 30,000 is a fortune
 * at the bottom and a rounding error at the top. A sum in a dilemma, in its money effect or in its words, is multiplied
 * by this and rounded to something a person would say.
 */
export const SUM_SCALE: Record<number, number> = { 1: 0.4, 2: 0.45, 3: 1.5, 4: 2, 5: 4 };

/** a sum as a person would say it: to the nearest 500 under 10K, the nearest 1000 above, the nearest 5000 above 100K */
export function niceSum(n: number): number {
  const a = Math.abs(n);
  const step = a < 10_000 ? 500 : a < 100_000 ? 1_000 : 5_000;
  return Math.sign(n) * Math.max(step, Math.round(a / step) * step);
}
export const scaledSum = (n: number, tier: number): number => n === 0 ? 0 : niceSum(n * (SUM_SCALE[tier] ?? 1));

/** Every sum in a sentence ("8,000", "35 אלף") moved to the division's scale. */
export function scaleSumsInText(s: string, tier: number): string {
  if ((SUM_SCALE[tier] ?? 1) === 1) return s;
  return s
    .replace(/(\d+(?:\.\d+)?) אלף/g, (_, n) => say(scaledSum(parseFloat(n) * 1000, tier)))
    .replace(/\d{1,3}(?:,\d{3})+/g, m => say(scaledSum(parseInt(m.replace(/,/g, ''), 10), tier), true));
}
function say(v: number, comma = false): string {
  if (!comma && v >= 1000 && v % 1000 === 0) return `${v / 1000} אלף`;
  return v.toLocaleString('en-US');
}

/* ליגת העל from the ground up: what left it, and what exists only in it (topFlightText.ts, Itzik 13.10) */
const capMax = (t: Record<string, TierSpan>, id: string, max: number): void => { t[id] = [t[id]?.[0] ?? 1, Math.min(t[id]?.[1] ?? 5, max)]; };
for (const id of TOP_DILEMMA_DROP) capMax(DILEMMA_TIERS, id, 4);
for (const id of TOP_PRESS_DROP) capMax(PRESS_TIERS, id, 4);
for (const id of Object.keys(TOP_DILEMMA_NEW)) DILEMMA_TIERS[id] = [5, 5];
for (const id of Object.keys(TOP_PRESS_NEW)) PRESS_TIERS[id] = [5, 5];
for (const id of Object.keys(TOP_CHAT_NEW)) CHAT_TIERS[id] = [5, 5];
for (const id of Object.keys(TOP_FAN_NEW)) FAN_TIERS[id] = [5, 5];
