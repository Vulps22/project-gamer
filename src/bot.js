/**
 * This file is the entry point for each individual bot shard.
 * It sets up the client and its event listeners.
 * It relies on the ShardingManager (in main.js/index.js) to spawn it.
 */

require('dotenv').config();
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { config, ConfigOption } = require('./Config.js');

/**
 * Initializes and starts a single shard.
 */
async function startShard() {
    console.log('Shard starting... Attempting to load config.');

    await config.init();
    console.log(`Shard ${process.env.DISCORD_SHARD_ID || 'N/A'}: Config loaded.`);

    // 2. Create a new client instance
    //    Add any intents your bot will actually need. Guilds is the bare minimum.
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            // Add GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent etc.
            // as needed for your commands and features.
        ],
    });

    // --- Example: Your existing ready event ---
    client.once(Events.ClientReady, readyClient => {
        console.log(`Shard ${readyClient.shard.ids.join(', ')} Ready! Logged in as ${readyClient.user.tag}`);
        // You can now safely use config.get() here and in other handlers.
        // For example:
        // const logChannelId = config.get(ConfigOption.DISCORD_LOG_CHANNEL);
        // if(logChannelId) {
        //     const channel = readyClient.channels.cache.get(logChannelId);
        //     if(channel) channel.send(`Shard ${readyClient.shard.ids.join(', ')} is online!`);
        // }
    });

    console.log(`Shard ${process.env.DISCORD_SHARD_ID || 'N/A'}: Setup complete, waiting for ShardingManager connection.`);

}

// --- Start the shard ---
startShard().catch(error => {
    console.error('Shard failed to start:', error);
    process.exit(1);
});