/** @param {import('pg').Client} client */
async function apply(client) {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS "store";

    CREATE TABLE "store"."stores" (
      "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      "name"        TEXT        NOT NULL UNIQUE,
      "slug"        TEXT        NOT NULL UNIQUE,
      "base_url"    TEXT,
      "scraper"     TEXT,
      "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "store"."stores"
      FOR EACH ROW EXECUTE FUNCTION "system"."set_updated_at"();

    COMMENT ON TABLE "store"."stores" IS 'Known game stores. Seed data written by the rollout, never by users.';
    COMMENT ON COLUMN "store"."stores"."base_url" IS 'Store front URL; store URLs are matched against its host';
    COMMENT ON COLUMN "store"."stores"."scraper" IS 'The worker scraper for this store (steam, meta), or null when URLs go to manual approval';

    INSERT INTO "store"."stores" ("name", "slug", "base_url", "scraper") VALUES
      ('Steam', 'steam', 'https://store.steampowered.com', 'steam'),
      ('Meta Quest', 'meta', 'https://www.meta.com', 'meta'),
      ('GOG', 'gog', 'https://www.gog.com', NULL),
      ('Xbox', 'xbox', 'https://www.xbox.com', NULL),
      ('Epic Games', 'epic', 'https://store.epicgames.com', NULL),
      ('Robert Space Industries', 'rsi', 'https://robertsspaceindustries.com', NULL);

    GRANT USAGE ON SCHEMA "store" TO bot_user, analytics_user;
    GRANT SELECT ON "store"."stores" TO bot_user, analytics_user;
  `);
}

/** @param {import('pg').Client} client */
async function revert(client) {
  await client.query(`
    DROP TABLE "store"."stores";
    DROP SCHEMA "store";
  `);
}

module.exports = { apply, revert };
