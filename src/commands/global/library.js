const { SlashCommandBuilder, SlashCommandStringOption, MessageFlags, SlashCommandSubcommandBuilder } = require('discord.js');
const { gameManager } = require('../../services');
const { chooseStoresMessage, GlobalMessages } = require('../../messages');
const { BotInteraction } = require('../../structures');

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
        )
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('remove')
            .setDescription('Remove a game from your library')
            .addStringOption(new SlashCommandStringOption()
                .setName('game')
                .setDescription('The game you want to remove')
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

        //console.log('Autocomplete games:', games);

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
        const game = interaction.options.getString('game');
        const isDeleting = interaction.options.getSubcommand() === 'remove';
        let stores = stores = await gameManager.getStoresForGame(game, interaction.user.id);

        if (isDeleting) {
            stores = [];
            stores = await gameManager.getAllStoresForGame(game);
        }

        const storesMessage = chooseStoresMessage(stores, isDeleting)

        await interaction.ephemeralReply(null, storesMessage);
    },
};