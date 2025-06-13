const { SlashCommandBuilder, SlashCommandStringOption, MessageFlags, SlashCommandSubcommandBuilder } = require('discord.js');
const { gameManager } = require('../../services/GameManagerService');
const { chooseStoresMessage } = require('../../messages/chooseStoresMessage');
const { BotInteraction } = require('../../structures/botInteraction');
const userManagerServiceInstance = require('../../services/UserManagerService');


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

        userManagerServiceInstance.setSharing(interaction.user.id, interaction.guildId, sharing)
        

        await interaction.ephemeralReply("Sharing Settings Saved");
    },
};