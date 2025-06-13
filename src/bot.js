const { Client, GatewayIntentBits, BaseInteraction, MessageFlags } = require('discord.js');
const serverManagerServiceInstance = require('./services/ServerManagerService.js');
const userManagerServiceInstance = require('./services/UserManagerService.js');
const storeManagerInstance = require('./services/StoreManagerService.js');
const { gameManager } = require('./services/GameManagerService.js');
const { setClient } = require('./provider/clientProvider.js');
const { config, ConfigOption } = require('./config.js');
const path = require('path');
const fs = require('fs');


/**
 * Initializes and starts a single shard.
 */
async function startShard() {
    console.log('Shard starting... Attempting to load config.');

    await config.init();
    await storeManagerInstance.init();
    await gameManager.init();
    await userManagerServiceInstance.init();
    await serverManagerServiceInstance.init();
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
    //await loadCommands(client, 'mod');
    await loadSelectMenus(client);
    await loadbuttons(client);
    //await patchInteraction();

    client.login(config.get(ConfigOption.DISCORD_BOT_TOKEN));

}

// --- Start the shard ---
startShard().catch(error => {
    console.error('Shard failed to start:', error);
    process.exit(1);
});

function loadEvents(client) {
    const eventsPath = path.join(__dirname, 'events');
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
    const commandsPath = path.join(__dirname, `commands/${type}`);
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

function loadSelectMenus(client) {
    const selectMenusPath = path.join(__dirname, 'selectMenus');
    const selectMenuFiles = fs.readdirSync(selectMenusPath).filter(file => file.endsWith('.js'));

    client.selectMenus = client.selectMenus || new Map();

    selectMenuFiles.forEach(file => {
        const filePath = path.join(selectMenusPath, file);
        const selectMenu = require(filePath);
        if (selectMenu.data && selectMenu.execute)
            client.selectMenus.set(selectMenu.data.id, selectMenu);
        else
            console.warn(`[WARNING] The select menu at ${filePath} is missing a required 'data' or 'execute' property`);
    });
}

function loadbuttons(client) {
    const buttonsPath = path.join(__dirname, 'buttons');
    const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));

    client.buttons = client.buttons || new Map();

    buttonFiles.forEach(file => {
        const filePath = path.join(buttonsPath, file);
        const button = require(filePath);
        if (button.id && button.execute)
            client.buttons.set(button.id, button);
        else
            console.warn(`[WARNING] The Button at ${filePath} is missing a required 'id' or 'execute' property`);
    });
}

async function patchInteraction() {
    // Patch the interaction prototype to include a custom method

    /**
     * @deprecated Use BotInteraction instead
     * @param {*} content 
     * @param {*} options 
     * @returns 
     */
    BaseInteraction.prototype.ephemeralReply = async function (content, options = {}) {
        const existingFlags = options.flags || 0;

        // This combines the flags without overriding any existing ones.
        const combinedFlags = existingFlags | MessageFlags.Ephemeral;

        const finalOptions = {
            ...options, // Keep all other options (embeds, components, etc.)
            flags: combinedFlags, // Use our newly combined flags
        };

        return this.sendReply(
            content,
            finalOptions
        );
    };

    /**
     * @deprecated Use BotInteraction instead
     * @param {*} content 
     * @param {*} options 
     * @returns 
     */
    BaseInteraction.prototype.sendReply = async function (content, options = {}) {

        if (typeof content === 'string' && content.length > 0) {
            options.content = content;
        }

        if (this.deferred || this.replied) {
            return this.editReply(options);
        } else {
            return this.reply(options);
        }

    };
}