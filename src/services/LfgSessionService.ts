import { DiscordApi } from '../discord/DiscordApi';
import { CustomIdFactory, customIdsForFlow } from '../discord/customIds';
import { describeError } from '../errors';
import { Log } from '../types/Log';
import { lfgPostView } from '../views/lfgViews';
import { LfgService } from './LfgService';

/** Keeps LFG posts and their voice channels in step with the session. Works from the bot or the worker. */
export class LfgSessionService {
    constructor(private readonly lfg: LfgService, private readonly discord: DiscordApi, private readonly log: Log) {}

    /** Redraws a post from the database. `ids` builds its buttons. */
    async refresh(postId: string, ids: CustomIdFactory): Promise<void> {
        const details = await this.lfg.details(postId);
        if (!details?.post.message_id || !details.lfgChannelId) {
            return;
        }
        await this.discord.edit(details.lfgChannelId, details.post.message_id, lfgPostView(details, ids));
    }

    /**
     * Closes the session using this VC, if there still is one: deletes the VC and marks the post closed.
     * @param reason why it's closing, for the log: it sat empty, or it reached its time limit.
     */
    async closeByVc(channelId: string, reason: 'empty' | 'expired'): Promise<void> {
        const post = await this.lfg.findActiveByVc(channelId);
        if (!post) {
            return;
        }
        const existed = await this.discord.deleteChannel(channelId);
        if (await this.lfg.expire(post.id)) {
            this.log.log(`Closed LFG session ${post.id} (${reason === 'empty' ? 'VC sat empty' : 'reached its time limit'}). VC ${channelId} ${existed ? 'deleted' : 'was already gone'}`);
            await this.refresh(post.id, customIdsForFlow(null)).catch((error: unknown) => {
                // The post may have been deleted, or the LFG channel changed. The session is closed either way.
                this.log.error(`Couldn't mark LFG post ${post.id} closed. The session is closed regardless.\n${describeError(error)}`);
            });
        }
    }
}
