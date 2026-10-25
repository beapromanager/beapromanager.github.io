/**
 * The doors of the weekend server that a phone may knock on (25.10). The router forwards only these to a league or
 * a match object; the objects' own inner doors (a league's /join and /create, which the lobby calls, a match's
 * /create, /summary and /result, which its league calls) are refused from outside with 404. /debug stays on the
 * list and is refused inside the league unless the server runs with DEBUG.
 */
export const LEAGUE_PUBLIC: ReadonlySet<string> = new Set(['/view', '/live', '/lineup', '/pack', '/ready', '/prize', '/debug']);
export const MATCH_PUBLIC: ReadonlySet<string> = new Set(['/view', '/choice']);

export const isPublicLeagueTail = (tail: string | null | undefined): boolean => LEAGUE_PUBLIC.has(tail ?? '/view');
/** a developer's server (DEBUG) also lets the smoke script read a match's /result from outside; production never does */
export const MATCH_DEBUG: ReadonlySet<string> = new Set(['/result']);
export const isPublicMatchTail = (tail: string | null | undefined, debug = false): boolean => MATCH_PUBLIC.has(tail ?? '/view') || (debug && MATCH_DEBUG.has(tail ?? ''));

/**
 * The websites that may call the weekend server from a browser: the game's original address and its own domain,
 * beapro.co.il (25.10, served next to the original one, which keeps working with its own saved careers), with and
 * without www. Everything else (a curl, a script) has no Origin and needs no CORS answer. A developer's own machine
 * (http://localhost:<port>, http://127.0.0.1:<port>) is let in only on a DEBUG server, which is never the deployed one.
 */
export const SITE_ORIGINS: readonly string[] = ['https://beapromanager.github.io', 'https://beapro.co.il', 'https://www.beapro.co.il'];
export const SITE_ORIGIN = SITE_ORIGINS[0];
export function corsOrigin(origin: string | null | undefined, debug: boolean): string | null {
  if (!origin) return null;
  if (SITE_ORIGINS.includes(origin)) return origin;
  if (debug && /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin)) return origin;
  return null;
}
