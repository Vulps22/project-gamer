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
