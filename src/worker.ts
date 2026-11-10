import { Job, Worker } from 'bullmq';
import { describeError } from './errors';
import { ScrapeProcessor } from './jobs/ScrapeProcessor';
import { SteamSyncProcessor } from './jobs/SteamSyncProcessor';
import { JobNames, QUEUE_NAME, ScrapeJob, SteamSyncJob, VcJob } from './jobs/types';
import { reportProcessErrors, throttledErrorReporter } from './logging/discordLog';
import { createRuntime, redisConnection } from './runtime';

/** How long shutdown waits for running jobs. Closing can hang forever if Redis is unreachable. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

/** The BullMQ worker process. Runs every job, so the bot never blocks on one. */
const { services } = createRuntime();
const { log } = services;
reportProcessErrors(log, 'Worker');
const scrape = new ScrapeProcessor(services);
const steamSync = new SteamSyncProcessor(services);

async function run(job: Job): Promise<void> {
    switch (job.name) {
        case JobNames.SCRAPE_FETCH:
            return scrape.process(job.data as ScrapeJob, isLastAttempt(job));
        case JobNames.STEAM_SYNC:
            return steamSync.sync(job.data as SteamSyncJob, isLastAttempt(job));
        case JobNames.STEAM_AUTO_SYNC:
            return steamSync.autoSync();
        case JobNames.VC_EMPTY:
        case JobNames.VC_EXPIRE:
            return services.lfgSessions.closeByVc((job.data as VcJob).channelId, job.name === JobNames.VC_EMPTY ? 'empty' : 'expired');
        default:
            throw new Error(`Unknown job ${job.name}`);
    }
}

/** BullMQ leaves attempts unset, or 0 for scheduled jobs, when a job gets one try. */
function maxAttempts(job: Job): number {
    return Math.max(job.opts.attempts ?? 1, 1);
}

function isLastAttempt(job: Job): boolean {
    return job.attemptsMade + 1 >= maxAttempts(job);
}

/** Never the job's data: a scrape job carries an interaction token. */
function describeJob(job: Job | undefined): string {
    return job ? `${job.name} (${job.id ?? '?'}, attempt ${Math.max(job.attemptsStarted, 1)} of ${maxAttempts(job)})` : 'unknown job';
}

const worker = new Worker(QUEUE_NAME, run, { connection: redisConnection(), concurrency: 5 });
worker.on('ready', () => log.log('Worker ready'));
services.jobs.scheduleSteamAutoSync()
    .then(() => log.log('Steam auto-sync scheduled'))
    .catch((error: unknown) => log.error(`Couldn't schedule Steam auto-sync\n${describeError(error)}`));
worker.on('active', job => log.debug(`Job started: ${describeJob(job)}`));
worker.on('completed', job => log.debug(`Job done: ${describeJob(job)}`));
worker.on('failed', (job, error) => log.error(`Job failed: ${describeJob(job)}\n${describeError(error)}`));
worker.on('stalled', jobId => log.error(`Job ${jobId} stalled and will be retried`));
worker.on('error', throttledErrorReporter(log, 'Worker error'));

let stopping = false;
async function shutdown(signal: string): Promise<void> {
    if (stopping) {
        return;
    }
    stopping = true;
    log.log(`Worker stopping (${signal})`);
    const timedOut = new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), SHUTDOWN_TIMEOUT_MS).unref());
    const result = await Promise.race([worker.close().then(() => 'closed' as const), timedOut]);
    if (result === 'timeout') {
        log.error(`Worker didn't stop within ${SHUTDOWN_TIMEOUT_MS / 1000}s, so it was forced to exit. Running jobs will be retried.`);
    }
    process.exit(result === 'closed' ? 0 : 1);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
