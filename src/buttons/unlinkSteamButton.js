// At the top of your file
const { LFGMessage, getSuccessMessage } = require('../messages/lfgMessage');
const { steamUnlinkedConfirmationMessage } = require('../messages/steamAlreadyLinkedMessage');
const { userManagerService } = require('../services');
const { gameManager } = require('../services/gameManagerService');
const { BotButtonInteraction } = require('../structures');

module.exports = {
    id: 'steam_unlink',
    administrator: false,

    /**
     * @param {BotButtonInteraction} interaction
     */
    async execute(interaction) {
        const userId = interaction.user.id;

        await userManagerService.linkSteamAccount(userId, null);
        interaction.update(steamUnlinkedConfirmationMessage());
    },
};