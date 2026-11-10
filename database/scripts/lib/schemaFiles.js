const fs = require('fs').promises;
const path = require('path');

const SCHEMAS_DIR = path.join(__dirname, '../../schemas');
const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

/** Every schema, in dependency order: a schema only references schemas before it. */
const SCHEMAS = ['system', 'store', 'games', 'users', 'servers', 'lfg', 'analytics'];

/** Object kinds in a schema folder, in the order they are created. */
const KINDS = ['functions', 'tables', 'views'];

/** A schema's source files, in creation order: functions, then tables, then views. */
async function schemaFiles(schema) {
  const files = [];
  for (const kind of KINDS) {
    const dir = path.join(SCHEMAS_DIR, schema, kind);
    let names;
    try {
      names = await fs.readdir(dir);
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }
    for (const name of names.filter(n => n.endsWith('.sql')).sort()) {
      files.push(path.join(dir, name));
    }
  }
  return files;
}

/** Every migration file name, in apply order. */
async function migrationFiles() {
  return (await fs.readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.js')).sort();
}

function loadMigration(file) {
  return require(path.join(MIGRATIONS_DIR, file));
}

module.exports = { SCHEMAS, SCHEMAS_DIR, MIGRATIONS_DIR, schemaFiles, migrationFiles, loadMigration };
