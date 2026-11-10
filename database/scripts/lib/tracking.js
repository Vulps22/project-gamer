const path = require('path');
const { SCHEMAS_DIR } = require('./schemaFiles');
const { runFile } = require('./sql');

/**
 * Creates the system schema and system.migrations from their schema files if this
 * database doesn't have them yet, so the first migrate can record what it applies.
 */
async function ensureTracking(client) {
  const { rows } = await client.query(`SELECT to_regclass('system.migrations') AS "table"`);
  if (rows[0].table) return;

  console.log('Creating system.migrations...');
  await client.query('CREATE SCHEMA IF NOT EXISTS "system"');
  await runFile(client, path.join(SCHEMAS_DIR, 'system/functions/set_updated_at.sql'));
  await runFile(client, path.join(SCHEMAS_DIR, 'system/tables/migrations.sql'));
}

module.exports = { ensureTracking };
