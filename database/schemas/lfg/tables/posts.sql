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
