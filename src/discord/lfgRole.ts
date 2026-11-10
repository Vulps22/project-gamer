import { Guild } from 'discord.js';
import { describeError } from '../errors';
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
            log.error(`Couldn't create the @lfg role in server ${guild.name} (${guild.id}). LFG works without the ping.\n${describeError(error)}`);
            return null;
        }
        log.log(`Created the @lfg role in server ${guild.name} (${guild.id})`);
    }
    await servers.setLfgRole(server.id, role.id);
    return role.id;
}
