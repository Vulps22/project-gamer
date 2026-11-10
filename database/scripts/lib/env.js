const fs = require('fs');
const path = require('path');

const ENV_FILES = {
  '--dev':   '.env.development',
  '--stage': '.env.staging',
  '--prod':  '.env.production',
};

/**
 * Loads the env file chosen by --dev / --stage / --prod into process.env.
 * Variables already set in the environment win. With no flag, or no file
 * (the VPS and CI supply variables directly), the ambient environment is used.
 *
 * @returns {string | undefined} the flag that was passed
 */
function loadEnv(argv = process.argv) {
  const flag = argv.find(a => ENV_FILES[a]);
  if (!flag) return undefined;

  const envPath = path.resolve(__dirname, '../../..', ENV_FILES[flag]);
  if (!fs.existsSync(envPath)) {
    console.warn(`[env] ${ENV_FILES[flag]} not found, using the ambient environment`);
    return flag;
  }

  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = value;
  }

  console.log(`[env] Loaded ${ENV_FILES[flag]}`);
  return flag;
}

/** Reads a required variable, naming it (never its value) when missing. */
function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

module.exports = { loadEnv, requireEnv };
