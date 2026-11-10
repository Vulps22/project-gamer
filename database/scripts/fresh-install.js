/**
 * Rebuilds the database from database/schemas/, with no migration history needed,
 * then records every migration file as applied. Runs as the rollout user.
 *
 * Drops PG's schemas first, then creates them again in dependency order.
 *
 * Usage:
 *   node database/scripts/fresh-install.js --dev | --stage | --prod
 */

const { loadEnv } = require('./lib/env');
loadEnv();

const path = require('path');
const { connectAsRollout } = require('./lib/connect');
const { SCHEMAS, SCHEMAS_DIR, schemaFiles, migrationFiles } = require('./lib/schemaFiles');
const { runFile } = require('./lib/sql');

async function freshInstall() {
  const client = await connectAsRollout();

  try {
    console.log('Dropping schemas...');
    for (const schema of [...SCHEMAS].reverse()) {
      await client.query(`DROP SCHEMA IF EXISTS ${client.escapeIdentifier(schema)} CASCADE`);
    }

    for (const schema of SCHEMAS) {
      await client.query(`CREATE SCHEMA ${client.escapeIdentifier(schema)}`);
      for (const file of await schemaFiles(schema)) {
        process.stdout.write(`${path.relative(SCHEMAS_DIR, file)}... `);
        await runFile(client, file);
        console.log('✓');
      }
    }

    for (const file of await migrationFiles()) {
      await client.query('INSERT INTO system.migrations (name) VALUES ($1)', [file]);
    }

    console.log('\n✓ Fresh install complete');
  } finally {
    await client.end();
  }
}

freshInstall().catch(err => {
  console.error('\n✗ Fresh install failed:', err.message);
  process.exit(1);
});
