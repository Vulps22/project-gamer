const { SlashCommandBuilder, SlashCommandStringOption, MessageFlags } = require('discord.js');
const { gameManager} = require('../../services/GameManagerService');
const { LFGMessage } = require('../../messages/lfgMessage');
const { choosePlayersMessage } = require('../../messages/choosePlayersMessage');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('lfg')
        .setDescription('Find users to play games with')
        .addStringOption(new SlashCommandStringOption()
            .setName('game')
            .setDescription('The game you want to play')
            .setRequired(true)
            .setAutocomplete(true)
        ),
    administrator: false,
    /**
	 * Handles autocomplete for game search.
	 * Fetches games from the database based on user input.
	 * @param {AutocompleteInteraction} interaction
	 */
    async autoComplete(interaction) {
        const name = interaction.options.getFocused();
        const games = await gameManager.searchGamesByName(name);

        console.log('Autocomplete games:', games);

        if (!games || games.length === 0) {
            return interaction.respond([{ name: 'No games found', value: 'none' }]);
        }

        interaction.respond(games.map(game => ({ name: game.name, value: String(game.id) })));
        
    },
    async execute(interaction) {
        interaction.reply({
            content: 'This command is not yet implemented. Please check back later!',
            flags: MessageFlags.Ephemeral
        });
    },
};