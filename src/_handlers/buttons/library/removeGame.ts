import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { Handler } from '../../../types/Handler';
import { noticeView, successView } from '../../../views/MessageView';
import { guildContext } from '../../context';
import { requireGame } from '../../shared/requireGame';

/** library_removeGame, as v1: "Remove from Library" on a game card. Removes the game from the clicker's library. */
const removeGame: Handler<BotButtonInteraction> = {
    name: 'removeGame',
    async execute(interaction, services) {
        await interaction.deferUpdate();
        const { account } = await guildContext(interaction, services);
        const game = await requireGame(services, interaction.params.get('g') ?? '');
        const removed = await services.library.remove(account.id, game.id);
        if (removed) {
            services.log.log(`${interaction.user.username} (${interaction.user.id}) removed ${game.name} (${game.id}) from their library from a button`);
        }
        await interaction.ephemeralFollowUp(removed
            ? successView(`## ${game.name} removed from your library.`)
            : noticeView(`## ${game.name} isn't in your library.`));
    },
};

export default removeGame;
