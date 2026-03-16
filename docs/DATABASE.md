# Project Gamer — Database Reference

> PostgreSQL. This document is the canonical reference for schema design.
> `database/schema/` contains the actual SQL source files — keep them in sync.

---

## Schema Namespacing

| Schema | Contains | Written by |
|--------|----------|------------|
| `store` | Known game stores — seed data, not user-generated | Bot (seed scripts) |
| `games` | Game catalogue, store entries, submission queue | Bot |
| `users` | Discord accounts, Steam links, game libraries | Bot |
| `servers` | Server config, memberships, sharing settings | Bot |
| `lfg` | Posts, invitees, interested users | Bot |
| `analytics` | Report snapshots (weekly/monthly/quarterly/annual) | Analytics tool only |

---

## Database Roles

```
bot_user         SELECT, INSERT, UPDATE, DELETE on store, games, users, servers, lfg
                 NO permissions on analytics

analytics_user   SELECT on store, games, users, servers, lfg
                 SELECT, INSERT, UPDATE, DELETE, EXECUTE on analytics
```

See [`ANALYTICS.md`](./ANALYTICS.md) for full analytics schema and report structure.

---

## Conventions

### Timestamps — every table, no exceptions

Every table carries `created_at` and `updated_at`. No exceptions, including junction tables.

```sql
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

`updated_at` is maintained by a shared PostgreSQL trigger — the application never sets it manually:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied in each table's source file, e.g.:
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON lfg.posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**Domain-specific timestamps** are kept only where they mean something distinct from `created_at` / `updated_at`:

| Column | Table | Meaning |
|--------|-------|---------|
| `last_interaction_at` | `users.accounts` | Last bot command use — analytics retention signal |
| `last_synced` | `users.steam_links` | Last successful Steam library sync |
| `reviewed_at` | `games.submissions` | When an admin approved or rejected the submission |
| `scheduled_at` | `lfg.posts` | When the gaming session is scheduled to start |

---

## `store` schema

### `store.stores`

The known list of game stores. Populated via seed scripts, not user input.

```sql
id          UUID        PRIMARY KEY DEFAULT gen_random_uuid()
name        TEXT        NOT NULL UNIQUE   -- 'Steam', 'Meta Quest', 'GOG', 'Xbox', 'Epic Games', 'RSI'
slug        TEXT        NOT NULL UNIQUE   -- 'steam', 'meta', 'gog', 'xbox', 'epic', 'rsi'
base_url    TEXT                         -- 'https://store.steampowered.com'
scraper     TEXT                         -- 'steam' | 'meta' | null
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

`scraper` maps to the worker's scraper implementation. `null` means no automated scraper exists — URLs from this store go straight to manual admin approval.

**Seed data (initial stores):**

| name | slug | scraper |
|------|------|---------|
| Steam | steam | steam |
| Meta Quest | meta | meta |
| GOG | gog | null |
| Xbox | xbox | null |
| Epic Games | epic | null |
| Robert Space Industries | rsi | null |

---

## `games` schema

### `games.catalogue`

```sql
id          UUID        PRIMARY KEY DEFAULT gen_random_uuid()
name        TEXT        NOT NULL
cover_art   TEXT                    -- URL
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

### `games.store_entries`

Links a game in the catalogue to its listing on a specific store.

```sql
id            UUID        PRIMARY KEY DEFAULT gen_random_uuid()
game_id       UUID        NOT NULL REFERENCES games.catalogue(id)  ON DELETE CASCADE
store_id      UUID        NOT NULL REFERENCES store.stores(id)
store_game_id TEXT        NOT NULL   -- store's own identifier (Steam appid, Meta app ID, etc.)
url           TEXT        NOT NULL
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
UNIQUE(store_id, store_game_id)
```

A game can have entries on multiple stores (same game on Steam and GOG, for example).

### `games.submissions`

Pending game additions from unrecognised URLs — routed to admin approval queue.

```sql
id              UUID        PRIMARY KEY DEFAULT gen_random_uuid()
submitted_by    UUID        NOT NULL REFERENCES users.accounts(id)
url             TEXT        NOT NULL
store_id        UUID        REFERENCES store.stores(id)    -- null if store is unrecognised
status          TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected'))
reviewed_at     TIMESTAMPTZ                                -- set when status changes from pending
result_game_id  UUID        REFERENCES games.catalogue(id) -- set on approval
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

## `users` schema

### `users.accounts`

```sql
id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid()
discord_id           TEXT        NOT NULL UNIQUE
last_interaction_at  TIMESTAMPTZ             -- updated on every command use; retention analytics signal
created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
```

Created on first interaction with the bot. Discord ID is the only required field — everything else is optional.

### `users.steam_links`

Optional. Maximum one row per user enforced by `UNIQUE(user_id)`.

```sql
id          UUID        PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID        NOT NULL UNIQUE REFERENCES users.accounts(id) ON DELETE CASCADE
steam_id    TEXT        NOT NULL
last_synced TIMESTAMPTZ             -- set after each successful Steam library sync
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

### `users.game_library`

```sql
id          UUID        PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID        NOT NULL REFERENCES users.accounts(id) ON DELETE CASCADE
game_id     UUID        NOT NULL REFERENCES games.catalogue(id) ON DELETE CASCADE
source      TEXT        NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual', 'steam_sync'))
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
UNIQUE(user_id, game_id)
```

`UNIQUE(user_id, game_id)` prevents duplicate library entries regardless of source.
`source` tracks how the game was added — useful for understanding sync coverage.

---

## `servers` schema

### `servers.config`

```sql
id              UUID        PRIMARY KEY DEFAULT gen_random_uuid()
discord_id      TEXT        NOT NULL UNIQUE
lfg_channel_id  TEXT                         -- Discord channel snowflake; null until /config lfg-channel is run
lfg_role_id     TEXT                         -- Discord role snowflake; nulled on roleDelete, recreated on next LFG or matching roleCreate
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

**`lfg_role_id` lifecycle:**
- Set on `guildCreate` (bot creates or finds existing `@lfg` role)
- Nulled on `roleDelete` if the deleted role matches the stored ID
- Re-created automatically on next `/lfg` command, or adopted if a role named `lfg` is created manually (`roleCreate`)

### `servers.members`

```sql
id          UUID        PRIMARY KEY DEFAULT gen_random_uuid()
server_id   UUID        NOT NULL REFERENCES servers.config(id)  ON DELETE CASCADE
user_id     UUID        NOT NULL REFERENCES users.accounts(id)  ON DELETE CASCADE
sharing     BOOLEAN     NOT NULL DEFAULT true
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
UNIQUE(server_id, user_id)
```

`sharing` defaults `true` — experience taught us that users didn't understand why they weren't appearing in LFG lists when it defaulted `false`.

---

## `lfg` schema

### `lfg.posts`

```sql
id                UUID        PRIMARY KEY DEFAULT gen_random_uuid()
server_id         UUID        NOT NULL REFERENCES servers.config(id)
posted_by         UUID        NOT NULL REFERENCES users.accounts(id)
game_id           UUID        NOT NULL REFERENCES games.catalogue(id)
type              TEXT        NOT NULL CHECK (type IN ('immediate', 'scheduled'))
scheduled_at      TIMESTAMPTZ              -- null for immediate posts; when the session is scheduled to start
vc_channel_id     TEXT                     -- Discord VC snowflake; set after VC creation
message_id        TEXT                     -- Discord message snowflake; used to edit the living post
control_thread_id TEXT                     -- Discord thread snowflake for creator control panel
status            TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'expired', 'cancelled'))
created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
```

**`message_id`** is what the bot uses to edit the post in place as VC state changes.
**`control_thread_id`** is the thread created on the post — first message contains "Change Time" and "Cancel" buttons, visible only to the creator (validated server-side against `posted_by`).

### `lfg.invitees`

Users directly selected when the LFG post was created (non-open-invitation flow).

```sql
post_id    UUID        NOT NULL REFERENCES lfg.posts(id) ON DELETE CASCADE
user_id    UUID        NOT NULL REFERENCES users.accounts(id) ON DELETE CASCADE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
PRIMARY KEY (post_id, user_id)
```

### `lfg.interested`

Users who clicked "Interested" on an open invitation post.

```sql
post_id    UUID        NOT NULL REFERENCES lfg.posts(id) ON DELETE CASCADE
user_id    UUID        NOT NULL REFERENCES users.accounts(id) ON DELETE CASCADE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
PRIMARY KEY (post_id, user_id)
```

Interested users are pinged when the VC goes live (immediate: on creation; scheduled: 10 minutes before scheduled time when the VC spins up).
