const { SlashCommandBuilder, SlashCommandStringOption, MessageFlags, SlashCommandSubcommandBuilder } = require('discord.js');
const { gameManagerService } = require('../../services');
const { chooseStoresMessage, GlobalMessages } = require('../../messages');
const { BotInteraction } = require('../../structures');
const { AutocompleteInteraction } = require('discord.js');

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
        )
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('view')
            .setDescription('View your library in the autocomplete')
            .addStringOption(new SlashCommandStringOption()
                .setName('game')
                .setDescription('The game you want to view')
                .setRequired(false)
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

        let games = [];

        if (interaction.options.getSubcommand() === 'remove' || interaction.options.getSubcommand() === 'view') {
            games = await gameManagerService.searchUserGamesByName(name, interaction.user.id);
        } else {
            games = await gameManagerService.searchGamesByName(name);
        }

        console.log('Autocomplete games:', games);

        if (!games || games.length === 0) {
            return interaction.respond([{ name: 'No games found', value: 'none' }]);
        }

        const choices = games.map(game => ({ name: game.name, value: String(game.id) }));
        console.log('Autocomplete choices:', choices);

        interaction.respond(choices);

    },

    /**
     *
     * @param {BotInteraction} interaction
     */
    async execute(interaction) {

        if (interaction.options.getSubcommand() === 'view') {
            return interaction.ephemeralReply("Hello! We plan to flesh this out in the future,"
                + " but felt it was important to give everyone a way to see which games they have already added to their library."
                + " For now, you can use `/library view` to see your games in the autocomplete.");
        }

        const game = interaction.options.getString('game');
        const isDeleting = interaction.options.getSubcommand() === 'remove';
        let stores = await gameManagerService.getStoresForGame(game, interaction.user.id);

        if (isDeleting) {
            stores = [];
            stores = await gameManagerService.getAllStoresForGame(game);
        }

        const storesMessage = chooseStoresMessage(stores, isDeleting);

        await interaction.ephemeralReply(null, storesMessage);
    },
};