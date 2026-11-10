/** The one BullMQ queue PG uses. Jobs are told apart by name. */
export const QUEUE_NAME = 'pg-jobs';

export const JobNames = {
    SCRAPE_FETCH: 'scrape.fetch',
    VC_EMPTY: 'vc.empty',
    VC_EXPIRE: 'vc.expire',
    STEAM_SYNC: 'steam.sync',
    STEAM_AUTO_SYNC: 'steam.autoSync',
} as const;

export type JobName = (typeof JobNames)[keyof typeof JobNames];

export interface ScrapeJob {
    url: string;
    storeId: string;
    storeGameId: string;
    scraper: string;
    /** Account ID of the user adding the game. */
    userId: string;
    discordUserId: string;
    /** Lets the worker edit the user's "adding your game..." reply. Valid for 15 minutes. */
    applicationId: string;
    interactionToken: string;
    flowId: string;
}

export interface SteamSyncJob {
    /** Account ID. */
    userId: string;
    discordUserId: string;
    /** Why it's running, for the log. */
    reason: 'linked' | 'requested' | 'auto';
    /** The reply to update with the result. Valid for 15 minutes; absent for auto-sync. */
    followUp?: { applicationId: string; interactionToken: string };
}

export interface VcJob {
    channelId: string;
}

/** How long a managed VC may sit empty before it is closed. */
export const VC_EMPTY_DELAY_MS = 10 * 60 * 1000;
/** How often auto-sync looks for users to sync, and how stale a sync must be to run again. */
export const STEAM_AUTO_SYNC_EVERY_MS = 60 * 60 * 1000;
export const STEAM_SYNC_STALE_HOURS = 24;
/** Users queued per auto-sync run, so one run can't flood Steam's API. */
export const STEAM_AUTO_SYNC_BATCH = 200;

/** Hard cap on a managed VC's life. */
export const VC_EXPIRE_DELAY_MS = 60 * 60 * 1000;
