// At the top of your file

const { chooseStoresMessage } = require('../messages');
const { gameManagerService } = require('../services');
const { BotButtonInteraction } = require('../structures');

module.exports = {
    id: 'library_removeGame',
    administrator: false,

    /**
     * @param {BotButtonInteraction} interaction
     */
    async execute(interaction) {
        console.log('LFG Remove Game Button Interaction:', interaction.buttonData, 'User ID:', interaction.user.id);
        const gameId = interaction.params.get('id');
        const stores = await gameManagerService.getAllStoresForGame(gameId);
        const message = chooseStoresMessage(stores, true);
        await interaction.ephemeralReply(null, message);
    },
};