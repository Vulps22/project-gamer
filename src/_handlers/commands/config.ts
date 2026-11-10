import { ChannelType, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { CommandHandler } from '../../types/Handler';
import { successView } from '../../views/MessageView';
import { guildContext } from '../context';
import { EPHEMERAL } from '../shared/ephemeral';

export const config: CommandHandler = {
    name: 'config',
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Set LFGameSync up for this server')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('lfg-channel')
            .setDescription('Choose where LFG posts go. Voice channels are created in the same category.')
            .addChannelOption(option => option
                .setName('channel')
                .setDescription('The LFG channel')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)))
        .toJSON(),

    async execute(interaction, services) {
        await interaction.deferReply(EPHEMERAL);
        const { server } = await guildContext(interaction, services);
        const channel = interaction.options.getChannel('channel', true);
        await services.servers.setLfgChannel(server.id, channel.id);
        await interaction.editReply(successView(`LFG posts will go in <#${channel.id}>.`));
    },
};
