import { describeError } from '../errors';
import { Services } from '../services';
import { SyncResult } from '../services/SteamService';
import { MessageView } from '../views/MessageView';
import { steamSyncResultView } from '../views/steamViews';
import { STEAM_AUTO_SYNC_BATCH, STEAM_SYNC_STALE_HOURS, SteamSyncJob } from './types';

type SteamServices = Pick<Services, 'steam' | 'jobs' | 'discord' | 'log'>;

/** steam.sync and steam.autoSync. */
export class SteamSyncProcessor {
    constructor(private readonly services: SteamServices) {}

    /** @param isLastAttempt on the final retry a failure is reported to the user; earlier ones are retried quietly. */
    async sync(job: SteamSyncJob, isLastAttempt: boolean): Promise<void> {
        let result: SyncResult;
        try {
            result = await this.services.steam.sync(job.userId);
        } catch (error) {
            if (isLastAttempt) {
                await this.followUp(job, steamSyncResultView({ status: 'failed' }));
            }
            throw error;
        }

        const { log } = this.services;
        if (result.status === 'synced') {
            log.log(`Steam sync (${job.reason}) for ${job.discordUserId}: owns ${result.owned}, ${result.addedToLibrary} added to library, ${result.newToCatalogue} new to the catalogue`);
        } else if (result.status === 'private') {
            log.log(`Steam sync (${job.reason}) for ${job.discordUserId}: game details are private, nothing synced`);
        } else {
            log.log(`Steam sync (${job.reason}) for ${job.discordUserId}: no longer linked, skipped`);
        }
        await this.followUp(job, steamSyncResultView(result));
    }

    /** Queues a sync for every linked user who hasn't been synced recently. */
    async autoSync(): Promise<void> {
        const due = await this.services.steam.dueForSync(STEAM_SYNC_STALE_HOURS, STEAM_AUTO_SYNC_BATCH);
        let queued = 0;
        for (const user of due) {
            if (await this.services.jobs.enqueueSteamSync({ userId: user.user_id, discordUserId: user.discord_id, reason: 'auto' })) {
                queued++;
            }
        }
        if (due.length > 0) {
            this.services.log.log(`Steam auto-sync queued ${queued} of ${due.length} user(s) due a sync`);
        }
    }

    /** The interaction token lasts 15 minutes. After that, or for auto-sync, there's no reply to update. */
    private async followUp(job: SteamSyncJob, view: MessageView): Promise<void> {
        if (!job.followUp) {
            return;
        }
        await this.services.discord.editInteractionReply(job.followUp.applicationId, job.followUp.interactionToken, view).catch((error: unknown) => {
            this.services.log.log(`Couldn't update ${job.discordUserId}'s Steam sync reply (the 15-minute window has probably passed): ${describeError(error).split('\n')[0]}`);
        });
    }
}
