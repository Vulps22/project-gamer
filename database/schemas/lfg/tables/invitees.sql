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
