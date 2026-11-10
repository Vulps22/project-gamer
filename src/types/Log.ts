import { BaseInteraction } from 'discord.js';

/** What services need from a logger. @vulps22/logger's Logger satisfies it. */
export interface Log {
    /** The log channel: what the bot is doing. */
    log(message: string): void;
    /** The error channel: anything that went wrong. */
    error(message: string): void;
    /** Console only. */
    debug(message: string): void;
    /** The log channel: one line per interaction received, with the user and server. */
    logInteractionReceived(interaction: BaseInteraction, typeLabel?: string): void;
}
