import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { customIdsFor } from '../../../discord/customIds';
import { Handler } from '../../../types/Handler';
import { noticeView, successView } from '../../../views/MessageView';
import { guildContext } from '../../context';
import { activePost } from '../../shared/activePost';

/** lfg_notInterested: takes the clicker off an open invitation's list. */
const notInterested: Handler<BotButtonInteraction> = {
    name: 'notInterested',
    async execute(interaction, services) {
        await interaction.deferUpdate();
        const { account } = await guildContext(interaction, services);
        const post = await activePost(services, interaction.params.get('p'));

        const removed = await services.lfg.removeInterested(post.id, account.id);
        if (removed) {
            services.log.log(`${interaction.user.username} (${interaction.user.id}) is no longer interested in LFG session ${post.id}`);
            await services.lfgSessions.refresh(post.id, customIdsFor(interaction));
        }
        await interaction.ephemeralFollowUp(removed ? successView('You\'re off the list.') : noticeView('You weren\'t on the list.'));
    },
};

export default notInterested;
