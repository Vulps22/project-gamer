/** @param {import('pg').Client} client */
async function apply(client) {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS "servers";

    CREATE TABLE "servers"."config" (
      "id"              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      "discord_id"      TEXT        NOT NULL UNIQUE,
      "lfg_channel_id"  TEXT,
      "lfg_role_id"     TEXT,
      "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "servers"."config"
      FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

    COMMENT ON TABLE "servers"."config" IS 'Per-server settings';
    COMMENT ON COLUMN "servers"."config"."lfg_channel_id" IS 'Where LFG posts go; null until /config lfg-channel is run';
    COMMENT ON COLUMN "servers"."config"."lfg_role_id" IS 'The @lfg role; nulled on roleDelete, recreated on the next LFG or adopted on roleCreate';

    GRANT USAGE ON SCHEMA "servers" TO bot_user, analytics_user;
    GRANT SELECT, INSERT, UPDATE ON "servers"."config" TO bot_user;
    GRANT SELECT ON "servers"."config" TO analytics_user;

    CREATE TABLE "servers"."members" (
      "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      "server_id"   UUID        NOT NULL REFERENCES "servers"."config"("id") ON DELETE CASCADE,
      "user_id"     UUID        NOT NULL REFERENCES "users"."accounts"("id") ON DELETE CASCADE,
      "sharing"     BOOLEAN     NOT NULL DEFAULT true,
      "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE ("server_id", "user_id")
    );

    CREATE INDEX "idx_members_user" ON "servers"."members"("user_id");

    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "servers"."members"
      FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

    COMMENT ON TABLE "servers"."members" IS 'Which users use the bot in which servers';
    COMMENT ON COLUMN "servers"."members"."sharing" IS 'Whether the user''s library is visible in this server. Defaults on: users did not understand why they were missing from LFG lists when it defaulted off';

    GRANT SELECT, INSERT, UPDATE ON "servers"."members" TO bot_user;
    GRANT SELECT ON "servers"."members" TO analytics_user;
  `);
}

/** @param {import('pg').Client} client */
async function revert(client) {
  await client.query(`
    DROP TABLE "servers"."members";
    DROP TABLE "servers"."config";
    DROP SCHEMA "servers";
  `);
}

module.exports = { apply, revert };
