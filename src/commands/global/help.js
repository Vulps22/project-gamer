// src/commands/global/help.js
const { SlashCommandBuilder } = require('discord.js');
const { createHelpMessage } = require('../../messages/helpMessage');
const { config, ConfigOption } = require('../../config');
const { BotInteraction } = require('../../structures');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of all available commands.'),
    administrator: false,
    /**
     * @param {BotInteraction} interaction 
     */
    async execute(interaction) {
        // Get the command list from the client
        const commands = interaction.client.commands;
        
        // Get the server URL from your config service
        const serverUrl = config.get(ConfigOption.DISCORD_SUPPORT_SERVER_URL, 'https://lfgamesync.com');

        // Build the message using your new builder
        const helpMessage = createHelpMessage(commands, serverUrl);

        // Send the reply
        await interaction.reply(helpMessage);
    },
};