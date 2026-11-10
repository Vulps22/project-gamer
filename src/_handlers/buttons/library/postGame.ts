import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { customIdsFor } from '../../../discord/customIds';
import { Handler } from '../../../types/Handler';
import { gameView } from '../../../views/gameView';
import { successView } from '../../../views/MessageView';
import { needsPermission } from '../../shared/permissions';
import { requireGame } from '../../shared/requireGame';

/** library_postGame: posts a game card from /library view into the channel, with an "I have this game" button. */
const postGame: Handler<BotButtonInteraction> = {
    name: 'postGame',
    async execute(interaction, services) {
        await interaction.deferUpdate();
        const game = await requireGame(services, interaction.params.get('g') ?? '');
        const channelId = interaction.channel?.id;
        if (!channelId) {
            throw new Error('A guild button arrived without its channel');
        }
        const card = gameView(game, await services.games.storeLinks(game.id), {
            subtitle: `Shared by <@${interaction.user.id}>`,
            haveButtonId: customIdsFor(interaction)('library', 'haveGame', { g: game.id }),
        });
        await needsPermission('Send Messages', () => services.discord.send(channelId, card));
        services.log.log(`${interaction.user.username} (${interaction.user.id}) posted ${game.name} in channel ${channelId}, server ${interaction.guildId ?? '?'}`);
        await interaction.ephemeralFollowUp(successView(`Posted **${game.name}** in chat.`));
    },
};

export default postGame;
