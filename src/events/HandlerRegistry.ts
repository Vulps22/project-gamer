import { BotButtonInteraction, BotSelectMenuInteraction } from '@vulps22/bot-interactions';
import { PgModalInteraction } from '../discord/interactions';
import { CommandHandler, Handler } from '../types/Handler';

/** Handlers by command name, or by component custom ID (`prefix_action`). */
export class HandlerRegistry {
    readonly commands: ReadonlyMap<string, CommandHandler>;

    constructor(
        commands: CommandHandler[],
        readonly buttons: ReadonlyMap<string, Handler<BotButtonInteraction>>,
        readonly selects: ReadonlyMap<string, Handler<BotSelectMenuInteraction>>,
        readonly modals: ReadonlyMap<string, Handler<PgModalInteraction>>,
    ) {
        const byName = new Map<string, CommandHandler>();
        for (const command of commands) {
            if (byName.has(command.name)) {
                throw new Error(`Two commands are named ${command.name}`);
            }
            byName.set(command.name, command);
        }
        this.commands = byName;
    }
}
