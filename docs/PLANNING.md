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

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Language | TypeScript (strict) | Catches the class of bugs that killed v1 |
| Runtime | Node.js | No change, ecosystem fits Discord bots well |
| Discord library | discord.js v14 | No change |
| Database | PostgreSQL | Schema namespacing, better type support, preferred |
| DB Driver | `postgres.js` | Native TypeScript, tagged template literals, clean DX |
| DB Wrapper | Custom thin wrapper | `db.select()`, `db.get()`, `db.insert()`, `db.query()` — no ORM, no query builder, just typed SQL |
| Job queue | BullMQ + Redis | Retries, scheduling, visibility, keeps sync off main thread |
| Scrapers | Cheerio (Steam) + Puppeteer (Meta) | Meta has bot protections that require a real browser; carry forward knowledge, rewrite clean |
| Testing | Vitest | Faster than Jest, native ESM, compatible with TS |
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

Config required:
```env
ADMIN_SERVER_ID=...
ADMIN_NEW_GAMES_CHANNEL_ID=...
```

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
  └── Handles all Discord interactions
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

### Interaction ID Constants

All button, select menu, and modal IDs defined in one place:

```ts
// src/constants/interactions.ts
export const Interactions = {
  LFG_PLAYER_SELECT: 'lfg:playerSelect',
  LFG_OPEN_INVITE: 'lfg:openInvite',
  LFG_STORE_SELECT: 'lfg:storeSelect',
  GAME_ADD_CONFIRM: 'game:addConfirm',
  GAME_REMOVE_CONFIRM: 'game:removeConfirm',
  SUBMISSION_APPROVE: 'submission:approve',
  SUBMISSION_REJECT: 'submission:reject',
  SUBMISSION_APPROVE_MODAL: 'submission:approveModal',
} as const;
```

---

## Migration from v1

1. v2 runs on a new database — no migration scripts, clean slate
2. Existing servers: bot re-registers itself on next interaction (guildCreate won't re-fire, handle gracefully on first command use)
3. Existing users: re-link Steam if they want sync, manual library re-entry or re-sync
4. Announce in support server: "v2 is live, it's a clean rebuild, here's what changed"

The churn rate means most servers that stayed are low-activity. The cost of asking active users to re-link is low.

---

## Development Process

### Branch Strategy

```
main                             → always deployable; runs the DEV bot on a private test server
feat/<issue>-short-description   → feature work
fix/<issue>-short-description    → bug fixes
release/2026.03.1                → archived release branch (one per base release)
```

- PRs required into `main` — no direct pushes
- Branch protection: all test jobs must pass before a PR can merge
- If it's failing in CI, it doesn't merge. If it somehow does, it doesn't release.

**Release branches** are created automatically by CI at deploy time — one per base release, not per hotfix.
Hotfixes are commits on the existing release branch, tagged separately:

```
release/2026.03.2           ← branch created on Wednesday auto-deploy
  │  tagged v2026.03.2
  ├─ hotfix commit           ← tagged v2026.03.2-H1
  └─ hotfix commit           ← tagged v2026.03.2-H2

release/2026.03.3           ← new branch next Wednesday
  │  tagged v2026.03.3
  ...
```

`git log release/2026.03.2` gives you the full history of that release era — base deploy and all its patches — without branch sprawl.

### Test Strategy

Tests are co-located with source and grouped by folder:

```
src/
  commands/   __tests__/
  services/   __tests__/
  scrapers/   __tests__/
  jobs/       __tests__/
  utils/      __tests__/
```

Each folder is a **separate parallel CI job**. They do not share a runner or wait on each other.
If any one job fails, the whole pipeline aborts — no build, no deploy.

This keeps individual runs fast and makes it obvious which area broke.
In a year's time, `commands/` failing does not mean you wait for all of `services/` to finish too.

```yaml
# Conceptual GitHub Actions matrix
jobs:
  test:
    strategy:
      matrix:
        suite: [commands, services, scrapers, jobs, utils]
    steps:
      - run: npx vitest run src/${{ matrix.suite }}
```

Adding a new folder = adding one word to the matrix list.

### CI/CD Pipeline

#### On Pull Request
```
run test matrix (parallel jobs)
  → any fail: PR blocked, no merge
```

#### On merge to main (dev deploy)
```
run test matrix (parallel jobs)
  → any fail: abort
  → all pass:
      build TypeScript
      build Docker image (tagged :dev)
      push to Docker Hub
      SSH into VPS → docker compose pull && docker compose up -d (dev stack)
```

#### On release tag (prod deploy)

Triggered two ways:

| Trigger | When | Tag produced |
|---------|------|-------------|
| Wednesday cron | Automatically, if new commits exist since last tag | `v2026.03.3` |
| `workflow_dispatch` | Manual hotfix | `v2026.03.3-H1`, `v2026.03.3-H2`, etc. |

**Version calculation (scheduled):** count non-hotfix tags for current `YYYY.MM`, increment by 1.
**Version calculation (hotfix):** find the latest tag (with or without `-H`), strip any existing `-H*` suffix to get the base, count existing hotfixes on that base, append `-H<n+1>`.

```
run test matrix (parallel jobs)
  → any fail: abort, do not release
  → all pass:
      run database migrations (see Database Migrations section)
      build TypeScript
      build Docker image (tagged :latest + :v<calver>)
      push to Docker Hub
      SSH into VPS → docker compose pull && docker compose up -d (prod stack)
      archive migration files: move database/migrations/future/* → database/migrations/<tag>/
      commit + push archive back to main
```

### Docker Compose on VPS

Two stacks on the same VPS — dev and prod — each with their own Compose file:

```
/opt/projectgamer-dev/   docker-compose.yml  (bot-dev, worker-dev, redis-dev, postgres-dev)
/opt/projectgamer/       docker-compose.yml  (bot, worker, redis, postgres)
```

Services per stack:
- `bot` — Discord bot process (handles interactions, enqueues jobs)
- `worker` — BullMQ worker process (runs sync/cleanup/scheduled jobs)
- `redis` — job queue backend
- `postgres` — database

---

## Database Migrations

### File Layout

```
database/
  schema/
    games/
      tables/       catalogue.sql  store_entries.sql  submissions.sql
    users/
      tables/       accounts.sql  steam_links.sql  game_library.sql
    servers/
      tables/       config.sql  members.sql
    lfg/
      tables/       posts.sql  invitees.sql
  migrations/
    future/         ← pending migrations, not yet deployed to prod
    v2026.03.1/     ← archived after that release deployed them
    v2026.03.2/
    v2026.03.2-H1/
    ...
```

### Source Files

`database/schema/**/*.sql` are the **single source of truth** for what the database looks like right now.

- A fresh database is built entirely from these files — no migration history needed
- Developers are responsible for keeping them in sync with any migration they write
- CI enforces this — if they drift, the PR fails

### Migration Files

Each issue that changes the schema produces two files in `database/migrations/future/`:

```
<issue-number>_rollout.sql    ← forward migration (ALTER TABLE, CREATE TABLE, etc.)
<issue-number>_rollback.sql   ← undo script (DROP COLUMN, DROP TABLE, etc.)
```

Naming by issue number ensures correct apply order within a release.
Multiple issues merged into one release all land in `future/` together and are applied in issue-number order.

### CI Validation (on PRs touching `database/`)

Spins up two fresh PostgreSQL instances:

```
DB_A: apply schema/ from main  →  apply future/<issue>_rollout.sql
DB_B: apply schema/ from this branch (developer's updated source files)

pg_dump --schema-only DB_A  vs  pg_dump --schema-only DB_B

match    → ✅ source files are in sync with the migration
mismatch → ❌ developer forgot to update a source file — PR blocked
```

This makes it impossible to merge a migration that silently drifts from the source files.

### Deploy (prod release)

```
1. SSH into VPS
2. Run all files in database/migrations/future/ against prod DB in issue-number order
   → any SQL error: abort deploy, do not restart bot, alert developer
3. If successful: restart bot + worker containers
4. CI archives: git mv database/migrations/future/* database/migrations/<tag>/
5. CI commits + pushes archive back to main
```

Step 4–5 means the repo always reflects exactly which migrations live in which release. Rollback is: find the failed release's folder, run the `_rollback.sql` files in reverse order, redeploy previous image.

### Rollback Procedure (manual)

```
1. SSH into VPS
2. Run database/migrations/<broken-tag>/*_rollback.sql in reverse issue-number order
3. docker compose pull (previous image tag) && docker compose up -d
```

No automated rollback — rollbacks are deliberate, manual decisions.

### GitHub Issues

All work tracked as GitHub Issues. No Jira.

Label conventions:
- `feat` — new feature
- `fix` — bug fix
- `chore` — maintenance, deps, config
- `blocked` — waiting on something external

Branch names reference the issue number: `feat/42-lfg-scheduling`

---

## Open Questions

_None currently._

---

## What We're Not Doing

- No web dashboard
- No per-server game catalogues (one global catalogue)
- No ELO / reputation system
- No voice activity tracking
- No rewrite of this rewrite
