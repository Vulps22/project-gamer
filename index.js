// Core Node/External Libs
const { ShardingManager } = require('discord.js');
const { AutoPoster } = require('topgg-autoposter');
const axios = require('axios');
const retry = require('async-retry');

// Your Custom Libs
const { config, ConfigOption } = require('./src/config.js');

// --- Main Application Logic ---

/**
 * Main function to initialize and start the bot.
 */
async function main() {
    console.log('Starting Sharding Manager...');

    // 1. Load configuration from DB (MUST be first after imports/dotenv)
    await config.init();
    console.log('Configuration loaded.');

    // 2. Get necessary config values
    const token = config.get(ConfigOption.DISCORD_BOT_TOKEN);
    const environment = config.get(ConfigOption.ENVIRONMENT, 'dev');

    if (!token) {
        console.error('FATAL ERROR: Discord token not found in configuration.');
        process.exit(1);
    }

    // 3. Initialize the Sharding Manager
    const manager = new ShardingManager('./src/bot.js', {
        token: token,
        totalShards: environment === 'dev' ? 1 : 'auto',
    });

    manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

    // 4. Spawn shards
    await manager.spawn();
    console.log('All shards launched.');

    // 5. Setup auxiliary services (pass manager/config if needed,
    //    but preferably they should import config themselves)
    setupVoteServer();
    scheduleDailyCleanup();
    syncGG(manager);
    scheduleTopGGUpdate(manager);
    uptimeKuma();
}

// --- Auxiliary Functions ---

/**
 * Pings Uptime Kuma for monitoring.
 */
async function uptimeKuma() {
    const uptimeUrl = config.get(ConfigOption.UPTIME_KUMA_URL);

    if (!uptimeUrl) {
        console.log('UptimeKuma Pinging Disabled (URL not configured).');
        return;
    }

    console.log(`Setting up UptimeKuma ping for: ${uptimeUrl}`);

    setInterval(async () => {
        try {
            await retry(async () => {
                await axios.get(uptimeUrl);
            }, {
                retries: 3,
                minTimeout: 1000,
            });
            console.log('UptimeKuma Ping succeeded');
        } catch (error) {
            console.error('UptimeKuma Ping failed after retries:', error.message);
        }
    }, 60000);
}

/**
 * Sets up automatic posting to Top.gg.
 * @param {ShardingManager} manager
 */
function syncGG(manager) {
    const topGgToken = config.get(ConfigOption.TOP_GG_TOKEN);

    if (!topGgToken) {
        console.log('Top.gg AutoPoster Disabled (Token not configured).');
        return;
    }

    console.log('Setting up Top.gg AutoPoster...');
    try {
        const poster = AutoPoster(topGgToken, manager);

        poster.on('posted', (stats) => {
            console.log(`Posted stats to Top.gg | ${stats.serverCount} servers`);
        });

        poster.on('error', (err) => {
            console.error('Top.gg AutoPoster Error:', err);
        });

    } catch (error) {
        console.error('Failed to initialize Top.gg AutoPoster:', error);
    }
}

/** Placeholder: Sets up a server for handling vote webhooks. */
function setupVoteServer() {
    console.log('Setup Vote Server (Placeholder - Needs Implementation)');
    // This function would now import 'config' if it needs settings.
}

/** Placeholder: Schedules a daily cleanup task. */
function scheduleDailyCleanup() {
    console.log('Schedule Daily Cleanup (Placeholder - Needs Implementation)');
    // This function would now import 'config' if it needs settings.
}

/** Placeholder: Schedules a top.gg update (if AutoPoster isn't used). */
function scheduleTopGGUpdate() {
    console.log('Schedule Top.gg Update (Placeholder - Handled by AutoPoster for now)');
    // This function would now import 'config' if it needs settings.
}


// --- Start the application ---
main().catch(error => {
    console.error('Failed to start the shard manager:', error);
    process.exit(1);
});