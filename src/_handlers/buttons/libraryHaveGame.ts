import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { baseId } from '../../constants/interactions';
import { Handler } from '../../types/Handler';
import { noticeView, successView } from '../../views/MessageView';
import { guildContext } from '../context';
import { requireGame } from '../shared/requireGame';

/** "I have this game" on a game card posted in chat: adds the game to the clicker's library. */
export const libraryHaveGame: Handler<BotButtonInteraction> = {
    name: baseId('LIBRARY_HAVE_GAME'),
    async execute(interaction, services) {
        await interaction.deferUpdate();
        const { account } = await guildContext(interaction, services);
        const game = await requireGame(services, interaction.params.get('g') ?? '');
        const added = await services.library.add(account.id, game.id, 'manual');
        if (added) {
            services.log.log(`${interaction.user.username} (${interaction.user.id}) added ${game.name} (${game.id}) to their library from a posted card`);
        }
        await interaction.ephemeralFollowUp(added
            ? successView(`Added **${game.name}** to your library.`)
            : noticeView(`**${game.name}** is already in your library.`));
    },
};
