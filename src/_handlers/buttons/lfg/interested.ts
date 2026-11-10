import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { customIdsFor } from '../../../discord/customIds';
import { Handler } from '../../../types/Handler';
import { noticeView, successView } from '../../../views/MessageView';
import { guildContext } from '../../context';
import { activePost } from '../../shared/activePost';

/** lfg_interested: puts the clicker on an open invitation's list. */
const interested: Handler<BotButtonInteraction> = {
    name: 'interested',
    async execute(interaction, services) {
        await interaction.deferUpdate();
        const { account } = await guildContext(interaction, services);
        const post = await activePost(services, interaction.params.get('p'));

        const added = await services.lfg.addInterested(post.id, account.id);
        if (added) {
            services.log.log(`${interaction.user.username} (${interaction.user.id}) is interested in LFG session ${post.id}`);
            await services.lfgSessions.refresh(post.id, customIdsFor(interaction));
        }
        const join = post.vc_channel_id ? ` Jump in: <#${post.vc_channel_id}>` : '';
        await interaction.ephemeralFollowUp(added ? successView(`You're on the list!${join}`) : noticeView(`You're already on the list.${join}`));
    },
};

export default interested;
