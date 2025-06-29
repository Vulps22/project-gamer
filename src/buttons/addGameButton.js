// At the top of your file

const { chooseStoresMessage } = require('../messages');
const { gameManagerService } = require('../services');
const { BotButtonInteraction } = require('../structures');

module.exports = {
    id: 'lfg_addGame',
    administrator: false,
    
    /**
     * @param {BotButtonInteraction} interaction 
     */
    async execute(interaction) {
        console.log("LFG Add Game Button Interaction:", interaction.buttonData, "User ID:", interaction.user.id);
        const gameId = interaction.params.get('id');
        const userId = interaction.user.id;
        const stores = await gameManagerService.getStoresForGame(gameId, userId);
        const message = chooseStoresMessage(stores)
        await interaction.ephemeralReply(null, message);

    },
};