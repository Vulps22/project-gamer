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
