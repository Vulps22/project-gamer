import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { REST } from 'discord.js';
import { environment, loadAppConfig, requireEnv } from './config';
import { createDatabase } from './database/Database';
import { QUEUE_NAME } from './jobs/types';
import { createDiscordLog, throttledErrorReporter } from './logging/discordLog';
import { createServices, Services } from './services';
import { Log } from './types/Log';

/** Redis connection settings for BullMQ, from REDIS_URL. */
export function redisConnection(): { host: string; port: number; password?: string } {
    const url = new URL(requireEnv('REDIS_URL'));
    return { host: url.hostname, port: Number(url.port || 6379), password: url.password || undefined };
}

/** Builds every service from the environment. Shared by the shards and the worker. */
export function createRuntime(log: Log = createDiscordLog()): { services: Services; queue: Queue } {
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
    queue.on('error', throttledErrorReporter(log, 'Job queue error'));
    const redis = new Redis({ ...redisConnection(), lazyConnect: false });
    redis.on('error', throttledErrorReporter(log, 'Redis error'));
    const services = createServices({
        config, log, db, rest, queue,
        http: url => fetch(url),
        fetch: (url, init) => fetch(url, init),
        sessions: redis,
        steamApiKey: requireEnv('STEAM_API_KEY'),
    });
    return { services, queue };
}
