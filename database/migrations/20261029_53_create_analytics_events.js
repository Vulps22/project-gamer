/** @param {import('pg').Client} client */
async function apply(client) {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS "analytics";

    CREATE TABLE "analytics"."events" (
      "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
      "service"           VARCHAR(2)  NOT NULL,
      "interaction_type"  VARCHAR(10) NOT NULL CHECK ("interaction_type" IN ('command', 'button', 'select', 'modal', 'search')),
      "interaction_name"  TEXT        NOT NULL,
      "user_id"           BIGINT      NOT NULL,
      "guild_id"          BIGINT,
      "execution_id"      BIGINT      NOT NULL,
      "flow_id"           BIGINT      NOT NULL,
      "duration_ms"       INTEGER     NOT NULL,
      "outcome"           VARCHAR(10) NOT NULL CHECK ("outcome" IN ('ok', 'error', 'timeout')),
      "error_code"        TEXT,
      "detail"            TEXT
    );

    SELECT create_hypertable('analytics.events', by_range('created_at'));

    SELECT add_retention_policy('analytics.events', INTERVAL '6 months');

    CREATE INDEX "idx_events_guild_created" ON "analytics"."events"("guild_id", "created_at");
    CREATE INDEX "idx_events_user_created" ON "analytics"."events"("user_id", "created_at");
    CREATE INDEX "idx_events_flow" ON "analytics"."events"("flow_id");

    COMMENT ON TABLE "analytics"."events" IS 'One row per interaction the bot handles, written when handling finishes. Hypertable; raw rows are dropped after 6 months (see analytics.events_weekly / events_monthly for the long-term record). Events are immutable, so there is no updated_at.';
    COMMENT ON COLUMN "analytics"."events"."created_at" IS 'When the interaction occurred; hypertable partition column';
    COMMENT ON COLUMN "analytics"."events"."service" IS 'Which bot recorded the interaction: pg';
    COMMENT ON COLUMN "analytics"."events"."interaction_type" IS 'command, button, select, modal, or search (a zero-result autocomplete)';
    COMMENT ON COLUMN "analytics"."events"."interaction_name" IS 'Command name with subcommand, or the component baseId';
    COMMENT ON COLUMN "analytics"."events"."user_id" IS 'Discord user ID';
    COMMENT ON COLUMN "analytics"."events"."guild_id" IS 'Discord guild ID; null outside a guild';
    COMMENT ON COLUMN "analytics"."events"."execution_id" IS 'This interaction''s snowflake';
    COMMENT ON COLUMN "analytics"."events"."flow_id" IS 'Snowflake of the interaction that started the flow; equals execution_id for a flow root';
    COMMENT ON COLUMN "analytics"."events"."duration_ms" IS 'From receipt to handler completion';
    COMMENT ON COLUMN "analytics"."events"."outcome" IS 'ok, error or timeout';
    COMMENT ON COLUMN "analytics"."events"."error_code" IS 'Set when outcome is not ok';
    COMMENT ON COLUMN "analytics"."events"."detail" IS 'The search text for search events; otherwise null';

    GRANT USAGE ON SCHEMA "analytics" TO bot_user, analytics_user;
    GRANT INSERT ON "analytics"."events" TO bot_user;
    GRANT SELECT ON "analytics"."events" TO analytics_user;
  `);
}

/** @param {import('pg').Client} client */
async function revert(client) {
  await client.query(`
    DROP SCHEMA "analytics" CASCADE;
  `);
}

module.exports = { apply, revert };
