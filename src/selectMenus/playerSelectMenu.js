// At the top of your file
const { StringSelectMenuInteraction, TextDisplayBuilder, ContainerBuilder} = require('discord.js');
const { gameManager } = require('../services/GameManagerService');
const { LFGMessage } = require('../messages/lfgMessage');

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

        console.log('Selected players:', selectedPlayers);

        const [gameId, _] = selectedPlayers[0].split('_');

        // 3. Get the userIds from ALL elements using .map()
        const userIds = selectedPlayers.map(value => {
            // For each value (e.g., '3_914368203482890240'), split it...
            const parts = value.split('_');
            // ...and return the second part (the user ID).
            return parts[1];
        });

        console.log('User IDs:', userIds);

        const game = await gameManager.getGameById(gameId);
        if (!game) {
            return interaction.ephemeralReply('Game not found.');
        }

        console.log('Game found:', game);

        const links = await gameManager.getStoreUrlsForGame(gameId);
        console.log('Store links:', links);
        const lfgMessage = LFGMessage(game, links, interaction.user.id, userIds);

        console.log('LFG message:', lfgMessage);

        console.log(interaction)

        // 5. Send the final, detailed reply.
        await interaction.channel.send(lfgMessage);

        const containerBuilder = new ContainerBuilder();
        const textBuilder = new TextDisplayBuilder().setContent("## Successfully Submitted LFG.");

        containerBuilder.addTextDisplayComponents(textBuilder);

        await interaction.update({ components: [ containerBuilder ] });
    },
};