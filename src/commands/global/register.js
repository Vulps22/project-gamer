const { SlashCommandBuilder, SlashCommandStringOption, MessageFlags, SlashCommandSubcommandBuilder } = require('discord.js');



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
    async execute(interaction) {
        const url = interaction.options.getString('url');
        const userId = interaction.user.id;

        const { gameManager, gameStatus } = require('../../services/GameManagerService');
        // Call the GameManagerService to register the game
        const result = await gameManager.registerGameFromUrl(url, userId);

        if (result.error) {
            return interaction.reply({
                content: `Error registering game: ${result.error}`,
                flags: MessageFlags.Ephemeral,
            });
        }

        console.log("Submission result:", result);

        if (result.submission.status === gameStatus.PENDING) {
            return interaction.reply({
                content: 'We do not recognize this store yet. The game has been registered but must be approved by an administrator before it can be used.\n You will be DM\'d automatically when it is approved.',
                flags: MessageFlags.Ephemeral,
            });
        }

        return interaction.reply({
            content: `Game registered successfully!`,
            flags: MessageFlags.Ephemeral,
        });
    },
};