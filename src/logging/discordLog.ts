import { BaseInteraction } from 'discord.js';
import { Logger } from '@vulps22/logger';
import { describeError } from '../errors';
import { Log } from '../types/Log';

/** Discord rejects a message over 2000 characters, and the logger doesn't trim, so the line would be lost. */
const MAX_LENGTH = 1900;

export function clip(message: string): string {
    return message.length <= MAX_LENGTH ? message : `${message.slice(0, MAX_LENGTH)}\n… (${message.length - MAX_LENGTH} more characters)`;
}

/**
 * The shared logger, sending to the log and error channels through their webhooks
 * (DISCORD_LOG_WEBHOOK_URL, DISCORD_ERROR_WEBHOOK_URL). Every call is fire-and-forget.
 */
export function createDiscordLog(): Log {
    Logger.initialize();
    return {
        log: message => Logger.log(clip(message)),
        error: message => Logger.error(clip(message)),
        debug: message => Logger.debug(message),
        logInteractionReceived: (interaction: BaseInteraction, typeLabel?: string) => Logger.logInteractionReceived(interaction, typeLabel),
    };
}

/** Sends crashes to the error channel. An uncaught exception still ends the process, after giving the log a moment to send. */
export function reportProcessErrors(log: Log, processName: string): void {
    process.on('unhandledRejection', reason => log.error(`${processName}: unhandled rejection\n${describeError(reason)}`));
    process.on('uncaughtException', error => {
        log.error(`${processName}: uncaught exception, exiting\n${describeError(error)}`);
        setTimeout(() => process.exit(1), 2000);
    });
}

/**
 * Reports an error at most once per window per message. For sources that repeat the same error on every
 * retry, such as a Redis connection that's down, so they can't flood the error channel.
 */
export function throttledErrorReporter(log: Log, context: string, windowMs = 60_000): (error: unknown) => void {
    const lastSent = new Map<string, number>();
    return error => {
        const key = error instanceof Error ? error.message : String(error);
        const now = Date.now();
        if (now - (lastSent.get(key) ?? -Infinity) < windowMs) {
            return;
        }
        lastSent.set(key, now);
        log.error(`${context} (repeats are muted for ${windowMs / 1000}s)\n${describeError(error)}`);
    };
}
