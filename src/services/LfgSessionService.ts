import { DiscordApi } from '../discord/DiscordApi';
import { CustomIdFactory } from '../discord/customIds';
import { Log } from '../types/Log';
import { lfgPostView } from '../views/lfgViews';
import { LfgService } from './LfgService';

/** Keeps LFG posts and their voice channels in step with the session. Works from the bot or the worker. */
export class LfgSessionService {
    constructor(private readonly lfg: LfgService, private readonly discord: DiscordApi, private readonly log: Log) {}

    /** Redraws a post from the database. `ids` builds its buttons; null once the session is over. */
    async refresh(postId: string, ids: CustomIdFactory | null): Promise<void> {
        const details = await this.lfg.details(postId);
        if (!details?.post.message_id || !details.lfgChannelId) {
            return;
        }
        await this.discord.edit(details.lfgChannelId, details.post.message_id, lfgPostView(details, ids));
    }

    /** Closes the session using this VC, if there still is one: deletes the VC and marks the post closed. */
    async closeByVc(channelId: string): Promise<void> {
        const post = await this.lfg.findActiveByVc(channelId);
        if (!post) {
            return;
        }
        await this.discord.deleteChannel(channelId);
        if (await this.lfg.expire(post.id)) {
            await this.refresh(post.id, null).catch((error: unknown) => {
                // The post may have been deleted, or the LFG channel changed. The session is closed either way.
                this.log.error(`Could not mark LFG post ${post.id} closed: ${error instanceof Error ? error.message : String(error)}`);
            });
        }
    }
}
