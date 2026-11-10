/**
 * Applies pending migrations in file-name order, as the rollout user.
 *
 * Each migration file exports:
 *   apply(client)  forward migration
 *   revert(client) undo
 * and optionally:
 *   requiresSuperUser = '<reason>'  skipped (left pending, reason printed) unless --force-skipped
 *   skipTransaction = true          apply() runs outside BEGIN/COMMIT; no automatic rollback
 *
 * Usage:
 *   node database/scripts/migrate.js --dev | --stage | --prod [--force-skipped]
 */

const { loadEnv } = require('./lib/env');
const envFlag = loadEnv();

const { connectAsRollout } = require('./lib/connect');
const { migrationFiles, loadMigration } = require('./lib/schemaFiles');
const { ensureTracking } = require('./lib/tracking');

function validate(file, migration) {
  if (typeof migration.apply !== 'function') throw new Error(`${file} has no apply()`);
  if (typeof migration.revert !== 'function') throw new Error(`${file} has no revert()`);
}

async function migrate() {
  const forceSkipped = process.argv.includes('--force-skipped');
  const client = await connectAsRollout();

  try {
    await ensureTracking(client);

    const { rows } = await client.query('SELECT name FROM system.migrations');
    const applied = new Set(rows.map(r => r.name));
    const pending = (await migrationFiles()).filter(f => !applied.has(f));

    if (pending.length === 0) {
      console.log('Nothing to migrate: the database is up to date.');
      return;
    }

    // Check every pending file before applying any, so a broken file stops the run up front.
    const migrations = pending.map(file => {
      const migration = loadMigration(file);
      validate(file, migration);
      return { file, migration };
    });

    console.log(`${pending.length} pending migration(s):`);
    pending.forEach(f => console.log(`  - ${f}`));
    console.log('');

    const skipped = [];
    for (const { file, migration } of migrations) {
      if (migration.requiresSuperUser !== undefined && !forceSkipped) {
        skipped.push({ file, reason: migration.requiresSuperUser });
        continue;
      }

      const record = () => client.query('INSERT INTO system.migrations (name) VALUES ($1)', [file]);
      process.stdout.write(`Applying ${file}... `);

      if (migration.skipTransaction) {
        try {
          await migration.apply(client);
          await record();
          console.log('✓ (outside a transaction)');
        } catch (err) {
          console.log('✗');
          console.error(`\nThis migration ran outside a transaction, so statements that succeeded were NOT rolled back.`);
          console.error(`Inspect the database, then: node database/scripts/revert.js ${file} ${envFlag || '<--dev|--stage|--prod>'}`);
          throw err;
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await migration.apply(client);
        await record();
        await client.query('COMMIT');
        console.log('✓');
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('✗');
        throw err;
      }
    }

    for (const { file, reason } of skipped) {
      console.log(`Skipped ${file}: ${reason}`);
    }
    if (skipped.length) console.log('Re-run with --force-skipped once the above steps are done.');

    console.log(skipped.length === migrations.length ? '\n⚠️  No migrations applied: all were skipped.' : '\n✓ Migration complete');
  } finally {
    await client.end();
  }
}

migrate().catch(err => {
  console.error('\n✗ Migration failed:', err.message);
  process.exit(1);
});
