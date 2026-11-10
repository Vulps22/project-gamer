import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { baseId } from '../../constants/interactions';
import { customIdsFor } from '../../discord/customIds';
import { UserFacingError } from '../../errors';
import { Services } from '../../services';
import { Handler } from '../../types/Handler';
import { LfgPost } from '../../types/models';
import { noticeView, successView } from '../../views/MessageView';
import { guildContext } from '../context';
import { startSession } from '../lfg/startSession';

export const lfgOpenInvite: Handler<BotButtonInteraction> = {
    name: baseId('LFG_OPEN_INVITE'),
    async execute(interaction, services) {
        await interaction.deferUpdate();
        await startSession(interaction, services, interaction.params.get('g') ?? '', []);
    },
};

export const lfgInterested: Handler<BotButtonInteraction> = {
    name: baseId('LFG_INTERESTED'),
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

export const lfgNotInterested: Handler<BotButtonInteraction> = {
    name: baseId('LFG_NOT_INTERESTED'),
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

async function activePost(services: Services, postId: string | undefined): Promise<LfgPost> {
    const post = postId ? await services.lfg.getById(postId) : null;
    if (!post || post.status !== 'active') {
        throw new UserFacingError('This session has ended.');
    }
    return post;
}
