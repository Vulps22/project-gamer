import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { CommandHandler } from '../../types/Handler';
import { helpView } from '../../views/helpView';

export const help: CommandHandler = {
    name: 'help',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of all available commands.')
        .setContexts(InteractionContextType.Guild)
        .toJSON(),

    /** As v1: built from the registered commands, and posted in the channel. */
    async execute(interaction) {
        // Loaded here, not at the top: the command list includes this command.
        const { commands } = await import('..');
        await interaction.reply(helpView(commands.map(command => ({ name: command.data.name, description: command.data.description }))));
    },
};
