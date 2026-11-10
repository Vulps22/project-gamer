CREATE TABLE "analytics"."reports" (
  "id"            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "period_type"   TEXT        NOT NULL CHECK ("period_type" IN ('weekly', 'monthly', 'quarterly', 'annual')),
  "period_start"  DATE        NOT NULL,
  "period_end"    DATE        NOT NULL,
  "data"          JSONB       NOT NULL,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("period_type", "period_start")
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON "analytics"."reports"
  FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

COMMENT ON TABLE "analytics"."reports" IS 'Report snapshots written by the analytics tool. One per period; regenerating a report upserts it.';

GRANT USAGE ON SCHEMA "analytics" TO analytics_user;
GRANT SELECT, INSERT, UPDATE ON "analytics"."reports" TO analytics_user;
