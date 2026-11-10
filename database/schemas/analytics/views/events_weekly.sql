CREATE MATERIALIZED VIEW "analytics"."events_weekly"
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 week', "created_at") AS "bucket",
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

SELECT add_continuous_aggregate_policy('analytics.events_weekly',
  start_offset => INTERVAL '3 weeks',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

COMMENT ON VIEW "analytics"."events_weekly" IS 'Weekly interaction counts by service, type, name and outcome, built directly from raw analytics.events (not from events_monthly). Read user_hll / guild_hll with distinct_count() and duration_pct with approx_percentile(0.95, duration_pct). The sketches hold no raw IDs, so they are kept after the raw rows are dropped. Never refresh_continuous_aggregate() over a range older than the 6-month raw retention: the source rows are gone and the bucket will be zeroed.';

GRANT SELECT ON "analytics"."events_weekly" TO analytics_user;
