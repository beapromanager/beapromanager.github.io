/**
 * The counting house's retention (Itzik, 29.10), apart from index.ts on purpose: the Workers runtime treats every
 * named export of the entry module as an entrypoint, and a number or an array there stops the worker from starting.
 */

interface Stmt { bind(...v: unknown[]): Stmt }
interface Db { prepare(sql: string): Stmt; batch(s: Stmt[]): Promise<unknown> }

/**
 * How long a row is kept: a year at most (Itzik, 29.10). Every row in every table carries `ts`, and the daily cron
 * (wrangler.toml [triggers]) deletes each row once its `ts` is older than this. 364 days and not 365, so that with up
 * to a day between two runs of the cron no row outlives twelve months. A device that keeps playing writes new rows,
 * and each of them goes in its turn.
 */
export const RETAIN_MS = 364 * 86_400_000;

/** the three deletes the cron runs; exported so a check can run them against real rows */
export const PURGE_SQL = [
  'DELETE FROM steps WHERE ts < ?',
  'DELETE FROM sessions WHERE ts < ?',
  'DELETE FROM crashes WHERE ts < ?',
];

/** delete every row written more than RETAIN_MS before `now` */
export async function purgeOld(db: Db, now: number): Promise<void> {
  const cutoff = now - RETAIN_MS;
  await db.batch(PURGE_SQL.map(sql => db.prepare(sql).bind(cutoff)));
}
