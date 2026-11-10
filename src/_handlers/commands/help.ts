import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { CommandHandler } from '../../types/Handler';
import { helpView } from '../../views/helpView';

export const help: CommandHandler = {
    name: 'help',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('What LFGameSync does, and how to use it')
        .setContexts(InteractionContextType.Guild)
        .toJSON(),

    async execute(interaction) {
        await interaction.ephemeralReply(helpView());
    },
};
