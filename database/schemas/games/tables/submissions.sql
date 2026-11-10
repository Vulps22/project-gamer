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
