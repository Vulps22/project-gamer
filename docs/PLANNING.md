# Project Gamer — v2 Rebuild Planning Document

> This document captures scope, architecture, data model, and UX decisions for the v2 TypeScript rebuild.
> It exists to prevent scope creep, avoid mid-build regret, and make better mistakes this time.

---

## Why a Rebuild

The current bot (v2 of the original Laravel backend, v1 of the JS bot) has:
- A high server churn rate — added and removed within 24hrs
- Silent runtime failures caused by missing null checks and wrong property names that TypeScript would have caught at compile time
- A blocking SteamSync that freezes the entire bot globally
- An unfulfilled UX promise (DM on game approval — never implemented)
- An architecture that makes the right fixes hard to retrofit

Patching buys a slightly less broken version of something people are already rejecting.

**Decision: full TypeScript rebuild with lessons from both previous iterations baked in from day one.**

---

## Core Lessons Carried Forward

| Lesson | Applied How |
|--------|-------------|
| Steam login = trust barrier | Steam account is optional. Bot works as a pure Discord user with manual library management |
| SteamSync blocks the event loop | All sync/scraping jobs run through a job queue (BullMQ), never on the main process |
| Wrong property names caused silent bugs | TypeScript strict mode, no `any` |
| Magic strings for button/menu IDs | Central constants file for all interaction IDs |
| Services depend on concrete DB/logger | Constructor-injected dependencies throughout |
| Session cleanup was never scheduled | All scheduled tasks declared explicitly in job queue config |
| Approval DM was promised but never built | Don't promise it in UI copy until it's implemented |
| Every interaction awaited a Discord log message before running, so a burst of log lines (e.g. a Steam sync) made every command miss Discord's 3s deadline | Logging and analytics are fire-and-forget (`void`), never in the interaction's path — as PE does |
| Config lived in a database table and was dumped to the logs on startup, token included | Typed config modules per environment; secrets only in env files, never logged |
| Deploys ran through GitHub Actions and silently stopped for a year | No deployment in GitHub Actions. Deploying is handled outside this repo (see [Deployment](#deployment)) |

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Language | TypeScript (strict) | Catches the class of bugs that killed v1 |
| Runtime | Node.js | No change, ecosystem fits Discord bots well |
| Discord library | discord.js v14 | No change |
| Database | PostgreSQL + TimescaleDB | Schema namespacing, better type support, preferred. Own database on the existing native install, not in Docker |
| Interactions | `@vulps22/bot-interactions` | Shared interaction wrappers; provides custom ID building/parsing and flow tracking |
| DB Driver | `pg` (node-postgres) | One driver for the bot, the worker and the migration scripts |
| DB Wrapper | Custom thin wrapper | `db.select()`, `db.get()`, `db.query()`, `db.transaction()` — no ORM, no query builder, just typed SQL |
| Job queue | BullMQ + Redis | Retries, scheduling, visibility, keeps sync off main thread |
| Scrapers | Steam's public `appdetails` API (Steam) + Puppeteer (Meta) | Steam's store API is more reliable than scraping its HTML. Meta has bot protections that require a real browser; carry forward knowledge, rewrite clean |
| Logging | `@vulps22/logger` | Shared VD logger, as PE |
| HTTP | `@vulps22/pathfinder` | File-based Express routing with bearer/HMAC auth; hosts the Steam callback and top.gg vote webhook |
| Testing | Jest + ts-jest | Same toolchain as PE; 75% coverage threshold |
| Linting | ESLint + typescript-eslint | |

---

## PostgreSQL Schema Namespacing

Rather than prefixing table names or cramming everything into `public`:

```
store     → known stores (Steam, Meta, Xbox, RSI, Epic, GOG...) — seed data, not user-generated
games     → game catalogue, store entries, submission queue
users     → discord users, steam account links, game libraries
servers   → server config, memberships, sharing settings
lfg       → posts, invitees, interested users, VC tracking
```

Full schema in [`DATABASE.md`](./DATABASE.md).

---

## Feature Scope

### In Scope for v2 Launch

#### Steam (Optional)
- `/steam connect` — initiates Steam OpenID authentication; bot stores Steam ID and begins auto-sync
- `/steam unlink` — removes Steam auth and stops sync; manually added games are kept
- `/steam sync` — manual trigger for an immediate library sync (requires `/steam connect` first)
- Auto-sync runs as a background job (BullMQ), only active for users who have connected Steam
- The bot works fully without Steam — games can always be added manually via `/library add`

#### Library Management
- `/library add <url>` — submit a store URL; bot responds immediately with "adding your game..." and enqueues a scrape job; worker scrapes and follows up via stored interaction token; if URL is unrecognised, goes to admin approval queue
- `/library remove <game>` — remove a game (autocomplete)
- `/library view [user]` — autocomplete list of all games in the library; selecting one shows an ephemeral embed with a "Post to Chat" button

#### Sharing
- `/sharing <on|off>` — toggle library visibility for the current server (per-server, per-user). Idempotent — "already sharing" if called when already on.

#### LFG
The LFG post embed is a **living record** — it is edited in place as session state changes.

VC field states:
- Scheduled, VC not yet created: `⚠️ <t:timestamp:R>` (Discord relative timestamp — "in 2 hours")
- VC active: `VC: <#channel-link>`
- VC closed: `VC: ❌ CLOSED`

The `message_id` stored on `lfg.posts` is what the bot uses to edit the post when state changes.

**LFG list:** the `#lfg` channel itself is the list. No separate command.

**Control panel thread:** when any LFG post is created, the bot creates a thread on that message. The thread's first post is a control panel visible only to the session creator, with:
- **Change Time** (scheduled posts only)
- **Cancel**

Only the creator can interact with these buttons (validated against `posted_by`).

**Interested / Not Interested buttons:** shown on open invitation posts.
- Clicking "Interested" adds the user to `lfg.interested` and displays their name on the post
- Clicking "Not Interested" removes them
- Interested users are pinged when the VC goes live

**VC lifecycle (event-driven, not polled):**
- On `voiceStateUpdate`: when the last user leaves a managed VC, enqueue a delayed BullMQ job (10 min TTL)
- If a user rejoins before the job fires, cancel the job
- On job fire with VC still empty: delete VC, edit post to `VC: ❌ CLOSED`
- Hard 1hr cap: always enqueue a 1hr cleanup job at VC creation time as a fallback

**`/lfg play <game>`** — immediate session
  - Shows server members who have the game and are sharing
  - Select one or more players, or press "Open Invitation"
  - Open Invitation pings `@lfg`
  - Bot creates a VC named after the game, edits post to show `VC: <#channel-link>`
  - Interested users pinged on VC creation

**`/lfg schedule <game> <time>`** — scheduled session
  - `<time>` is a Unix timestamp integer (users can generate these at e.g. hammertime.cyou)
  - Bot validates the timestamp is in the future
  - Same player selection flow as `/lfg play`
  - Post displays `<t:timestamp:F>` (Discord localised full timestamp)
  - Post VC field shows `⚠️ <t:timestamp:R>` (relative — "in 2 hours") until VC is created
  - VC created 10 minutes before scheduled time, post updated to `VC: <#channel-link>`
  - Interested users pinged when VC is created
  - On VC deletion, post edited to `VC: ❌ CLOSED`

#### Server Setup (auto)
- On `guildCreate`: bot creates `@lfg` role if it doesn't exist, stores its ID
- If `@lfg` already exists: bot finds it by name and stores its ID

#### Mod Commands
- `/config lfg-channel <channel>` — set where LFG posts appear
- `/config sync` (future) — re-deploy slash commands if needed

#### Game Submission & Approval

When `/library add <url>` is called with an unrecognised URL:
1. Bot saves a `games.submissions` record with status `pending`
2. Bot posts an embed to `#new-games` on the **admin/home server** (configured via env var)
   - Embed shows: submitted by (user tag), URL (hyperlinked), timestamp
   - Two buttons: **Approve** / **Reject**
3. **Approve** opens a modal with three fields:
   - Game title
   - Store name (steam / meta / gog / other)
   - Cover image URL
4. On modal submit:
   - Creates `games.catalogue` entry
   - Creates `games.store_entries` entry
   - Sets `games.submissions.status = 'approved'`, links `result_game_id`
   - Adds game to requesting user's `users.game_library`
   - Notifies requesting user via Discord DM (this one we're actually building)
5. **Reject** sets status to `rejected` — no further action (no DM for rejections in v2)

Config required, in the typed config module for each environment (`src/config/<env>/Config.ts`), not env vars, since neither is a secret: `adminServerId` and `newGamesChannelId`. The bot refuses to start while either is blank.

#### Top.gg
- **Server count:** posted to top.gg across all shards.
- **Vote webhook:** a pathfinder route (`POST /api/v1/vote`), verified with pathfinder's `auth.hmac()` against top.gg's `x-topgg-signature` header (`t=<timestamp>,v1=<signature>`, signed over `<timestamp>.<body>`), with replay protection on. `webhook.test` events get `200` and are otherwise ignored.
- **On `vote.create`:** the bot DMs the voter a thank-you, plus a message that the #1 place to take full advantage of LFGameSync's sharing community is the **Vulps Community Hub** (https://discord.vulps.co.uk). The Hub is the official Vulps Development server: news, feedback, conversation about the bot, other VD projects (like Timey Zoney), and finding gamers with common interests.
- **Repeat voters:** each vote sets a Redis key `vote:<userId>` with a 25h TTL (a day, plus some breathing room). If the key already exists when a vote arrives, the voter gets this DM instead, with the Hub link:
  > Twice in one day?! You're a legend! Come join our amazing and friendly Multi-Gaming Community if you haven't already, All are welcome and the more the merrier!
  - The key is reset on every vote, so it measures time since the voter's previous vote.
- If the DM can't be delivered (DMs closed, or the voter shares no server with the bot), it is logged and dropped. The webhook still returns `200`.

**Official server link:** `https://discord.vulps.co.uk` (the Vulps Community Hub) is the only official server link anywhere in the bot: vote DMs, `/help`, and error messages that point users to support. It lives in one config constant.

### Explicitly Out of Scope for v2 Launch (consider v2.x)
- GOG store support
- User-facing submission status checking ("is my game approved yet?")

---

## Command Surface

```
/lfg play <game>
/lfg schedule <game> <time>

/library add <url>
/library remove <game>
/library view [user]

/steam connect
/steam unlink
/steam sync

/sharing <on|off>

/config lfg-channel <channel>

/help
```

---

## Architecture

### Process Model

```
Main Process (Discord bot)
  └── ShardingManager + pathfinder HTTP server (Steam callback, top.gg vote webhook)
  └── Handles all Discord interactions (in the shards)
  └── Enqueues jobs, never runs them inline

BullMQ Worker Process (separate)
  └── steam.sync      — diff Steam library against user library, write new games
  └── scrape.fetch    — scrape a store URL (Cheerio or Puppeteer); follow up to user via stored Discord interaction token
  └── vc.empty        — delayed 10min job enqueued when last user leaves a VC; deletes VC if still empty
  └── vc.expire       — hard 1hr TTL job enqueued at VC creation; deletes VC regardless
  └── lfg.scheduled   — spin up VC 10min before scheduled LFG, ping interested users
  └── session.cleanup — purge expired OAuth sessions
```

The worker process can crash, restart, or be scaled independently without touching the bot.

### Service Layer (Dependency Injected)

No service imports `db` or `logger` directly. All dependencies passed via constructor. Makes testing trivial.

```
UserService
SteamService
LibraryService
GameService
ServerService
LfgService
ScraperService
  ├── SteamScraper
  └── MetaScraper
```

This is the one place PG deliberately differs from PE. PE's services are singletons created in a barrel file, and PG keeps constructor injection. The barrel file still exists, but it is the composition root: it builds each service with its dependencies.

### Interaction Handling

Follows PE's structure:

```
src/
  _handlers/
    commands/   buttons/   selects/   modals/
  events/
    interactionCreate.ts
    interactionEvents/   CommandInteractionEvent.ts  ButtonInteractionEvent.ts  ...
```

- Every handler exports a `Handler<T>` (`name`, `execute`), where `T` is the matching bot-interactions wrapper. Component handlers are registered by `baseId`.
- `interactionCreate` dispatches to one `InteractionEvent` class per interaction type, fire-and-forget (`void`), so one slow interaction never holds up the next.
- **Buttons and selects call `deferUpdate()` first**, before any async work, and respond with `ephemeralFollowUp()`. Commands defer as their first line if they do any I/O.
- Each `InteractionEvent` wraps the handler in a try/catch. On error it logs, and replies only if the interaction hasn't been replied to or deferred. A failed reply is swallowed (`.catch(() => null)`) so the error path can never throw.
- Each `InteractionEvent` records the analytics event when the handler finishes (see [ANALYTICS.md](./ANALYTICS.md)).
- Interactions outside a guild throw a typed `DMInteractionError`, which `interactionCreate` turns into a polite ephemeral reply.

**Logging.** `@vulps22/logger` posts to two Discord channels through webhooks, set in the env file as `DISCORD_LOG_WEBHOOK_URL` and `DISCORD_ERROR_WEBHOOK_URL` (webhook URLs are secrets). Webhooks keep logging off the bot's own rate limits and need no channel permissions. Log liberally; every call is fire-and-forget.
- **Log channel:** every interaction received (with user and server), refused interactions and why, startup and shard status, servers joined and left, library adds and removes, submissions queued / approved / rejected, new stores, LFG sessions started and closed, interest changes, VC empty / rejoined, scrapes, `/config` and sharing changes.
- **Error channel:** every failure, with its stack: failed interactions and autocompletes (with user and server), failed jobs, stalled jobs, analytics writes dropped, submissions that couldn't be saved or posted, review cards that couldn't be put back, DMs that failed, the `@lfg` role that couldn't be created, voice and server event errors, shard deaths and errors, uncaught exceptions and unhandled rejections, and startup failures. Errors that repeat on every retry (a Redis outage) are muted for a minute after each report.
- Messages are trimmed to fit Discord's 2000-character limit. Log lines use IDs and usernames, never mentions, so the log never pings anyone. Never log secrets, config, or a job's data (a scrape job carries an interaction token).
- Responses use Components V2 views. bot-interactions' `noticeView` / `successView` / `errorView` cover simple messages. A Components V2 message never carries `content`.

### Configuration

As PE: `src/config/{dev,stage,prod}/Config.ts`, selected by `ENVIRONMENT` (`dev` | `stage` | `prod`). Channel IDs, the official server link, and other non-secret values live in these typed modules. Secrets (Discord token, DB passwords, Steam API key, top.gg secrets) live only in env files, loaded with `node --env-file`. Config is never logged.

### HTTP Server

pathfinder's `createServer({ routesPath })` runs in the main process. Routes live in `src/routes/` as files:

```
src/routes/
  auth/steam/callback.ts   GET  — Steam OpenID return; validates the state token and verifies the response with Steam (check_authentication)
  api/v1/vote.ts           POST — top.gg vote webhook; auth.hmac() with replay protection
  api/v1/ping.ts           GET  — health check
```

### Interaction ID Constants

All button, select menu, and modal IDs defined in one place, as `[prefix, action]` pairs in bot-interactions' `prefix_action_key:value` custom ID format:

```ts
// src/constants/interactions.ts
export const Interactions = {
  LFG_PLAYER_SELECT: ['lfg', 'playerSelect'],
  LFG_OPEN_INVITE: ['lfg', 'openInvite'],
  LFG_INTERESTED: ['lfg', 'interested'],
  LFG_NOT_INTERESTED: ['lfg', 'notInterested'],
  LIBRARY_POST_GAME: ['library', 'postGame'],
  SUBMISSION_APPROVE: ['submission', 'approve'],
  SUBMISSION_REJECT: ['submission', 'reject'],
  SUBMISSION_APPROVE_MODAL: ['submission', 'approveModal'],
} as const;
```

Custom IDs are always built from these pairs, never by hand: `customIdsFor(interaction)` inside a handler (it calls `interaction.createCustomId`), or `customIdsForFlow(flowId)` in the worker, which has no interaction but carries the flow ID in the job, so every component carries its flow (see [ANALYTICS.md](./ANALYTICS.md#flows)). Handlers are registered by `baseId` (`lfg_playerSelect`).

---

## Migration from v1

1. v2 runs on a new database — no migration scripts, clean slate
2. Existing servers: bot re-registers itself on next interaction (guildCreate won't re-fire, handle gracefully on first command use)
3. Existing users: re-link Steam if they want sync, manual library re-entry or re-sync
4. Announce in support server: "v2 is live, it's a clean rebuild, here's what changed"

The churn rate means most servers that stayed are low-activity. The cost of asking active users to re-link is low.

---

## Development Process

Follows PE's process. Where PG differs, it says so.

### GitHub Issues

All work is tracked as GitHub Issues. No Jira.

Label conventions:
- `feat` — new feature
- `fix` — bug fix
- `chore` — maintenance, deps, config
- `blocked` — waiting on something external

Issues move across the project board automatically, driven by branch, PR and release events (PE's `project-*.yml` workflows).

### Branches

```
main                      → integration; PRs merge here
current-release           → what's in production
freeze/v2026.11.1         → release candidate, cut from main
<issue>-<issue-title-slug> → all working branches
```

- Every working branch belongs to an issue and is created with `gh issue develop`, so it links to the issue:
  ```bash
  gh issue develop <issue> --repo Vulps22/project-gamer --checkout --base current-release
  ```
- **Branch off `current-release`, never off `main`.** Every branch starts from what's actually in production, and a fix merged into `current-release` can flow into any in-flight branch without waiting for unrelated work on `main`.
- PRs merge into `main`. No direct pushes, and all test workflows must pass first. If it's failing in CI, it doesn't merge. If it somehow does, it doesn't release.

### Commits and PRs

- Commit message: `#<issue> - <message up to 50 characters>`. A body only for genuinely complex commits.
- One logical change per commit. If a file holds changes for two concerns, stage the hunks separately (`git add -p`).
- PR title: `#<issue> - Add|Remove|Update|Revert|Refactor <summary>`, with no colon after the verb. `validate-pr-title.yml` enforces this, checks the issue is open, and links the PR to it. The changelog uses the leading verb.

### Test Strategy

Jest + ts-jest. Tests are co-located with source in `tests/` folders and run per folder:

```
src/
  _handlers/commands/   tests/
  _handlers/buttons/    tests/
  services/             tests/
  scrapers/             tests/
  jobs/                 tests/
  routes/               tests/
  ...
```

Each folder has its own test workflow, as PE does (`test-commands.yml`, `test-services.yml`, …), running `npm test -- src/<folder>` on PRs and pushes to `main`. Workflows run in parallel and fail independently, so it's obvious which area broke. Adding a folder means adding one workflow.

Coverage threshold: 75% branches, functions, lines and statements (as PE).

### Versioning

Versions are `vYYYY.M.N`, the Nth release of the month (no leading zero on the month, as PE). Hotfixes are `vYYYY.M.N-H<n>`.

### Deployment

**Out of scope for this repo.** PG contains no deploy scripts and no build, release or deploy workflows. GitHub Actions only runs tests and PR checks. Deploying is handled by a separate scheduled deploy script for the VD bots, which runs outside GitHub Actions and is still to be designed.

The repo's only obligations to that script:
- `npm run db:migrate -- --prod` must run on the VPS, and succeed, before the bot and worker are restarted (see [Database Migrations](#database-migrations)).
- The images build from the repo's Dockerfile.

### Docker

Two-stage build, as PE, on Node 22. PE's CI already uses 22, but its Dockerfile is still on 20, which reached end of life in April 2026. The builder stage installs dependencies (GitHub Packages auth passed in as a build arg, then removed) and compiles TypeScript. The runtime stage copies only `dist/`, `node_modules/` and `package.json`.

### Docker Compose on VPS

Two stacks on the same VPS — dev and prod — each with their own Compose file, alongside the other VD bots in `/opt/discord-bots/`:

```
/opt/discord-bots/project-gamer-dev/   docker-compose.yml  (bot-dev, worker-dev, redis-dev)
/opt/discord-bots/project-gamer/       docker-compose.yml  (bot, worker, redis)
```

Services per stack:
- `bot` — Discord bot process (handles interactions, enqueues jobs)
- `worker` — BullMQ worker process (runs sync/cleanup/scheduled jobs)
- `redis` — job queue backend

PostgreSQL is not part of either stack. Both connect to the native PostgreSQL install on the VPS: prod to `project-gamer`, dev to `project-gamer-dev`, with the same users (see [DATABASE.md](./DATABASE.md#database-roles)).

---

## Database Migrations

PE's migration system.

### File Layout

```
database/
  schemas/
    store/      tables/  stores.sql
    games/      tables/  catalogue.sql  store_entries.sql  submissions.sql
    users/      tables/  accounts.sql  steam_links.sql  game_library.sql
    servers/    tables/  config.sql  members.sql
    lfg/        tables/  posts.sql  invitees.sql  interested.sql
    analytics/  tables/  events.sql  reports.sql
                views/   events_weekly.sql  events_monthly.sql
    system/     functions/  set_updated_at.sql
                tables/  migrations.sql
  migrations/
    20261105_42_create_lfg_interested.js
    ...
  scripts/
    bootstrap.sql  fresh-install.js   migrate.js   revert.js
    lib/           shared helpers (env, connection, SQL)
```

Within a schema folder, `functions/` run first, then `tables/`, then `views/`, each alphabetically, except for files listed in `RUN_FIRST` (in `schemaFiles.js`) because others in the folder reference them (`lfg/tables/posts.sql`). Seed data lives in its table's schema file and in the migration that creates it (`store.stores`). Schemas install in dependency order (`system, store, games, users, servers, lfg, analytics`, in `database/scripts/lib/schemaFiles.js`). Every script runs as `awesome_vd_user`.

### Schema Files

`database/schemas/<schema>/**/*.sql` are the **single source of truth** for what the database looks like right now. Each file is one table or view, and carries its own `GRANT` statements under the `CREATE` (see [DATABASE.md](./DATABASE.md#database-roles)).

- `fresh-install.js` builds a bootstrapped database entirely from these files, with no migration history needed. It drops and recreates each schema first, and records every existing migration as applied.
- `migrate.js` creates `system.migrations` from its schema files the first time it runs on a new database.
- Developers keep them in sync with every migration they write. CI enforces it (below).

### Migration Files

One JS file per change: `YYYYMMDD_<issue>_<description>.js`. The date prefix gives the apply order. When one issue adds several migrations on the same day, a sequence number after the issue keeps them in order (`20261110_53_1_create_store_schema.js`). Each file exports:

| Export | Required | Meaning |
|--------|----------|---------|
| `apply(client)` | yes | Forward migration |
| `revert(client)` | yes | Undo. The runner refuses to apply any pending migration until every one has both. |
| `requiresSuperUser = '<reason>'` | no | The migration needs a manual superuser step first. `migrate` skips it, leaves it pending and prints the reason, until re-run with `--force-skipped`. |
| `skipTransaction = true` | no | Runs `apply()` outside the runner's `BEGIN`/`COMMIT`, for DDL that refuses to run in a transaction (e.g. a TimescaleDB continuous aggregate and its refresh policy). No automatic rollback: on failure the runner says to run `revert` by hand. |

TimescaleDB itself doesn't need `requiresSuperUser` in PG. Both extensions are created during the one-time database bootstrap, and after that, creating hypertables and continuous aggregates only needs table ownership.

### Tracking

Applied migrations are recorded in `system.migrations` (as PE), not by moving files on disk. Nothing in CI ever commits back to the repo.

```bash
npm run db:migrate -- --prod                   # apply pending migrations
npm run db:migrate -- --prod --force-skipped   # also apply requiresSuperUser ones, once their manual step is done
npm run db:revert -- <file> --prod             # revert one applied migration
```

`--dev` / `--stage` / `--prod` choose the env file.

### CI Validation (on PRs touching `database/`)

Spins up two fresh PostgreSQL instances (with TimescaleDB):

```
DB_A: fresh-install from main's schemas/  →  migrate (applies this PR's new migrations)
DB_B: fresh-install from this branch's schemas/

pg_dump --schema-only DB_A  vs  pg_dump --schema-only DB_B

match    → ✅ schema files are in sync with the migrations
mismatch → ❌ a schema file wasn't updated — PR blocked
```

The same job then runs `revert` on every new migration in DB_A and checks it ends up matching main's schema again, so no `revert()` goes untested.

### Running in Production

Migrations run **on the VPS**, as PE does. The rollout user's credentials exist only in the VPS's env file, never in GitHub secrets.

- Any error stops the run. The failing migration is named, along with its `revert` command if it was a `skipTransaction` migration. Whatever deploys PG must not restart the bot or worker after a failed migration run.
- A migration skipped by `requiresSuperUser` doesn't fail the run, but it is reported.

### Rollback Procedure (manual)

```
1. SSH into VPS
2. npm run db:revert -- <file> --prod   for each of the release's migrations, newest first
3. docker compose pull (previous image tag) && docker compose up -d
```

No automated rollback. Rollbacks are deliberate, manual decisions.

---

## What We're Not Doing

- No public-facing web dashboard (an admin-only analytics tool is a separate product — see ANALYTICS.md)
- No per-server game catalogues (one global catalogue)
- No ELO / reputation system
- No voice activity tracking
- No rewrite of this rewrite
