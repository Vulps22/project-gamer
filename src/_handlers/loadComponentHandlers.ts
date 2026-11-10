import { readdirSync } from 'fs';
import { join } from 'path';
import { Handler } from '../types/Handler';

/** Compiled handlers, or the TypeScript sources when tests run them directly. Never tests or declarations. */
const HANDLER_FILE = /^(?!.*\.(test|d)\.[jt]s$).*\.[jt]s$/;

/**
 * Loads every component handler under a folder, as PE does: each file default-exports one handler, its folders
 * are the custom ID's prefix and the handler's name is the action. buttons/lfg/interested.ts → `lfg_interested`.
 * Returns the handlers keyed by that ID. Two handlers with the same ID is a startup error.
 */
export function loadComponentHandlers<T>(dir: string, prefix: string[] = [], into = new Map<string, Handler<T>>()): Map<string, Handler<T>> {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (entry.name !== 'tests') {
                loadComponentHandlers(join(dir, entry.name), [...prefix, entry.name], into);
            }
            continue;
        }
        if (!entry.isFile() || !HANDLER_FILE.test(entry.name)) {
            continue;
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const handler = (require(join(dir, entry.name)) as { default?: Handler<T> }).default;
        if (!handler) {
            throw new Error(`${join(dir, entry.name)} has no default-exported handler`);
        }
        const id = [...prefix, handler.name].join('_');
        if (into.has(id)) {
            throw new Error(`Two handlers answer ${id}`);
        }
        into.set(id, handler);
    }
    return into;
}
