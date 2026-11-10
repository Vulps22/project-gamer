import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { CommandHandler } from '../../../types/Handler';
import { libraryAdd } from './add';
import { libraryRemove } from './remove';
import { libraryView, viewedLibrary } from './view';

export const library: CommandHandler = {
    name: 'library',
    data: new SlashCommandBuilder()
        .setName('library')
        .setDescription('Manage your game library')
        .setContexts(InteractionContextType.Guild)
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Add a game from its store page')
            .addStringOption(option => option.setName('url').setDescription('The game\'s store page URL').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Remove a game from your library')
            .addStringOption(option => option.setName('game').setDescription('The game to remove').setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('See a library, or share one of its games in chat')
            .addUserOption(option => option.setName('user').setDescription('Whose library (yours if left out)'))
            .addStringOption(option => option.setName('game').setDescription('A game to show').setAutocomplete(true)))
        .toJSON(),

    async execute(interaction, services) {
        switch (interaction.options.getSubcommand()) {
            case 'add':
                return libraryAdd(interaction, services);
            case 'remove':
                return libraryRemove(interaction, services);
            case 'view':
                return libraryView(interaction, services);
            default:
                throw new Error(`Unknown /library subcommand ${interaction.options.getSubcommand()}`);
        }
    },

    async autocomplete(interaction, services) {
        const search = interaction.options.getFocused().trim();
        if (interaction.options.getSubcommand() === 'view') {
            return viewedLibrary(interaction, services, search);
        }
        const account = await services.users.findByDiscordId(interaction.user.id);
        if (!account) {
            return [];
        }
        return (await services.library.list(account.id, search)).map(game => ({ name: game.name.slice(0, 100), value: game.id }));
    },
};
