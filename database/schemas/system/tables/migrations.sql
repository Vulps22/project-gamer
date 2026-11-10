CREATE TABLE "system"."migrations" (
  "name"        VARCHAR(255) PRIMARY KEY,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON "system"."migrations"
  FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

COMMENT ON TABLE "system"."migrations" IS 'Applied migrations, one row per file in database/migrations. created_at is when it was applied.';
