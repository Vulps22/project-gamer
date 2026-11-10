import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { Handler } from '../../../types/Handler';
import { noticeView, successView } from '../../../views/MessageView';
import { guildContext } from '../../context';
import { requireGame } from '../../shared/requireGame';

/**
 * lfg_addGame, as v1: "I have this game" on an LFG post and "Add to Library" on a shared game card.
 * Adds the game to the clicker's library.
 */
const addGame: Handler<BotButtonInteraction> = {
    name: 'addGame',
    async execute(interaction, services) {
        await interaction.deferUpdate();
        const { account } = await guildContext(interaction, services);
        const game = await requireGame(services, interaction.params.get('g') ?? '');
        const added = await services.library.add(account.id, game.id, 'manual');
        if (added) {
            services.log.log(`${interaction.user.username} (${interaction.user.id}) added ${game.name} (${game.id}) to their library from a button`);
        }
        await interaction.ephemeralFollowUp(added
            ? successView(`## ${game.name} added to your library.`)
            : noticeView(`## ${game.name} is already in your library.`));
    },
};

export default addGame;
