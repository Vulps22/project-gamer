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
| ORM / Query | Kysely | TypeScript-first query builder, no magic, no surprises |
| Job queue | BullMQ + Redis | Retries, scheduling, visibility, keeps sync off main thread |
| Scrapers | Cheerio (Steam) + Puppeteer (Meta) | Meta has bot protections that require a real browser; carry forward knowledge, rewrite clean |
| Testing | Vitest | Faster than Jest, native ESM, compatible with TS |
| Linting | ESLint + typescript-eslint | |

---

## PostgreSQL Schema Namespacing

Rather than prefixing table names or cramming everything into `public`:

```
games     → game catalogue, store entries, submission queue
users     → discord users, steam account links
servers   → server config, memberships, sharing settings
lfg       → posts, sessions, scheduled events, VC tracking
```

---

## Data Model

### `users` schema

```sql
users.accounts
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  discord_id    TEXT UNIQUE NOT NULL
  created_at    TIMESTAMPTZ DEFAULT now()

users.steam_links
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id       UUID REFERENCES users.accounts(id) ON DELETE CASCADE
  steam_id      TEXT NOT NULL
  linked_at     TIMESTAMPTZ DEFAULT now()
  last_synced   TIMESTAMPTZ

users.game_library
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id       UUID REFERENCES users.accounts(id) ON DELETE CASCADE
  game_id       UUID REFERENCES games.catalogue(id)
  added_at      TIMESTAMPTZ DEFAULT now()
  source        TEXT  -- 'manual' | 'steam_sync'
```

### `games` schema

```sql
games.catalogue
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name          TEXT NOT NULL
  cover_art     TEXT  -- URL
  created_at    TIMESTAMPTZ DEFAULT now()

games.store_entries
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  game_id       UUID REFERENCES games.catalogue(id)
  store         TEXT NOT NULL  -- 'steam' | 'meta' | 'gog'
  store_game_id TEXT NOT NULL
  url           TEXT NOT NULL
  UNIQUE(store, store_game_id)

games.submissions
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  submitted_by  UUID REFERENCES users.accounts(id)
  url           TEXT NOT NULL
  store         TEXT  -- null if unrecognised
  status        TEXT DEFAULT 'pending'  -- 'pending' | 'approved' | 'rejected'
  submitted_at  TIMESTAMPTZ DEFAULT now()
  reviewed_at   TIMESTAMPTZ
  result_game_id UUID REFERENCES games.catalogue(id)  -- set on approval
```

### `servers` schema

```sql
servers.config
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  discord_id      TEXT UNIQUE NOT NULL
  lfg_channel_id  TEXT  -- Discord channel snowflake
  lfg_role_id     TEXT  -- Discord role snowflake (auto-created on join)
  joined_at       TIMESTAMPTZ DEFAULT now()

servers.members
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  server_id   UUID REFERENCES servers.config(id) ON DELETE CASCADE
  user_id     UUID REFERENCES users.accounts(id) ON DELETE CASCADE
  sharing     BOOLEAN DEFAULT true   -- defaults on: users asked why they weren't appearing in LFG lists
  joined_at   TIMESTAMPTZ DEFAULT now()
  UNIQUE(server_id, user_id)
```

### `lfg` schema

```sql
lfg.posts
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  server_id       UUID REFERENCES servers.config(id)
  posted_by       UUID REFERENCES users.accounts(id)
  game_id         UUID REFERENCES games.catalogue(id)
  type            TEXT NOT NULL  -- 'immediate' | 'scheduled'
  scheduled_at    TIMESTAMPTZ   -- null for immediate
  vc_channel_id   TEXT          -- Discord VC snowflake, set after creation
  message_id      TEXT          -- Discord message snowflake
  status          TEXT DEFAULT 'active'  -- 'active' | 'expired' | 'cancelled'
  created_at      TIMESTAMPTZ DEFAULT now()

lfg.invitees
  post_id     UUID REFERENCES lfg.posts(id) ON DELETE CASCADE
  user_id     UUID REFERENCES users.accounts(id)
  PRIMARY KEY (post_id, user_id)
```

---

## Feature Scope

### In Scope for v2 Launch

#### Steam (Optional)
- `/steam link <profile_url>` — link a Steam profile, no login required
- `/steam unlink` — remove Steam link
- `/steam sync` — manual trigger for library sync
- Auto-sync runs as a background job (BullMQ), opt-in per user

#### Library Management
- `/library add <url>` — add a game by store URL (Steam or Meta)
- `/library remove <game>` — remove a game (autocomplete)
- `/library view [user]` — view own or another user's library (if they're sharing)

#### Sharing
- `/sharing on|off` — toggle library visibility for the current server (per-server, per-user)

#### LFG
The LFG post embed is a **living record** — it is edited in place as session state changes.

VC field states:
- Scheduled, VC not yet created: `⚠️ <t:timestamp:R>` (Discord relative timestamp — "in 2 hours")
- VC active: `VC: <#channel-link>`
- VC closed: `VC: ❌ CLOSED`

The `message_id` stored on `lfg.posts` is what the bot uses to edit the post when state changes.

- `/lfg play <game>` — immediate session
  - Shows server members who have the game and are sharing
  - Select one or more players, or press "Open Invitation"
  - Open Invitation pings `@lfg`
  - Bot creates a VC named after the game, edits post to show `VC: <#channel-link>`
  - VC auto-deletes after 1hr, or 10min after becoming empty (whichever comes first)
  - On VC deletion, post is edited to show `VC: ❌ CLOSED`
- `/lfg schedule <game> <time>` — scheduled session
  - `<time>` is a Unix timestamp integer (users can generate these at e.g. hammertime.cyou)
  - Bot validates the timestamp is in the future
  - Same player selection flow as `/lfg play`
  - Post displays `<t:timestamp:F>` (Discord localised timestamp, shown in each user's local timezone)
  - Post VC field shows `⚠️ <t:timestamp:R>` until VC is created
  - VC created 10 minutes before scheduled time, post updated to `VC: <#channel-link>`
  - On VC deletion, post is edited to show `VC: ❌ CLOSED`

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

/steam link <profile_url>
/steam unlink
/steam sync

/sharing on
/sharing off

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
  └── vc.cleanup      — check VC occupancy, delete if rules met
  └── lfg.scheduled   — spin up VC 10min before scheduled LFG
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

## Open Questions

_None currently._

---

## What We're Not Doing

- No web dashboard
- No per-server game catalogues (one global catalogue)
- No ELO / reputation system
- No voice activity tracking
- No rewrite of this rewrite
