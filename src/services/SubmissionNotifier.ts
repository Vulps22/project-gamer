import { AppConfig } from '../config/AppConfig';
import { DiscordApi } from '../discord/DiscordApi';
import { CustomIdFactory } from '../discord/customIds';
import { Submission } from '../types/models';
import { submissionView } from '../views/submissionViews';
import { GameService } from './GameService';

/** Posts new submissions to the admin server's new-games channel for review. */
export class SubmissionNotifier {
    constructor(private readonly discord: DiscordApi, private readonly games: GameService, private readonly config: AppConfig) {}

    async notify(submission: Submission, submitterDiscordId: string, ids: CustomIdFactory): Promise<void> {
        const storeName = await this.storeName(submission.store_id);
        await this.discord.send(this.config.newGamesChannelId, submissionView(submission, submitterDiscordId, storeName, { status: 'pending', ids }));
    }

    async storeName(storeId: string | null): Promise<string | null> {
        if (!storeId) {
            return null;
        }
        return (await this.games.stores()).find(store => store.id === storeId)?.name ?? null;
    }
}
