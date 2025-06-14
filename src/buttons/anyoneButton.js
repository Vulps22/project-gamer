// At the top of your file
const { LFGMessage } = require('../messages/lfgMessage');
const { gameManager } = require('../services/GameManagerService');
const { BotButtonInteraction } = require('../structures');
const {ContainerBuilder, TextDisplayBuilder} = require("discord.js");

module.exports = {
    id: 'lfg_anyone',
    administrator: false,
    
    /**
     * @param {BotButtonInteraction} interaction 
     */
    async execute(interaction) {
        console.log("LFG Add Game Button Interaction:", interaction.buttonData, "User ID:", interaction.user.id);
        const gameId = interaction.params.get('id');
        const userId = interaction.user.id;

        const game = await gameManager.getGameById(gameId);
        if (!game) {
            return interaction.ephemeralReply({ content: 'Game not found.' });
        }

        const links = await gameManager.getStoreUrlsForGame(gameId);

        const message = LFGMessage(game, links, userId, [], true);
        await interaction.channel.send(message);

        const containerBuilder = new ContainerBuilder();
        const textBuilder = new TextDisplayBuilder().setContent("## Successfully Submitted LFG.");

        containerBuilder.addTextDisplayComponents(textBuilder);

        await interaction.update({ components: [ containerBuilder ] });
    },
};