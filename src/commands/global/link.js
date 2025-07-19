const { SlashCommandBuilder, SlashCommandStringOption, MessageFlags } = require('discord.js');
const { steamManagerService, userManagerService } = require('../../services');
const { BotInteraction } = require('../../structures');
const { steamLinkMessage } = require('../../messages');
const { steamAlreadyLinkedMessage } = require('../../messages/steamAlreadyLinkedMessage');


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
        const user = await userManagerService.getUserById(userId);

        console.log(user);

        if (user.steamId) {
            // send a message that the user already has a linked steam account
            const message = steamAlreadyLinkedMessage();
            interaction.ephemeralReply(null, message);
            return;
        }

        const sessionURL = await steamManagerService.getSessionURL(userId);

        const message = steamLinkMessage(sessionURL);

        console.log(message);

        interaction.ephemeralReply(null, message);

    },
};