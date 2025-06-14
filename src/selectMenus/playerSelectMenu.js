// At the top of your file
const { StringSelectMenuInteraction, TextDisplayBuilder, ContainerBuilder} = require('discord.js');
const { gameManager } = require('../services/GameManagerService');
const { LFGMessage, getSuccessMessage } = require('../messages/lfgMessage');

module.exports = {
    data: {
        id: 'lfg_playerSelect',
        administrator: false,
    },

    /**
     * @param {StringSelectMenuInteraction} interaction 
     */
    async execute(interaction) {
        const selectedPlayers = interaction.values;

        if (selectedPlayers[0] === 'none') {
            return;
        }

        const [gameId, _] = selectedPlayers[0].split('_');

        // 3. Get the userIds from ALL elements using .map()
        const userIds = selectedPlayers.map(value => {
            // For each value (e.g., '3_914368203482890240'), split it...
            const parts = value.split('_');
            // ...and return the second part (the user ID).
            return parts[1];
        });

        const game = await gameManager.getGameById(gameId);

        if (!game) {
            return interaction.ephemeralReply('Game not found.');
        }

        const links = await gameManager.getStoreUrlsForGame(gameId);
        const lfgMessage = LFGMessage(game, links, interaction.user.id, userIds);

        await interaction.channel.send(lfgMessage);
        await interaction.update(getSuccessMessage());
    },
};