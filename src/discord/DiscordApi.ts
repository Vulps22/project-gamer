import { DiscordAPIError, REST, Routes } from 'discord.js';
import { MessageView, toRestBody } from '../views/MessageView';

/** Discord's error code for a channel that no longer exists. */
const UNKNOWN_CHANNEL = 10003;
/** Discord's error code for a user who won't accept DMs from the bot. */
const CANNOT_DM = 50007;

/**
 * Discord over REST, so the same calls work from any shard and from the worker,
 * whichever guild the target lives in.
 */
export class DiscordApi {
    constructor(private readonly rest: REST) {}

    /** Sends a message and returns its ID. */
    async send(channelId: string, view: MessageView): Promise<string> {
        const message = await this.rest.post(Routes.channelMessages(channelId), { body: toRestBody(view) }) as { id: string };
        return message.id;
    }

    async edit(channelId: string, messageId: string, view: MessageView): Promise<void> {
        await this.rest.patch(Routes.channelMessage(channelId, messageId), { body: toRestBody(view) });
    }

    /** Edits the original reply to an interaction, from anywhere, for 15 minutes after it was received. */
    async editInteractionReply(applicationId: string, token: string, view: MessageView): Promise<void> {
        await this.rest.patch(Routes.webhookMessage(applicationId, token), { body: toRestBody(view), auth: false });
    }

    /** Deletes a channel. Says whether it still existed. */
    async deleteChannel(channelId: string): Promise<boolean> {
        try {
            await this.rest.delete(Routes.channel(channelId));
            return true;
        } catch (error) {
            if (error instanceof DiscordAPIError && error.code === UNKNOWN_CHANNEL) {
                return false;
            }
            throw error;
        }
    }

    /** DMs a user. Says whether it was delivered; closed DMs are expected, not an error. */
    async dm(userId: string, view: MessageView): Promise<boolean> {
        try {
            const channel = await this.rest.post(Routes.userChannels(), { body: { recipient_id: userId } }) as { id: string };
            await this.send(channel.id, view);
            return true;
        } catch (error) {
            if (error instanceof DiscordAPIError && error.code === CANNOT_DM) {
                return false;
            }
            throw error;
        }
    }
}
