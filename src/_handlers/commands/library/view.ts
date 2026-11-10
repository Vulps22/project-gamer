import { AutocompleteInteraction, User } from 'discord.js';
import { PgCommandInteraction } from '../../../discord/interactions';
import { customIdsFor } from '../../../discord/customIds';
import { UserFacingError } from '../../../errors';
import { Services } from '../../../services';
import { Account } from '../../../types/models';
import { gameView, libraryListView } from '../../../views/gameView';
import { guildContext } from '../../context';
import { requireGame } from '../../shared/requireGame';

/** Shows a library, or one game in it with a button to post it in chat. Other people's only if they share here. */
export async function libraryView(interaction: PgCommandInteraction, services: Services): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const { account, server } = await guildContext(interaction, services);
    const target: User = interaction.options.getUser('user') ?? interaction.user;
    const isOwn = target.id === interaction.user.id;

    const owner = isOwn ? account : await services.users.findByDiscordId(target.id);
    if (!owner || (!isOwn && !(await services.servers.isSharing(server.id, owner.id)))) {
        throw new UserFacingError(`<@${target.id}> isn't sharing a library here.`);
    }

    const gameOption = interaction.options.getString('game');
    if (!gameOption) {
        await interaction.editReply(libraryListView(target.id, await services.library.list(owner.id), isOwn));
        return;
    }

    const game = await requireGame(services, gameOption);
    if (!(await services.library.owns(owner.id, game.id))) {
        throw new UserFacingError(`**${game.name}** isn't in ${isOwn ? 'your' : `<@${target.id}>'s`} library.`);
    }
    const ids = customIdsFor(interaction);
    await interaction.editReply(gameView(game, await services.games.storeLinks(game.id), {
        subtitle: isOwn ? 'In your library' : `In <@${target.id}>'s library`,
        postButtonId: ids('LIBRARY_POST_GAME', { g: game.id }),
    }));
}

/** Autocomplete for /library view's game: the chosen user's library, if they share it here. */
export async function viewedLibrary(interaction: AutocompleteInteraction, services: Services, search: string): Promise<{ name: string; value: string }[]> {
    const targetId = interaction.options.get('user')?.value;
    const isOwn = typeof targetId !== 'string' || targetId === interaction.user.id;
    const owner: Account | null = await services.users.findByDiscordId(isOwn ? interaction.user.id : targetId);
    if (!owner || !interaction.guildId) {
        return [];
    }
    if (!isOwn) {
        const server = await services.servers.ensure(interaction.guildId);
        if (!(await services.servers.isSharing(server.id, owner.id))) {
            return [];
        }
    }
    return (await services.library.list(owner.id, search)).map(game => ({ name: game.name.slice(0, 100), value: game.id }));
}
