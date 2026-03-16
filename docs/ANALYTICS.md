# Project Gamer — Analytics

> Analytics is a **separate product** — not a feature of the bot.
> The bot's responsibility ends at storing operational data correctly.
> The analytics tool is a consumer of that data.

---

## Separation of Concerns

```
Bot (project-gamer)
  └── Handles user interactions
  └── Writes operational data to: store, games, users, servers, lfg schemas
  └── Has NO access to the analytics schema

Analytics Tool (separate repo / separate product)
  └── Read-only access to: store, games, users, servers, lfg schemas
  └── Read + Write + Execute on: analytics schema
  └── Builds and stores reports in: analytics.reports
  └── Serves the web UI (4 tabs: weekly / monthly / quarterly / annual)
  └── Authenticates staff via the shared vd database
```

The bot does not know the analytics tool exists. The analytics tool does not need the bot to be running.

---

## Database Permissions

Two PostgreSQL roles on the bot's database:

**`bot_user`** (used by the bot process and worker):
- `SELECT`, `INSERT`, `UPDATE`, `DELETE` on all tables in: `store`, `games`, `users`, `servers`, `lfg`
- No permissions on `analytics`

**`analytics_user`** (used by the analytics tool):
- `SELECT` on all tables in: `store`, `games`, `users`, `servers`, `lfg`
- `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `EXECUTE` on all tables/functions in: `analytics`

The boundary is enforced at the database level — not by convention.

---

## Analytics Schema

The `analytics` schema lives in the bot's PostgreSQL database (it's the bot's data), but is owned and written to exclusively by the analytics tool.

### `analytics.reports`

```sql
id           UUID        PRIMARY KEY DEFAULT gen_random_uuid()
period_type  TEXT        NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'annual'))
period_start DATE        NOT NULL
period_end   DATE        NOT NULL
data         JSONB       NOT NULL
generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
UNIQUE(period_type, period_start)
```

`UNIQUE(period_type, period_start)` allows safe upserts — reports can be regenerated without creating duplicates.

### Report Hierarchy

Reports are built bottom-up from stored snapshots, never from raw data re-queries:

```
weekly    → generated every Monday 00:00 UTC, covers the previous 7 days
monthly   → built from the 4–5 weekly snapshots for that month
quarterly → built from the 3 monthly snapshots for that quarter
annual    → built from the 4 quarterly snapshots for that year
```

Regenerating a monthly report does not require touching `lfg.posts` — it reads from `analytics.reports` where `period_type = 'weekly'`.

---

## Data Available for Analysis

All of the following is queryable by the analytics tool via its read-only access:

### User Retention
Powered by `users.accounts.last_interaction_at` (updated by the bot on every command interaction):

- Active last 7 days
- Active last 30 days
- Dormant 30–90 days
- Dead 90+ days

Server count is vanity. "42 servers, 12% of users active in the last 30 days" is the number that matters.

### LFG Activity
From `lfg.posts`, `lfg.invitees`, `lfg.interested`:
- Posts per server per week
- Immediate vs scheduled ratio
- Open invitation vs direct invite ratio
- Interested button engagement rate
- Average VC session duration (derived from post `created_at` and VC close event)

### Game Discovery
From `games.submissions`, `games.catalogue`, `users.game_library`:
- Games added per week (manual vs steam_sync)
- Submission volume, approval rate, rejection rate
- **Average approval time** (`reviewed_at - submitted_at`) — the bottleneck alert metric
- Most commonly submitted unrecognised stores (signals which scraper to build next)

### Approval Bottleneck Alert
Two signals, both tracked in the weekly report:

```json
"submissions": {
  "avg_approval_hours": 6.4,
  "pending_count": 2,
  "bottleneck_alert": false
}
```

`bottleneck_alert: true` when:
- Rolling 7-day average approval time exceeds **18 hours**, OR
- Pending submission count exceeds **10**

Either condition alone is enough to flag it.

### Server Health
From `servers.config` (with `joined_at`) and `guildCreate`/`guildDelete` events logged by the bot:
- New servers this week
- Servers removed this week
- Active servers (at least one LFG post this week)

### Steam Sync Health
From `users.steam_links` and job queue failure logs:
- Users with Steam linked vs total registered
- New Steam links this week
- Sync failure rate

---

## Staff Authentication

The analytics tool authenticates against the shared `vd` database (separate from the bot's database).

Access to the analytics web UI requires:
```sql
-- vd database
security.project_gamer.can_analyse = true
```

The `vd` database is not the bot's concern. It is shared Vulps Development infrastructure.

---

## What the Bot Does for Analytics

Exactly one thing: keeps `users.accounts.last_interaction_at` current.

```
On any command interaction → UPDATE users.accounts SET last_interaction_at = now()
                             WHERE discord_id = <interacting user>
```

Everything else the analytics tool needs is already in the operational data as a natural byproduct of the bot doing its job.

---

## What the Bot Does NOT Do for Analytics

- Does not build reports
- Does not schedule report jobs
- Does not send analytics webhooks
- Does not write to the `analytics` schema
- Does not know the analytics tool exists
