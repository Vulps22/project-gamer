import { Guild } from 'discord.js';
import { Log } from '../types/Log';
import { ServerService } from '../services/ServerService';
import { Server } from '../types/models';

const ROLE_NAME = 'lfg';

/**
 * The server's @lfg role ID: the stored one if it still exists, else a role named "lfg",
 * else a new one. Null if the bot can't create roles; LFG still works, without the ping.
 */
export async function ensureLfgRole(guild: Guild, server: Server, servers: ServerService, log: Log): Promise<string | null> {
    if (server.lfg_role_id && guild.roles.cache.has(server.lfg_role_id)) {
        return server.lfg_role_id;
    }
    let role = guild.roles.cache.find(r => r.name.toLowerCase() === ROLE_NAME);
    if (!role) {
        try {
            role = await guild.roles.create({ name: ROLE_NAME, mentionable: true, reason: 'LFGameSync pings this role for open invitations' });
        } catch (error) {
            log.debug(`Could not create the @lfg role in ${guild.id}: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    await servers.setLfgRole(server.id, role.id);
    return role.id;
}
