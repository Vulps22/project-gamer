/**
 * Reverts one applied migration, as the rollout user.
 * With no file name, reverts the most recently applied migration.
 *
 * Usage:
 *   node database/scripts/revert.js [<file>.js] --dev | --stage | --prod
 */

const { loadEnv } = require('./lib/env');
loadEnv();

const { connectAsRollout } = require('./lib/connect');
const { loadMigration } = require('./lib/schemaFiles');

async function revert() {
  const target = process.argv.slice(2).find(a => a.endsWith('.js'));
  const client = await connectAsRollout();

  try {
    const { rows } = target
      ? await client.query('SELECT name FROM system.migrations WHERE name = $1', [target])
      : await client.query('SELECT name FROM system.migrations ORDER BY created_at DESC, name DESC LIMIT 1');

    if (rows.length === 0) {
      if (target) throw new Error(`${target} is not in system.migrations`);
      console.log('No applied migrations to revert.');
      return;
    }

    const file = rows[0].name;
    const migration = loadMigration(file);
    const forget = () => client.query('DELETE FROM system.migrations WHERE name = $1', [file]);
    console.log(`Reverting ${file}...`);

    if (migration.skipTransaction) {
      await migration.revert(client);
      await forget();
    } else {
      await client.query('BEGIN');
      try {
        await migration.revert(client);
        await forget();
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    console.log(`✓ Reverted ${file}`);
  } finally {
    await client.end();
  }
}

revert().catch(err => {
  console.error('\n✗ Revert failed:', err.message);
  process.exit(1);
});
