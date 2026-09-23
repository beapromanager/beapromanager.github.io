/**
 * Where the counting goes.
 *
 * Empty means nowhere, and every call in game/telemetry.ts becomes a no op, so
 * the game runs exactly as it did before any counting existed. That is not a
 * fallback, it is the state the game ships in until the worker is up: a wrong
 * address would queue events forever against a wall.
 *
 * It is a plain constant rather than an environment variable on purpose. The
 * address is public the moment the game is served, since the browser has to
 * know it, so hiding it in the build would buy nothing and cost the ability to
 * read, in the repository, exactly where the data goes.
 *
 * The worker that answers it is in worker/, and DEPLOY.md says how to put it
 * up. Nothing personal is ever sent to it; see the top of game/telemetry.ts.
 */
export const TELEMETRY_URL: string = '';
