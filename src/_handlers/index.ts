import { join } from 'path';
import { BotButtonInteraction, BotSelectMenuInteraction } from '@vulps22/bot-interactions';
import { PgModalInteraction } from '../discord/interactions';
import { HandlerRegistry } from '../events/HandlerRegistry';
import { config } from './commands/config';
import { help } from './commands/help';
import { lfg } from './commands/lfg';
import { library } from './commands/library';
import { sharing } from './commands/sharing';
import { steam } from './commands/steam';
import { loadComponentHandlers } from './loadComponentHandlers';

export const commands = [config, help, lfg, library, sharing, steam];

/** Every handler. Buttons, selects and modals are loaded from their folders, so adding one is adding a file. */
export function createHandlerRegistry(): HandlerRegistry {
    return new HandlerRegistry(
        commands,
        loadComponentHandlers<BotButtonInteraction>(join(__dirname, 'buttons')),
        loadComponentHandlers<BotSelectMenuInteraction>(join(__dirname, 'selects')),
        loadComponentHandlers<PgModalInteraction>(join(__dirname, 'modals')),
    );
}
