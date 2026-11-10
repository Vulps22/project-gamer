# Project Gamer — Analytics

> PG records **every** user interaction as an event, and tags each one with the flow it belongs to.
> Reports are built by a separate analytics tool that reads those events. The bot writes events and never reads them.

---

## Separation of Concerns

```
Bot (PG)
  └── Handles user interactions
  └── Writes one row to analytics.events per interaction (INSERT only, fire-and-forget)
  └── Cannot read anything in the analytics schema

Analytics Tool (separate repo / separate product)
  └── Reads analytics.events and its aggregates
  └── Reads the operational schemas it reports on (read-only)
  └── Writes report snapshots to analytics.reports
  └── Serves the web UI (4 tabs: weekly / monthly / quarterly / annual)
  └── Authenticates staff via the shared vd database
```

The bot does not know the analytics tool exists. The analytics tool does not need the bot to be running.
Every boundary above is a database grant, not a convention. See [Database Roles](./DATABASE.md#database-roles).

---

## Event Tracking

### What is recorded

Every interaction the bot handles produces exactly one event, written when handling **finishes**:

| `interaction_type` | Recorded when | `interaction_name` |
|--------------------|---------------|--------------------|
| `command` | Every slash command | Command name, including subcommand (`library add`) |
| `button` | Every button click | Button `prefix_action` (`lfg_interested`) |
| `select` | Every select menu submission | Select `prefix_action` |
| `modal` | Every modal submission | Modal `prefix_action` |
| `search` | An autocomplete that returned **zero results** | Command name; the search text goes in `detail` |

Autocomplete fires on every keystroke, so successful searches aren't recorded. Zero-result searches are recorded because each one is a game a user wanted that the catalogue doesn't have.

### Rules

- **Fire-and-forget.** Writing the event is never awaited inside the interaction. Analytics must not add latency to an interaction or be able to make one fail. A failed write is logged and dropped.
- **Recorded on completion,** so `duration_ms` and `outcome` reflect what the user actually experienced.
- **Interactions outside a guild are still recorded,** with `guild_id` null.

### Flows

A **flow** is one user journey across several interactions. For example: `/lfg` → player select → LFG post → other users clicking "I have this game" on that post.

Flow tracking comes from `@vulps22/bot-interactions`:

- Every interaction has an `executionId` (its own Discord snowflake) and a `flowId`.
- An interaction that doesn't continue a flow (every slash command, and any component built without one) starts its own flow, so its `flowId` equals its own `executionId`.
- Components built inside a handler with `interaction.createCustomId(prefix, action, params)` carry the current `flowId` in their custom ID. It's stored in base36 under the reserved param key `f`, which costs about 14 of the 100 available characters.
- The interaction a component produces reads it back as `flowId`. `isFlowRoot` says whether it started the flow.
- A flow can include more than one user. Clicks on a public LFG post carry the poster's flow, so `user_id` varies within the flow while `flow_id` stays the same.

Components built without `createCustomId` (or before flow tracking existed) simply start a new flow. Nothing breaks; the link to the earlier flow is lost.

---

## `analytics` schema

### `analytics.events`

TimescaleDB hypertable, partitioned on `created_at`. The first six columns are identical to Project Encourage's `analytics.events`, so one analytics tool can read both. The remaining columns are PG's additions.

```sql
created_at        TIMESTAMPTZ NOT NULL DEFAULT now()   -- hypertable partition column
service           VARCHAR(2)  NOT NULL                 -- 'pg'
interaction_type  VARCHAR(10) NOT NULL                 -- CHECK: command | button | select | modal | search
interaction_name  TEXT        NOT NULL
user_id           BIGINT      NOT NULL
guild_id          BIGINT                               -- null outside a guild
execution_id      BIGINT      NOT NULL                 -- this interaction's snowflake
flow_id           BIGINT      NOT NULL                 -- snowflake of the interaction that started the flow
duration_ms       INTEGER     NOT NULL                 -- receipt to handler completion
outcome           VARCHAR(10) NOT NULL                 -- CHECK: ok | error | timeout
error_code        TEXT                                 -- set when outcome != 'ok'
detail            TEXT                                 -- search text for 'search' events; otherwise null
```

Indexes: `(guild_id, created_at)`, `(user_id, created_at)` (as PE), plus `(flow_id)`.

Retention policy: raw rows are dropped after **6 months** (as PE).

Unlike the operational schemas, this table has no `updated_at`. Events are immutable once written and are never updated.

### Continuous aggregates

`analytics.events_weekly` and `analytics.events_monthly`, refreshed by TimescaleDB policies (weekly every hour, monthly every day, as PE) and kept indefinitely. Each is built directly from raw `analytics.events`; monthly is not derived from weekly (as PE). Grouped by `service, interaction_type, interaction_name, outcome`:

- `interaction_count`
- `user_hll`, `guild_hll`: hyperloglog sketches for approximate unique counts. They hold no raw IDs, which is why they can outlive the 6-month raw retention.
- `duration_pct`: a `percentile_agg` sketch of `duration_ms`. Read p50/p95/p99 from it.

Never `refresh_continuous_aggregate()` over a range older than the raw retention cutoff. The source rows are gone, so that bucket will be zeroed.

Hypertables and continuous aggregates need the `timescaledb` and `timescaledb_toolkit` extensions in PG's database. Creating an extension needs a superuser, so it's a one-time bootstrap step (see [Database Roles](./DATABASE.md#database-roles)). After that, creating the hypertable and the aggregates only needs table ownership, so these migrations aren't gated behind `requiresSuperUser`. The aggregate migrations do use `skipTransaction`.

### `analytics.reports`

```sql
id           UUID        PRIMARY KEY DEFAULT gen_random_uuid()
period_type  TEXT        NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'annual'))
period_start DATE        NOT NULL
period_end   DATE        NOT NULL
data         JSONB       NOT NULL
created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
UNIQUE(period_type, period_start)
```

`UNIQUE(period_type, period_start)` allows safe upserts, so a report can be regenerated without creating a duplicate.

Report hierarchy, built bottom-up from stored snapshots rather than by re-querying raw data:

```
weekly    → generated every Monday 00:00 UTC, covers the previous 7 days
monthly   → built from the 4–5 weekly snapshots for that month
quarterly → built from the 3 monthly snapshots for that quarter
annual    → built from the 4 quarterly snapshots for that year
```

---

## What the Data Answers

### Usage and strain (from `analytics.events`)
- Interactions per command / button / select / modal, per week
- Response time p50/p95/p99 per interaction. Anything near Discord's 3-second initial-response window is strain.
- Error and timeout rate per interaction, broken down by `error_code`
- Zero-result searches: the most-wanted games missing from the catalogue

### Flows (from `analytics.events`, grouped by `flow_id`)
- **LFG conversion:** of the flows started by `/lfg`, how many reached a posted LFG, and how many "I have this game" / "Interested" clicks each post drew from users other than the poster
- **Drop-off:** where flows stop. For example, users who open the store select and never submit it.
- **Library growth path:** which flows end in a game being added (`/library add`, an LFG post's "I have this game", Steam sync)

### User retention
From `users.accounts.last_interaction_at`, which the bot updates on every interaction:
- Active in the last 7 days
- Active in the last 30 days
- Dormant 30–90 days
- Dead 90+ days

Server count is vanity. "42 servers, 12% of users active in the last 30 days" is the number that matters.

### LFG activity
From `lfg.posts`, `lfg.invitees`, `lfg.interested`:
- Posts per server per week
- Immediate vs scheduled ratio
- Open invitation vs direct invite ratio
- Average VC session duration (from the post's `created_at` and the VC close event)

### Game discovery
From `games.submissions`, `games.catalogue`, `users.game_library`:
- Games added per week (manual vs steam_sync)
- Submission volume, approval rate, rejection rate
- **Average approval time** (`reviewed_at - created_at`), the bottleneck alert metric
- Most commonly submitted unrecognised stores (tells you which scraper to build next)

### Approval bottleneck alert
Tracked in the weekly report:

```json
"submissions": {
  "avg_approval_hours": 6.4,
  "pending_count": 2,
  "bottleneck_alert": false
}
```

`bottleneck_alert: true` when the rolling 7-day average approval time exceeds **18 hours**, or the pending submission count exceeds **10**. Either condition alone is enough.

### Server health
From `servers.config` and the `guildCreate` / `guildDelete` events:
- New servers this week
- Servers removed this week
- Active servers (at least one LFG post this week)

### Steam sync health
From `users.steam_links` and job queue failure logs:
- Users with Steam linked vs total registered
- New Steam links this week
- Sync failure rate

---

## Staff Authentication

The analytics tool authenticates against the shared `vd` database, which is separate from PG's database.

Access to the analytics web UI requires:
```sql
-- vd database
security.project_gamer.can_analyse = true
```
