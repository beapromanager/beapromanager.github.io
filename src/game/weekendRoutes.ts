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
