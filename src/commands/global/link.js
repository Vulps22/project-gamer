const { SlashCommandBuilder, SlashCommandStringOption, MessageFlags } = require('discord.js');
const { steamManagerService } = require('../../services');
const { BotInteraction } = require('../../structures');
const { steamLinkMessage } = require('../../messages');



module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your Steam account to automatically Sync your games'),
    administrator: false,
    /**
     *
     * @param {BotInteraction} interaction
     * @returns
     */
    async execute(interaction) {

        const userId = interaction.user.id;
        const sessionURL = await steamManagerService.getSessionURL(userId);

        const message = steamLinkMessage(sessionURL);

        console.log(message);

        interaction.ephemeralReply(null, message)

    },
};