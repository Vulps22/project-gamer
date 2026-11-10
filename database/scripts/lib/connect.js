const { Client } = require('pg');
const { requireEnv } = require('./env');

/** Connects as the rollout user (awesome_vd_user), which owns every schema. */
async function connectAsRollout() {
  const client = new Client({
    host: requireEnv('DB_HOST'),
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: requireEnv('DB_ROLLOUT_USER'),
    password: requireEnv('DB_ROLLOUT_PASSWORD'),
    database: requireEnv('DB_NAME'),
  });
  await client.connect();
  return client;
}

module.exports = { connectAsRollout };
