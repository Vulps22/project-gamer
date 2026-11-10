const fs = require('fs').promises;

/**
 * Splits SQL into statements on top-level semicolons, skipping those inside
 * quotes, dollar-quoted bodies and comments. Each statement then runs (and,
 * outside a transaction, commits) on its own, which TimescaleDB needs between
 * creating a continuous aggregate and adding its refresh policy.
 */
function splitStatements(sql) {
  const statements = [];
  let start = 0;
  let i = 0;

  while (i < sql.length) {
    const rest = sql.slice(i);
    if (rest.startsWith('--')) {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? sql.length : end + 1;
    } else if (rest.startsWith('/*')) {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
    } else if (sql[i] === "'" || sql[i] === '"') {
      const quote = sql[i];
      i++;
      while (i < sql.length) {
        if (sql[i] === quote && sql[i + 1] === quote) i += 2;
        else if (sql[i] === quote) { i++; break; }
        else i++;
      }
    } else if (sql[i] === '$') {
      const tag = rest.match(/^\$[A-Za-z_]*\$/);
      if (tag) {
        const end = sql.indexOf(tag[0], i + tag[0].length);
        i = end === -1 ? sql.length : end + tag[0].length;
      } else {
        i++;
      }
    } else if (sql[i] === ';') {
      statements.push(sql.slice(start, i + 1));
      start = ++i;
    } else {
      i++;
    }
  }
  statements.push(sql.slice(start));

  return statements.filter(s => s.replace(/--.*$/gm, '').trim().length > 0).map(s => s.trim());
}

/** Runs every statement in a schema file, one at a time. */
async function runFile(client, filePath) {
  for (const statement of splitStatements(await fs.readFile(filePath, 'utf8'))) {
    await client.query(statement);
  }
}

module.exports = { splitStatements, runFile };
