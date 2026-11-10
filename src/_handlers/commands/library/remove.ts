import { PgCommandInteraction } from '../../../discord/interactions';
import { Services } from '../../../services';
import { noticeView, successView } from '../../../views/MessageView';
import { guildContext } from '../../context';
import { requireGame } from '../../shared/requireGame';
import { EPHEMERAL } from '../../shared/ephemeral';

export async function libraryRemove(interaction: PgCommandInteraction, services: Services): Promise<void> {
    await interaction.deferReply(EPHEMERAL);
    const { account } = await guildContext(interaction, services);
    const game = await requireGame(services, interaction.options.getString('game', true));
    const removed = await services.library.remove(account.id, game.id);
    await interaction.editReply(removed ? successView(`Removed **${game.name}** from your library.`) : noticeView(`**${game.name}** isn't in your library.`));
}
