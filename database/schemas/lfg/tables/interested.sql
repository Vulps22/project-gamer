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
