import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { customIdsFor } from '../../../discord/customIds';
import { Handler } from '../../../types/Handler';
import { gameView } from '../../../views/gameView';
import { successView } from '../../../views/MessageView';
import { guildContext } from '../../context';
import { needsPermission } from '../../shared/permissions';
import { requireGame } from '../../shared/requireGame';

/** library_gameShare, as v1's "Share with Channel": posts the game card in the channel, with Add / Remove buttons. */
const gameShare: Handler<BotButtonInteraction> = {
    name: 'gameShare',
    async execute(interaction, services) {
        await interaction.deferUpdate();
        const { server } = await guildContext(interaction, services);
        const game = await requireGame(services, interaction.params.get('g') ?? '');
        const channelId = interaction.channel?.id;
        if (!channelId) {
            throw new Error('A guild button arrived without its channel');
        }
        const ids = customIdsFor(interaction);
        const [links, owners] = await Promise.all([services.games.storeLinks(game.id), services.library.ownerCounts(server.id, game.id)]);
        const card = gameView(game, links, owners, {
            addId: ids('lfg', 'addGame', { g: game.id }),
            removeId: ids('library', 'removeGame', { g: game.id }),
        });
        await needsPermission('Send Messages', () => services.discord.send(channelId, card));
        services.log.log(`${interaction.user.username} (${interaction.user.id}) shared ${game.name} in channel ${channelId}, server ${interaction.guildId ?? '?'}`);
        await interaction.ephemeralFollowUp(successView(`Shared **${game.name}** with the channel.`));
    },
};

export default gameShare;
