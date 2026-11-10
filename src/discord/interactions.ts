import { BotCommandInteraction, BotModalInteraction } from '@vulps22/bot-interactions';

/** A command interaction that can hand its token to the worker, so the worker can follow up. */
export class PgCommandInteraction extends BotCommandInteraction {
    get token(): string {
        return this._interaction.token;
    }

    get applicationId(): string {
        return this._interaction.applicationId;
    }
}

/** A modal submission that knows which message's button opened it. */
export class PgModalInteraction extends BotModalInteraction {
    get sourceMessageId(): string | null {
        return this._interaction.isFromMessage() ? this._interaction.message.id : null;
    }
}
