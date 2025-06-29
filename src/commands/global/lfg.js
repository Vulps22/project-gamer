const { SlashCommandBuilder, SlashCommandStringOption, MessageFlags } = require('discord.js');
const { gameManagerService} = require('../../services');
const { choosePlayersMessage } = require('../../messages');
const { BotInteraction } = require('../../structures');


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
        const games = await gameManagerService.searchGamesByName(name);

        //console.log('Autocomplete games:', games);

        if (!games || games.length === 0) {
            return interaction.respond([{ name: 'No games found', value: 'none' }]);
        }

        interaction.respond(games.map(game => ({ name: game.name, value: String(game.id) })));

    },
    /**
     *
     * @param {BotInteraction} interaction
     * @returns
     */
    async execute(interaction) {

        const gameId = interaction.options.getString('game');
        const userId = interaction.user.id;

        const game = await gameManagerService.getGameById(gameId);

        console.log('LFG Game found:', game);

        if (!game) {
            return interaction.ephemeralReply({ content: 'Game not found.'});
        }

        const message = choosePlayersMessage(game.name, await gameManagerService.getUsersForGame(gameId, interaction.guildId), gameId);

        //const message = await LFGMessage(gameId, [], userId, [userId]);

        interaction.ephemeralReply(null, message);

    },
};