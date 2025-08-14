const { SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } = require('discord.js');
const { gameManagerService } = require('../../services');
const { chooseStoresMessage, gameInformationMessage } = require('../../messages');
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
                .setDescription('View a game\'s information')
                .setRequired(false)
                .setAutocomplete(true)
            )
        ),
    administrator: false,

    /**
     * Handles autocomplete for game search.
     * Fetches games from the database based on user input.
     * @param {AutocompleteInteraction} interaction The autocomplete interaction
     * @returns {Promise<void>} - Responds with game choices for autocomplete.
     */
    async autoComplete(interaction) {
        const name = interaction.options.getFocused();

        let games = [];

        if (interaction.options.getSubcommand() === 'view') {
            const gamesSearch = await gameManagerService.searchUserGamesByName(name, interaction.user.id);

            if (!gamesSearch || gamesSearch.length === 0) {
                interaction.respond([{ name: 'No games found', value: 'none' }]);
                return;
            }

            interaction.respond(gamesSearch.map(game => ({ name: game.name, value: String(game.id) })));
            return;
        }

        if (interaction.options.getSubcommand() === 'remove') {
            games = await gameManagerService.searchUserGamesByName(name, interaction.user.id);
        } else {
            games = await gameManagerService.searchGamesByName(name);
        }

        console.log('Autocomplete games:', games);

        if (!games || games.length === 0) {
            interaction.respond([{ name: 'No games found', value: 'none' }]);
            return;
        }

        const choices = games.map(game => ({ name: game.name, value: String(game.id) }));
        console.log('Autocomplete choices:', choices);

        interaction.respond(choices);

    },

    /**
     * @param {BotInteraction} interaction The command interaction
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        const game = interaction.options.getString('game');

        if (interaction.options.getSubcommand() === 'view') {
            if (game === null) {
                interaction.ephemeralReply('# Please specify a game.');
                return;
            }

            // Fetch all required data
            const gameData = await gameManagerService.getGameById(game);
            const stores = await gameManagerService.getAllStoresForGame(game);
            const communityAmount = await gameManagerService.getUserAmountWithGameInServer(interaction.guildId, game);
            const overAllAmount = await gameManagerService.getUserAmountWithGame(game);

            const stats = {
                communityCount: communityAmount.user_count,
                globalCount: overAllAmount.user_count
            };

            // Create message (pure function - no data fetching)
            const gamesMessage = gameInformationMessage(gameData, stores, stats, true);

            interaction.ephemeralReply(null, gamesMessage);
            return;
        }

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