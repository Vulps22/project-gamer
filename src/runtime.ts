import { Queue } from 'bullmq';
import { REST } from 'discord.js';
import { Logger } from '@vulps22/logger';
import { environment, loadAppConfig, requireEnv } from './config';
import { createDatabase } from './database/Database';
import { QUEUE_NAME } from './jobs/types';
import { createServices, Services } from './services';

/** Redis connection settings for BullMQ, from REDIS_URL. */
export function redisConnection(): { host: string; port: number; password?: string } {
    const url = new URL(requireEnv('REDIS_URL'));
    return { host: url.hostname, port: Number(url.port || 6379), password: url.password || undefined };
}

/** Builds every service from the environment. Shared by the shards and the worker. */
export function createRuntime(): { services: Services; queue: Queue } {
    Logger.initialize();
    const config = loadAppConfig(environment);
    const db = createDatabase({
        host: requireEnv('DB_HOST'),
        port: Number(process.env.DB_PORT ?? 5432),
        database: requireEnv('DB_NAME'),
        user: requireEnv('DB_USER'),
        password: requireEnv('DB_PASSWORD'),
    });
    const rest = new REST().setToken(requireEnv('DISCORD_TOKEN'));
    const queue = new Queue(QUEUE_NAME, { connection: redisConnection() });
    const services = createServices({ config, log: Logger, db, rest, queue, http: url => fetch(url) });
    return { services, queue };
}
