const { SlashCommandBuilder, SlashCommandStringOption, MessageFlags, SlashCommandSubcommandBuilder } = require('discord.js');
const { BotInteraction } = require('../../structures');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register a new game')
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('game')
            .setDescription('Register a game to the database')
            .addStringOption(new SlashCommandStringOption()
                .setName('url')
                .setDescription('The URL of the game\'s store page')
                .setRequired(true)
            )
        ),
    administrator: false,
    /**
     *
     * @param {BotInteraction} interaction
     * @returns
     */
    async execute(interaction) {

        interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const url = interaction.options.getString('url');
        const userId = interaction.user.id;

        const { gameManagerService, gameStatus } = require('../../services');
        // Call the GameManagerService to register the game
        const result = await gameManagerService.registerGameFromUrl(url, userId);

        if (result.error) {
            return interaction.ephemeralReply(`Error registering game: ${result.error}`);
        }

        console.log('Submission result:', result);

        if (result.submission.status === gameStatus.PENDING) {
            return interaction.ephemeralReply('We do not recognize this store yet. The game has been registered but must be approved by an administrator before it can be used.\n You will be DM\'d automatically when it is approved.',);
        }
        console.log('Game registered:', result.submission);
        if (result.submission.status === gameStatus.APPROVED) {
            console.log('Adding game to user library:', userId, result.submission.gameId);
            await gameManagerService.addGameToUserLibrary(userId, result.submission.gameId);
        }

        return interaction.ephemeralReply('Game registered successfully and has been added to your library!');
    },
};