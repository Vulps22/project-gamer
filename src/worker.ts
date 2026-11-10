import { Job, Worker } from 'bullmq';
import { ScrapeProcessor } from './jobs/ScrapeProcessor';
import { JobNames, QUEUE_NAME, ScrapeJob, VcJob } from './jobs/types';
import { createRuntime, redisConnection } from './runtime';

/** The BullMQ worker process. Runs every job, so the bot never blocks on one. */
const { services } = createRuntime();
const scrape = new ScrapeProcessor(services);

async function run(job: Job): Promise<void> {
    switch (job.name) {
        case JobNames.SCRAPE_FETCH:
            return scrape.process(job.data as ScrapeJob, job.attemptsMade + 1 >= (job.opts.attempts ?? 1));
        case JobNames.VC_EMPTY:
        case JobNames.VC_EXPIRE:
            return services.lfgSessions.closeByVc((job.data as VcJob).channelId);
        default:
            throw new Error(`Unknown job ${job.name}`);
    }
}

const worker = new Worker(QUEUE_NAME, run, { connection: redisConnection(), concurrency: 5 });
worker.on('ready', () => services.log.log('Worker ready'));
worker.on('failed', (job, error) => services.log.error(`Job ${job?.name ?? '?'} (${job?.id ?? '?'}) failed: ${error.message}`));

async function shutdown(): Promise<void> {
    await worker.close();
    process.exit(0);
}
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
