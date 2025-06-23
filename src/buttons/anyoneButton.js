// At the top of your file
const { LFGMessage, getSuccessMessage } = require('../messages/lfgMessage');
const { gameManagerService } = require('../services/gameManagerService');
const { BotButtonInteraction } = require('../structures');

module.exports = {
    id: 'lfg_anyone',
    administrator: false,
    
    /**
     * @param {BotButtonInteraction} interaction 
     */
    async execute(interaction) {
        const gameId = interaction.params.get('id');
        const userId = interaction.user.id;

        const game = await gameManagerService.getGameById(gameId);
        if (!game) {
            return interaction.ephemeralReply({ content: 'Game not found.' });
        }

        const links = await gameManagerService.getStoreUrlsForGame(gameId);
        const message = LFGMessage(game, links, userId, [], true);

        await interaction.channel.send(message);
        await interaction.update(getSuccessMessage());
    },
};