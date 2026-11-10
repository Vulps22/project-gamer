CREATE MATERIALIZED VIEW "analytics"."events_monthly"
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 month', "created_at") AS "bucket",
  "service",
  "interaction_type",
  "interaction_name",
  "outcome",
  COUNT(*) AS "interaction_count",
  hyperloglog(4096, "user_id") AS "user_hll",
  hyperloglog(4096, "guild_id") AS "guild_hll",
  percentile_agg("duration_ms") AS "duration_pct"
FROM "analytics"."events"
GROUP BY "bucket", "service", "interaction_type", "interaction_name", "outcome"
WITH NO DATA;

SELECT add_continuous_aggregate_policy('analytics.events_monthly',
  start_offset => INTERVAL '3 months',
  end_offset => INTERVAL '1 month',
  schedule_interval => INTERVAL '1 day');

COMMENT ON VIEW "analytics"."events_monthly" IS 'Monthly interaction counts by service, type, name and outcome, built directly from raw analytics.events (not from events_weekly). Read user_hll / guild_hll with distinct_count() and duration_pct with approx_percentile(0.95, duration_pct). The sketches hold no raw IDs, so they are kept after the raw rows are dropped. Never refresh_continuous_aggregate() over a range older than the 6-month raw retention: the source rows are gone and the bucket will be zeroed.';

GRANT SELECT ON "analytics"."events_monthly" TO analytics_user;
