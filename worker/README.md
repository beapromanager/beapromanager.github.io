# The counting house

Two doors on a Cloudflare Worker, and a D1 database behind them. It answers
three questions and refuses to know anything else: how many people opened the
game, how many came back, and where the ones who stopped stopped.

Nothing personal ever reaches it. The game does not send a name, a club, a
squad or anything typed; this worker stores no IP, no user agent and no
country. See the note at the top of `src/index.ts` and of
`../src/game/telemetry.ts`.

## Putting it up, once

From this folder. Each step prints something you need for the next one.

```bash
npm install
npx wrangler login
```

Make the database, and paste the id it prints into `wrangler.toml`:

```bash
npx wrangler d1 create beapro-count
```

Make the tables inside it:

```bash
npx wrangler d1 execute beapro-count --remote --file=schema.sql
```

Set the dashboard's password. Pick something long; it never appears in the
game, only in the address you type when you want to look:

```bash
npx wrangler secret put ADMIN_KEY
```

Put the worker up. It prints an address ending in `.workers.dev`:

```bash
npx wrangler deploy
```

Then, in the game, put that address into `src/data/telemetry.ts` and push.
Until you do, the game counts nothing at all and behaves exactly as it did.

## Looking at the numbers

```
https://beapromanager.github.io/?admin=THE_KEY_YOU_SET
```

## What it costs

Nothing, at anything like this size. Cloudflare's free tier is 100,000 worker
requests a day and 5 GB of database, and one player's whole career is about
fifteen rows.
