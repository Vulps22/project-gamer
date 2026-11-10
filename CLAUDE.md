# Project Gamer (PG) — CLAUDE.md

## Working Agreement

**Always present a plan and wait for explicit approval before making any code changes.**
Do not edit, create, or delete files until the user says to go ahead.

## What This Is

PG (publicly **LFGameSync**) is a Discord bot that helps communities find members who own the same games, and organise sessions to play them.

**Current state:** mid-rebuild. The JavaScript in `src/` is v1, which is being replaced by a TypeScript rebuild. The design lives in `docs/`, and those docs are the source of truth for the rebuild:

| Doc | Covers |
|---|---|
| [`docs/PLANNING.md`](./docs/PLANNING.md) | Scope, architecture, development process, releases, migrations |
| [`docs/DATABASE.md`](./docs/DATABASE.md) | Schemas, tables, database roles and grants |
| [`docs/ANALYTICS.md`](./docs/ANALYTICS.md) | Interaction event tracking, flows, reports |

If code and docs disagree, raise it. Don't silently follow either.

---

## Architecture

```
Main process  ── ShardingManager → shards (Discord interactions)
              └─ pathfinder HTTP server (Steam OpenID callback, top.gg vote webhook)
Worker        ── BullMQ jobs (Steam sync, scraping, VC lifecycle, session cleanup)
Redis         ── job queue + short-lived caches (e.g. repeat-voter cache)
PostgreSQL    ── native install on the VPS (not Docker); database `project-gamer` (dev: `project-gamer-dev`)
```

Shared VD packages: `@vulps22/bot-interactions`, `@vulps22/logger`, `@vulps22/pathfinder`.

---

## Environment

`ENVIRONMENT` must be `dev`, `stage` or `prod` (not `production`). It selects `src/config/<env>/`.

- **Secrets live only in env files** (`node --env-file`): the Discord token, DB passwords, the Steam API key and top.gg secrets. They are never committed, never stored in the database, and **never logged**. That includes config dumps.
- Non-secret config (channel IDs, the official server link) lives in the typed `src/config/<env>/` modules.
- **Never use production credentials while developing.** Dev uses its own bot and its own database (`project-gamer-dev`).

---

## Database

- Zero trust, with PE's users: `awesome_vd_user` (rollout) owns every schema; `bot_user` and `analytics_user` get per-table grants of exactly what they use, written in each table's schema file. Dev and prod use the same users. See `docs/DATABASE.md`.
- `database/schemas/` is the current state; `database/migrations/` holds the changes, one schema per migration. Every migration has a working `revert()`.
- Prod migrations run on the VPS only. The `postgres` superuser has no password and is for `database/scripts/bootstrap.sql` only, run through `sudo` on the VPS.

---

## Git Conventions

### Branches
`<issue_number>-<issue-title-slugified>`, always linked to an issue and **always cut from `current-release`, never `main`**:
```bash
gh issue develop <issue_number> --repo Vulps22/project-gamer --checkout --base current-release
```
PRs merge into `main`.

### Commits
```
#<issue_number> - <message up to 50 characters>
```
- Bodies only for genuinely complex commits.
- Single responsibility: one logical change per commit. Split mixed files with `git add -p`.

### PR titles
```
#<issue_number> - Add|Remove|Update|Revert|Refactor <short summary>
```
No colon after the verb. Enforced by `validate-pr-title.yml`.

---

## Code Standards

- **SOLID and DRY.** Every piece of logic has one authoritative source; if the same code appears twice, extract it.
- **TypeScript strict**, no `any`.
- **Constructor injection.** No service imports `db`, `logger` or another service directly. Dependencies are wired in the services barrel (the composition root). This deliberately differs from PE.

---

## Key Patterns

### Interactions
- Handlers live in `src/_handlers/{commands,buttons,selects,modals}/` and export a `Handler<T>`. Components are registered by `baseId`.
- **Buttons and selects: `await interaction.deferUpdate()` first**, before any async work, then respond with `ephemeralFollowUp()`.
- Commands that do I/O defer first.
- Components V2 messages never carry `content`.

### Custom IDs and flows
- **Always build custom IDs with `interaction.createCustomId(prefix, action, params)`**, using the `[prefix, action]` pairs in `src/constants/interactions.ts`. Never hand-write a custom ID string. This is what carries the flow ID that ties a user journey together in analytics.
- The `f` param key is reserved for the flow ID.

### Logging and analytics
- **Never `await` a log or analytics write inside an interaction.** Use fire-and-forget (`void`). Awaiting a Discord log message on every interaction is what locked up v1.
- Every interaction records one `analytics.events` row when its handler finishes (see `docs/ANALYTICS.md`).

### User-facing copy
- The only official server link is `https://discord.vulps.co.uk` (the Vulps Community Hub), and it comes from config.
- Don't promise anything in UI copy that isn't built yet.
