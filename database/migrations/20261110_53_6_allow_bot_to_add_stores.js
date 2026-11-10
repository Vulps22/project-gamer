/**
 * Approving a game from a store PG doesn't know yet creates that store, so the bot needs to add stores.
 * It still can't change or delete them.
 * @param {import('pg').Client} client
 */
async function apply(client) {
  await client.query(`
    GRANT INSERT ON "store"."stores" TO bot_user;
    COMMENT ON TABLE "store"."stores" IS 'Known game stores. Seeded by the rollout; the bot adds new ones when an admin approves a game from an unknown store';
  `);
}

/** @param {import('pg').Client} client */
async function revert(client) {
  await client.query(`
    REVOKE INSERT ON "store"."stores" FROM bot_user;
    COMMENT ON TABLE "store"."stores" IS 'Known game stores. Seed data written by the rollout, never by users.';
  `);
}

module.exports = { apply, revert };
