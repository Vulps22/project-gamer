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
