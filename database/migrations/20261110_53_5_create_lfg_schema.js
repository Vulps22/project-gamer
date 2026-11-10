/** @param {import('pg').Client} client */
async function apply(client) {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS "lfg";

    CREATE TABLE "lfg"."posts" (
      "id"                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      "server_id"          UUID        NOT NULL REFERENCES "servers"."config"("id"),
      "posted_by"          UUID        NOT NULL REFERENCES "users"."accounts"("id"),
      "game_id"            UUID        NOT NULL REFERENCES "games"."catalogue"("id"),
      "type"               TEXT        NOT NULL CHECK ("type" IN ('immediate', 'scheduled')),
      "scheduled_at"       TIMESTAMPTZ,
      "vc_channel_id"      TEXT,
      "message_id"         TEXT,
      "control_thread_id"  TEXT,
      "status"             TEXT        NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'expired', 'cancelled')),
      "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX "idx_posts_vc_channel" ON "lfg"."posts"("vc_channel_id");

    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "lfg"."posts"
      FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

    COMMENT ON TABLE "lfg"."posts" IS 'LFG sessions. The Discord post is a living record, edited in place as the session changes';
    COMMENT ON COLUMN "lfg"."posts"."scheduled_at" IS 'When a scheduled session starts; null for immediate posts';
    COMMENT ON COLUMN "lfg"."posts"."vc_channel_id" IS 'The session''s voice channel, once created';
    COMMENT ON COLUMN "lfg"."posts"."message_id" IS 'The LFG post, edited as the session changes';
    COMMENT ON COLUMN "lfg"."posts"."control_thread_id" IS 'Thread holding the creator''s control panel';

    GRANT USAGE ON SCHEMA "lfg" TO bot_user, analytics_user;
    GRANT SELECT, INSERT, UPDATE ON "lfg"."posts" TO bot_user;
    GRANT SELECT ON "lfg"."posts" TO analytics_user;

    CREATE TABLE "lfg"."invitees" (
      "post_id"     UUID        NOT NULL REFERENCES "lfg"."posts"("id") ON DELETE CASCADE,
      "user_id"     UUID        NOT NULL REFERENCES "users"."accounts"("id") ON DELETE CASCADE,
      "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY ("post_id", "user_id")
    );

    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "lfg"."invitees"
      FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

    COMMENT ON TABLE "lfg"."invitees" IS 'Players picked directly when the LFG post was created';

    GRANT SELECT, INSERT ON "lfg"."invitees" TO bot_user;
    GRANT SELECT ON "lfg"."invitees" TO analytics_user;

    CREATE TABLE "lfg"."interested" (
      "post_id"     UUID        NOT NULL REFERENCES "lfg"."posts"("id") ON DELETE CASCADE,
      "user_id"     UUID        NOT NULL REFERENCES "users"."accounts"("id") ON DELETE CASCADE,
      "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY ("post_id", "user_id")
    );

    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "lfg"."interested"
      FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

    COMMENT ON TABLE "lfg"."interested" IS 'Users who clicked Interested on an open invitation; pinged when the VC goes live';

    GRANT SELECT, INSERT, DELETE ON "lfg"."interested" TO bot_user;
    GRANT SELECT ON "lfg"."interested" TO analytics_user;
  `);
}

/** @param {import('pg').Client} client */
async function revert(client) {
  await client.query(`
    DROP TABLE "lfg"."interested";
    DROP TABLE "lfg"."invitees";
    DROP TABLE "lfg"."posts";
    DROP SCHEMA "lfg";
  `);
}

module.exports = { apply, revert };
