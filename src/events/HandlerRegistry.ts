import { BotButtonInteraction, BotSelectMenuInteraction } from '@vulps22/bot-interactions';
import { PgModalInteraction } from '../discord/interactions';
import { CommandHandler, Handler } from '../types/Handler';

/** Handlers by command name or component baseId. */
export class HandlerRegistry {
    readonly commands: ReadonlyMap<string, CommandHandler>;
    readonly buttons: ReadonlyMap<string, Handler<BotButtonInteraction>>;
    readonly selects: ReadonlyMap<string, Handler<BotSelectMenuInteraction>>;
    readonly modals: ReadonlyMap<string, Handler<PgModalInteraction>>;

    constructor(handlers: {
        commands: CommandHandler[];
        buttons: Handler<BotButtonInteraction>[];
        selects: Handler<BotSelectMenuInteraction>[];
        modals: Handler<PgModalInteraction>[];
    }) {
        this.commands = byName(handlers.commands);
        this.buttons = byName(handlers.buttons);
        this.selects = byName(handlers.selects);
        this.modals = byName(handlers.modals);
    }
}

function byName<T extends { name: string }>(handlers: T[]): ReadonlyMap<string, T> {
    const map = new Map<string, T>();
    for (const handler of handlers) {
        if (map.has(handler.name)) {
            throw new Error(`Two handlers are registered as ${handler.name}`);
        }
        map.set(handler.name, handler);
    }
    return map;
}
