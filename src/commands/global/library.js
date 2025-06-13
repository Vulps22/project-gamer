const { SlashCommandBuilder, SlashCommandStringOption, MessageFlags, SlashCommandSubcommandBuilder } = require('discord.js');
const { gameManager } = require('../../services');
const { chooseStoresMessage } = require('../../messages');
const { BotInteraction } = require('../../structures/botInteraction');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('library')
        .setDescription('Manage your game library')
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('add')
            .setDescription('Add a game to your library')
            .addStringOption(new SlashCommandStringOption()
                .setName('game')
                .setDescription('The game you want to play')
                .setRequired(true)
                .setAutocomplete(true)
            )
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
    /**
     * 
     * @param {BotInteraction} interaction 
     */
    async execute(interaction) {
        
        //get a list of the stores this game is available on
        const gameId = interaction.options.getString('game');
        const stores = await gameManager.getStoresForGame(gameId, interaction.user.id);

        const storesMessage = chooseStoresMessage(stores);

        await interaction.ephemeralReply(null, storesMessage);
    },
};