import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { Handler } from '../../../types/Handler';
import { noticeView, successView } from '../../../views/MessageView';
import { guildContext } from '../../context';
import { requireGame } from '../../shared/requireGame';

/** library_haveGame: "I have this game" on a game card posted in chat. Adds the game to the clicker's library. */
const haveGame: Handler<BotButtonInteraction> = {
    name: 'haveGame',
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

export default haveGame;
