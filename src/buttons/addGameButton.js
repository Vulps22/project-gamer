// At the top of your file

const { gameManager } = require('../services/GameManagerService');
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
        const didAdd = gameManager.addGameToUserLibrary(gameId, userId);
        if (didAdd) {
            return interaction.ephemeralReply({ content: 'Game added to your library!', ephemeral: true });
        } else {
            return interaction.ephemeralReply({ content: 'You already have this game in your library.', ephemeral: true });
        }
    },
};