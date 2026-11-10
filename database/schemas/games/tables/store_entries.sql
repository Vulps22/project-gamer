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
