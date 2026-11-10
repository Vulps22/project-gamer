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
