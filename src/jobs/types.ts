/** The one BullMQ queue PG uses. Jobs are told apart by name. */
export const QUEUE_NAME = 'pg-jobs';

export const JobNames = {
    SCRAPE_FETCH: 'scrape.fetch',
    VC_EMPTY: 'vc.empty',
    VC_EXPIRE: 'vc.expire',
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

export interface VcJob {
    channelId: string;
}

/** How long a managed VC may sit empty before it is closed. */
export const VC_EMPTY_DELAY_MS = 10 * 60 * 1000;
/** Hard cap on a managed VC's life. */
export const VC_EXPIRE_DELAY_MS = 60 * 60 * 1000;
