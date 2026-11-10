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
