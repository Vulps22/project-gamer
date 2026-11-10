import { DiscordAPIError } from 'discord.js';
import { UserFacingError } from '../../errors';

/** Discord's error code for an action the bot lacks permission for. */
const MISSING_PERMISSIONS = 50013;
const MISSING_ACCESS = 50001;

/** Runs a Discord action, turning a permissions failure into a message the server's admins can act on. */
export async function needsPermission<T>(permission: string, action: () => Promise<T>): Promise<T> {
    try {
        return await action();
    } catch (error) {
        if (error instanceof DiscordAPIError && (error.code === MISSING_PERMISSIONS || error.code === MISSING_ACCESS)) {
            throw new UserFacingError(`I need the **${permission}** permission for that. Ask a server admin to grant it.`);
        }
        throw error;
    }
}
