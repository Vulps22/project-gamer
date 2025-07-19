// Core Node/External Libs
const { ShardingManager } = require('discord.js');
const { AutoPoster } = require('topgg-autoposter');
const axios = require('axios');
const retry = require('async-retry');
const express = require('express'); // NEW: Import Express.js
const path = require('path'); // Import path module
const fs = require('fs/promises'); // Import fs/promises for async file operations

// Your Custom Libs
const { config, ConfigOption } = require('./src/config.js');
const { db, logger } = require('./src/lib'); // NEW: Import db and logger
const { userManagerService, steamManagerService } = require('./src/services'); // NEW: Import SteamManagerService and UserManagerService

// --- Main Application Logic ---

/**
 * Main function to initialize and start the bot.
 */
async function main() {
    console.log('Starting Sharding Manager and Web Server...');

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

    // NEW: 3. Start the web server BEFORE spawning shards
    // The web server needs to be available globally to receive callbacks.
    await startWebServer();
    console.log('Web server started.');

    // 4. Initialize the Sharding Manager
    const manager = new ShardingManager('./src/bot.js', {
        token: token,
        totalShards: environment === 'dev' ? 1 : 'auto',
    });

    manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

    // 5. Spawn shards
    await manager.spawn();
    console.log('All shards launched.');

    // 6. Setup auxiliary services (pass manager/config if needed,
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

/**
 * Starts the Express web server to handle Steam OpenID callbacks.
 */
async function startWebServer() {
    const app = express();
    const port = config.get(ConfigOption.WEB_SERVER_PORT, 3001);

    // NEW: Load the HTML template once at startup
    try {
        const templateSuccessPath = path.join(__dirname, 'src', 'views', 'steam_callback_success.html');
        const templateFailPath = path.join(__dirname, 'src', 'views', 'steam_callback_fail.html');

        console.log('Loading Steam callback HTML templates.');
        const steamsuccess = await fs.readFile(templateSuccessPath, 'utf8');
        const steamFail = await fs.readFile(templateFailPath, 'utf8');
        console.log('Steam callback HTML templates loaded successfully.');
    } catch (error) {
        console.error('FATAL ERROR: Could not load Steam callback HTML template:', error);
        process.exit(1); // Cannot proceed without the template
    }

    // Middleware to parse query parameters (Express does this by default for GET requests)
    app.use(express.urlencoded({ extended: true }));

    app.get('/', (req, res) => {
        res.send('Welcome to the Steam Link Service! This is a dev endpoint.');
    });

    // Define the Steam OpenID callback route
    app.get('/auth/steam/callback', async (req, res) => {
        const { 'openid.claimed_id': steamIdUrl, state } = req.query;
        console.log(`Steam callback received: steamIdUrl=${steamIdUrl}, state=${state}`);

        if (!steamIdUrl || !state) {
            logger.error('Missing Steam ID or state in callback.');
            const errorMessage = 'Missing parameters. Please try linking your Steam account again from Discord.';
            return res.status(400).send(
                steamFail
                    .replace('{{MESSAGE}}', errorMessage)
            );
        }

        try {
            // Extract the 64-bit Steam ID from the claimed_id URL
            const steamIdMatch = steamIdUrl.match(/steamcommunity\.com\/openid\/id\/(\d+)/);
            if (!steamIdMatch || !steamIdMatch[1]) {
                logger.error(`Invalid Steam ID URL format: ${steamIdUrl}`);
                const errorMessage = 'Invalid Steam ID format received. Please try again.';
                return res.status(400).send(
                    steamFail
                        .replace('{{MESSAGE}}', errorMessage)
                );
            }
            const steamId = steamIdMatch[1];

            // Validate the state token using the SteamManagerService
            const session = await steamManagerService.validateSession(state);

            if (!session) {
                // validateSession returns null if invalid or expired, and handles its own logging
                const errorMessage = 'Your linking session was invalid or expired. Please initiate the linking process again from Discord.';
                return res.status(400).send(
                    steamFail
                        .replace('{{MESSAGE}}', errorMessage)
                );
            }

            const { userId } = session; // Destructure userId from the returned session object

            // At this point, the token is valid and not expired.
            // Link the Steam ID to the Discord user in your 'user' table.
            await userManagerService.linkSteamAccount(userId, steamId);

            // Clean up the used session token (SteamManagerService handles its own expiration cleanup,
            // but we explicitly delete after successful use to prevent replay attacks).
            steamManagerService.burnSession(state);

            logger.log(`Successfully linked Steam ID ${steamId} to Discord user ${userId}.`);
            const successMessage = 'Your Steam account has been successfully linked to your Discord profile. You may now return to the bot and use `/sync` to synchronize your game library.';
            res.status(200).send(
                steamsuccess
                    .replace('{{MESSAGE}}', successMessage)
            );

        } catch (error) {
            logger.error(`Error processing Steam callback: ${error.message}`);
            console.error('Steam callback processing error:', error);
            const errorMessage = 'An internal error occurred during authentication. Please try again later.';
            res.status(500).send(
                steamFail
                    .replace('{{MESSAGE}}', errorMessage)
            );
        }
    });

    return new Promise((resolve, reject) => {
        app.listen(port, () => {
            console.log(`Web server listening on port ${port}`);
            resolve();
        }).on('error', (err) => {
            console.error(`Failed to start web server on port ${port}:`, err);
            reject(err);
        });
    });
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
    console.error('Failed to start the application:', error);
    process.exit(1);
});
