import type { Club } from '../data/clubs.ts';
import type { Squad } from '../data/squadGen.ts';
import { makeSquad, squadAvgOvr } from '../data/squadGen.ts';
import { FOREIGN_FROM_TIER, foreignizeSquad } from '../data/foreignNames.ts';
import { sectorForCity } from '../data/names.ts';
import { withLegend, isLegend } from '../data/legends.ts';
import { nextPlayerId } from '../data/squadGen.ts';
import { createRng } from '../engine/matchEngine.ts';
import { leagueCeiling } from '../data/clubs.ts';

export interface Standing {
  clubId: string;
  played: number; won: number; drawn: number; lost: number;
  gf: number; ga: number; pts: number;
}

export interface Fixture {
  round: number;
  homeId: string;
  awayId: string;
}

export interface LeagueState {
  clubs: Club[];
  squads: Record<string, Squad>;
  ovr: Record<string, number>;
  fixtures: Fixture[];
  table: Record<string, Standing>;
  rounds: number;
}

/** Circle method double round robin for an even number of teams. */
export function buildFixtures(ids: string[]): Fixture[] {
  const n = ids.length;
  const arr = [...ids];
  const half = n / 2;
  const fixtures: Fixture[] = [];
  const firstLeg = n - 1;
  for (let r = 0; r < firstLeg; r++) {
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      // alternate home/away for fairness
      if (r % 2 === 0) fixtures.push({ round: r + 1, homeId: home, awayId: away });
      else fixtures.push({ round: r + 1, homeId: away, awayId: home });
    }
    // rotate keeping first fixed
    arr.splice(1, 0, arr.pop()!);
  }
  // second leg, reversed venues
  const second = fixtures.map(f => ({ round: f.round + firstLeg, homeId: f.awayId, awayId: f.homeId }));
  return [...fixtures, ...second];
}

export function emptyTable(clubs: Club[]): Record<string, Standing> {
  const t: Record<string, Standing> = {};
  for (const c of clubs) t[c.id] = { clubId: c.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
  return t;
}

/** Build a league. AI squads get a spread of quality around the tier ceiling. */
export function initLeague(clubs: Club[], seasonSeed: number, managerName?: string): LeagueState {
  const rng = createRng(seasonSeed);
  const ceiling = leagueCeiling(clubs[0].tier);
  const squads: Record<string, Squad> = {};
  const ovr: Record<string, number> = {};
  clubs.forEach(c => {
    // strength spread: some clubs a bit better, some worse, plus club identity
    const target = ceiling - 6 + Math.round(rng() * 10);
    // ראש העין always has one of its own in the dressing room
    const sq = withLegend(
      makeSquad(target, rng, c.traits, sectorForCity(c.city)),
      c.city, managerName, rng, nextPlayerId);
    // from the Leumit up a club has up to three foreigners, drawn off a stream of its own
    if (c.tier >= FOREIGN_FROM_TIER) {
      let h = seasonSeed >>> 0;
      for (let i = 0; i < c.id.length; i++) h = (Math.imul(h ^ c.id.charCodeAt(i), 16777619) >>> 0);
      foreignizeSquad(sq, createRng(h), isLegend);
    }
    squads[c.id] = sq;
    ovr[c.id] = squadAvgOvr(sq);
  });
  return {
    clubs,
    squads,
    ovr,
    fixtures: buildFixtures(clubs.map(c => c.id)),
    table: emptyTable(clubs),
    rounds: (clubs.length - 1) * 2,
  };
}

export function applyResult(table: Record<string, Standing>, homeId: string, awayId: string, hg: number, ag: number) {
  const h = table[homeId], a = table[awayId];
  h.played++; a.played++;
  h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
  if (hg > ag) { h.won++; h.pts += 3; a.lost++; }
  else if (hg < ag) { a.won++; a.pts += 3; h.lost++; }
  else { h.drawn++; a.drawn++; h.pts++; a.pts++; }
}

export function sortedTable(ls: LeagueState): Standing[] {
  return Object.values(ls.table).sort((x, y) =>
    y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf
  );
}
