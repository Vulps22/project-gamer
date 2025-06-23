const { SlashCommandBuilder, SlashCommandStringOption, MessageFlags, SlashCommandSubcommandBuilder } = require('discord.js');
const { gameManager } = require('../../services/gameManagerService');
const { chooseStoresMessage } = require('../../messages/chooseStoresMessage');
const { BotInteraction } = require('../../structures/botInteraction');
const userManagerService = require('../../services/userManagerService');
const { logger } = require('../../lib');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('sharing')
        .setDescription('Turn on/off game sharing in this community')
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('on')
            .setDescription('Allow others to see if you share a game')
        )
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('off')
            .setDescription('Stop sharing your games with others')
        ),
    administrator: false,
    /**
     * 
     * @param {BotInteraction} interaction 
     */
    async execute(interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand();


        sharing = false;

        switch (subcommand) {
            case 'on':
                sharing = true;
                break;
            case 'off':
                sharing = false;
                break;
        }
        try {
            const didUpdate = await userManagerService.setSharing(interaction.user.id, interaction.guildId, sharing)

            if (!didUpdate) {
                await interaction.ephemeralReply("Failed to update sharing settings. Please try again later.");
                return;
            }

            await interaction.ephemeralReply("Sharing Settings Saved");
        } catch (error) {
            console.error(`Error setting sharing for user ${interaction.user.id} on server ${interaction.guildId}:`, error);
            logger.error(`Error setting sharing for user ${interaction.user.id} on server ${interaction.guildId}:\n ${error.message}`);
            await interaction.ephemeralReply("An error occurred while updating your sharing settings. Please try again later.");
            return;
        }
    }
};