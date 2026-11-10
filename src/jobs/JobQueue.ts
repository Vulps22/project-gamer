import { Queue } from 'bullmq';
import { JobNames, ScrapeJob, STEAM_AUTO_SYNC_EVERY_MS, SteamSyncJob, VC_EMPTY_DELAY_MS, VC_EXPIRE_DELAY_MS, VcJob } from './types';

/** Enqueues work for the worker. The bot never runs these jobs itself. */
export class JobQueue {
    constructor(private readonly queue: Queue) {}

    async enqueueScrape(job: ScrapeJob): Promise<void> {
        await this.queue.add(JobNames.SCRAPE_FETCH, job, { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: true, removeOnFail: 100 });
    }

    /**
     * Queues a Steam sync. One per user at a time: if one is already waiting, this returns false
     * and the waiting one runs instead.
     */
    async enqueueSteamSync(job: SteamSyncJob): Promise<boolean> {
        const jobId = `steam-sync-${job.userId}`;
        const existing = await this.queue.getJob(jobId);
        if (existing && !(await existing.isCompleted()) && !(await existing.isFailed())) {
            return false;
        }
        await existing?.remove();
        await this.queue.add(JobNames.STEAM_SYNC, job, {
            jobId,
            attempts: 3,
            backoff: { type: 'exponential', delay: 30_000 },
            removeOnComplete: true,
            removeOnFail: 100,
        });
        return true;
    }

    /** Starts (or keeps) the repeating auto-sync. Safe to call on every worker start. */
    async scheduleSteamAutoSync(): Promise<void> {
        await this.queue.upsertJobScheduler('steam-auto-sync', { every: STEAM_AUTO_SYNC_EVERY_MS }, {
            name: JobNames.STEAM_AUTO_SYNC,
            opts: { removeOnComplete: true, removeOnFail: 100 },
        });
    }

    /** (Re)starts the countdown to close an empty VC. */
    async scheduleVcEmpty(channelId: string): Promise<void> {
        await this.cancelVcEmpty(channelId);
        await this.queue.add(JobNames.VC_EMPTY, { channelId } satisfies VcJob, {
            jobId: vcEmptyJobId(channelId),
            delay: VC_EMPTY_DELAY_MS,
            removeOnComplete: true,
            removeOnFail: 100,
        });
    }

    /** Someone joined: the VC is no longer empty. */
    async cancelVcEmpty(channelId: string): Promise<void> {
        await this.queue.remove(vcEmptyJobId(channelId));
    }

    async scheduleVcExpire(channelId: string): Promise<void> {
        await this.queue.add(JobNames.VC_EXPIRE, { channelId } satisfies VcJob, {
            jobId: `vc-expire-${channelId}`,
            delay: VC_EXPIRE_DELAY_MS,
            removeOnComplete: true,
            removeOnFail: 100,
        });
    }
}

function vcEmptyJobId(channelId: string): string {
    return `vc-empty-${channelId}`;
}
