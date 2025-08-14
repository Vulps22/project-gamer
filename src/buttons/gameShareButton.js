const { gameInformationMessage } = require('../messages');
const { gameManagerService } = require('../services');
const { BotButtonInteraction } = require('../structures');

module.exports = {
    id: 'library_gameShare',
    administrator: false,

    /**
     * @param {BotButtonInteraction} interaction The button interaction
     */
    async execute(interaction) {
        console.log('Game Share Button Interaction:', interaction.buttonData, 'User ID:', interaction.user.id);
        const gameId = interaction.params.get('id');

        // Fetch all required data
        const gameData = await gameManagerService.getGameById(gameId);
        const stores = await gameManagerService.getAllStoresForGame(gameId);
        const communityAmount = await gameManagerService.getUserAmountWithGameInServer(interaction.guild.id, gameId);
        const overAllAmount = await gameManagerService.getUserAmountWithGame(gameId);

        const stats = {
            communityCount: communityAmount.user_count,
            globalCount: overAllAmount.user_count
        };

        // Create a non-ephemeral version of the game information message
        const message = gameInformationMessage(gameData, stores, stats, false);

        // Reply publicly to the channel
        await interaction.reply(message);
    },
};
