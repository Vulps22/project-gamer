/** @param {import('pg').Client} client */
async function apply(client) {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS "games";

    CREATE TABLE "games"."catalogue" (
      "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      "name"        TEXT        NOT NULL,
      "cover_art"   TEXT,
      "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX "idx_catalogue_name" ON "games"."catalogue"(lower("name"));

    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "games"."catalogue"
      FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

    COMMENT ON TABLE "games"."catalogue" IS 'The one global game catalogue';
    COMMENT ON COLUMN "games"."catalogue"."cover_art" IS 'Cover image URL';

    GRANT USAGE ON SCHEMA "games" TO bot_user, analytics_user;
    GRANT SELECT, INSERT, UPDATE ON "games"."catalogue" TO bot_user;
    GRANT SELECT ON "games"."catalogue" TO analytics_user;

    CREATE TABLE "games"."store_entries" (
      "id"             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      "game_id"        UUID        NOT NULL REFERENCES "games"."catalogue"("id") ON DELETE CASCADE,
      "store_id"       UUID        NOT NULL REFERENCES "store"."stores"("id"),
      "store_game_id"  TEXT        NOT NULL,
      "url"            TEXT        NOT NULL,
      "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE ("store_id", "store_game_id")
    );

    CREATE INDEX "idx_store_entries_game" ON "games"."store_entries"("game_id");

    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "games"."store_entries"
      FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

    COMMENT ON TABLE "games"."store_entries" IS 'A catalogue game''s listing on one store';
    COMMENT ON COLUMN "games"."store_entries"."store_game_id" IS 'The store''s own identifier (Steam appid, Meta app ID, ...)';

    GRANT SELECT, INSERT ON "games"."store_entries" TO bot_user;
    GRANT SELECT ON "games"."store_entries" TO analytics_user;

    CREATE TABLE "games"."submissions" (
      "id"              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      "submitted_by"    UUID        NOT NULL,
      "url"             TEXT        NOT NULL,
      "store_id"        UUID        REFERENCES "store"."stores"("id"),
      "status"          TEXT        NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected')),
      "reviewed_at"     TIMESTAMPTZ,
      "result_game_id"  UUID        REFERENCES "games"."catalogue"("id"),
      "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- submitted_by references users.accounts. The users schema installs after games, so
    -- that foreign key is added in users/tables/accounts.sql.

    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "games"."submissions"
      FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

    COMMENT ON TABLE "games"."submissions" IS 'Game additions from URLs no scraper could handle, waiting for admin approval';
    COMMENT ON COLUMN "games"."submissions"."store_id" IS 'Null when the URL''s store is unrecognised';
    COMMENT ON COLUMN "games"."submissions"."reviewed_at" IS 'When an admin approved or rejected the submission';
    COMMENT ON COLUMN "games"."submissions"."result_game_id" IS 'The catalogue game created on approval';

    GRANT SELECT, INSERT, UPDATE ON "games"."submissions" TO bot_user;
    GRANT SELECT ON "games"."submissions" TO analytics_user;
  `);
}

/** @param {import('pg').Client} client */
async function revert(client) {
  await client.query(`
    DROP TABLE "games"."submissions";
    DROP TABLE "games"."store_entries";
    DROP TABLE "games"."catalogue";
    DROP SCHEMA "games";
  `);
}

module.exports = { apply, revert };
