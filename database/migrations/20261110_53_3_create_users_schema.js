/** @param {import('pg').Client} client */
async function apply(client) {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS "users";

    CREATE TABLE "users"."accounts" (
      "id"                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      "discord_id"           TEXT        NOT NULL UNIQUE,
      "last_interaction_at"  TIMESTAMPTZ,
      "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "users"."accounts"
      FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

    -- games installs before users, so games.submissions gets this foreign key here.
    ALTER TABLE "games"."submissions"
      ADD CONSTRAINT "submissions_submitted_by_fkey"
      FOREIGN KEY ("submitted_by") REFERENCES "users"."accounts"("id");

    COMMENT ON TABLE "users"."accounts" IS 'Discord users, created on their first interaction with the bot';
    COMMENT ON COLUMN "users"."accounts"."last_interaction_at" IS 'Last interaction with the bot; the retention analytics signal';

    GRANT USAGE ON SCHEMA "users" TO bot_user, analytics_user;
    GRANT SELECT, INSERT, UPDATE ON "users"."accounts" TO bot_user;
    GRANT SELECT ON "users"."accounts" TO analytics_user;

    CREATE TABLE "users"."game_library" (
      "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id"     UUID        NOT NULL REFERENCES "users"."accounts"("id") ON DELETE CASCADE,
      "game_id"     UUID        NOT NULL REFERENCES "games"."catalogue"("id") ON DELETE CASCADE,
      "source"      TEXT        NOT NULL DEFAULT 'manual' CHECK ("source" IN ('manual', 'steam_sync')),
      "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE ("user_id", "game_id")
    );

    CREATE INDEX "idx_game_library_game" ON "users"."game_library"("game_id");

    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "users"."game_library"
      FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

    COMMENT ON TABLE "users"."game_library" IS 'Games each user owns';
    COMMENT ON COLUMN "users"."game_library"."source" IS 'How the game was added: manual or steam_sync';

    GRANT SELECT, INSERT, DELETE ON "users"."game_library" TO bot_user;
    GRANT SELECT ON "users"."game_library" TO analytics_user;

    CREATE TABLE "users"."steam_links" (
      "id"           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id"      UUID        NOT NULL UNIQUE REFERENCES "users"."accounts"("id") ON DELETE CASCADE,
      "steam_id"     TEXT        NOT NULL,
      "last_synced"  TIMESTAMPTZ,
      "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "users"."steam_links"
      FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

    COMMENT ON TABLE "users"."steam_links" IS 'Optional Steam account link, at most one per user';
    COMMENT ON COLUMN "users"."steam_links"."last_synced" IS 'Last successful Steam library sync';

    GRANT SELECT, INSERT, UPDATE, DELETE ON "users"."steam_links" TO bot_user;
    GRANT SELECT ON "users"."steam_links" TO analytics_user;
  `);
}

/** @param {import('pg').Client} client */
async function revert(client) {
  await client.query(`
    ALTER TABLE "games"."submissions" DROP CONSTRAINT "submissions_submitted_by_fkey";
    DROP TABLE "users"."steam_links";
    DROP TABLE "users"."game_library";
    DROP TABLE "users"."accounts";
    DROP SCHEMA "users";
  `);
}

module.exports = { apply, revert };
