/**
 * This file is the entry point for each individual bot shard.
 * It sets up the client and its event listeners.
 * It relies on the ShardingManager (in main.js/index.js) to spawn it.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');
const { config, ConfigOption } = require('./config.js');
const { setClient } = require('./provider/clientProvider.js');

/**
 * Initializes and starts a single shard.
 */
async function startShard() {
    console.log('Shard starting... Attempting to load config.');

    await config.init();
    console.log(`Shard ${process.env.DISCORD_SHARD_ID || 'N/A'}: Config loaded.`, config.getAll());

    // 2. Create a new client instance
    //    Add any intents your bot will actually need. Guilds is the bare minimum.
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            // Add GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent etc.
            // as needed for your commands and features.
        ],
    });

    setClient(client);

    await loadEvents(client);

    await loadCommands(client, 'global');
    await loadCommands(client, 'mod');

    client.login(config.get(ConfigOption.DISCORD_BOT_TOKEN));

}

// --- Start the shard ---
startShard().catch(error => {
    console.error('Shard failed to start:', error);
    process.exit(1);
});

function loadEvents(client) {
    const eventsPath = path.join(__dirname, 'event');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    eventFiles.forEach(file => {

        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once)
            client.once(event.name, (...args) => event.execute(...args));
        else
            client.on(event.name, (...args) => event.execute(...args));
    });
}

function loadCommands(client, type) {
    const commandsPath = path.join(__dirname, `command/${type}`);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    client.commands = client.commands || new Map();

    commandFiles.forEach(file => {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if (command.data && command.execute)
            client.commands.set(command.data.name, command);
        else
            console.warn(`[WARNING] The command at ${filePath} is missing a required 'data' or 'execute' property`);

    });
}