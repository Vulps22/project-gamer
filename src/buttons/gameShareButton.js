const { gameInformationMessage } = require('../messages');
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

        // Create a non-ephemeral version of the game information message
        const message = await gameInformationMessage(interaction.guild.id, gameId, false);

        // Reply publicly to the channel
        await interaction.reply(message);
    },
};
