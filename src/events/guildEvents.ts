import { Client, Events } from 'discord.js';
import { ensureLfgRole } from '../discord/lfgRole';
import { describeError } from '../errors';
import { Services } from '../services';

/** Server setup and @lfg role tracking. */
export function registerGuildEvents(client: Client, services: Services): void {
    const { servers, log } = services;
    const report = (context: string) => (error: unknown): void => log.error(`${context}\n${describeError(error)}`);

    client.on(Events.GuildCreate, guild => {
        log.log(`Joined server ${guild.name} (${guild.id}), ${guild.memberCount} members. This shard is now in ${client.guilds.cache.size} server(s)`);
        void (async (): Promise<void> => {
            const server = await servers.ensure(guild.id);
            const roleId = await ensureLfgRole(guild, server, servers, log);
            log.log(`Set up server ${guild.name} (${guild.id}): @lfg role ${roleId ?? 'not available'}`);
        })().catch(report(`Setting up server ${guild.name} (${guild.id})`));
    });

    client.on(Events.GuildDelete, guild => {
        log.log(`Left server ${guild.name ?? 'unknown'} (${guild.id}). This shard is now in ${client.guilds.cache.size} server(s)`);
    });

    client.on(Events.GuildRoleDelete, role => {
        void servers.clearLfgRole(role.guild.id, role.id)
            .then(() => log.debug(`Role ${role.name} (${role.id}) deleted in server ${role.guild.id}`))
            .catch(report(`Forgetting deleted role ${role.id} in server ${role.guild.id}`));
    });

    client.on(Events.GuildRoleCreate, role => {
        if (role.name.toLowerCase() === 'lfg') {
            void servers.adoptLfgRole(role.guild.id, role.id)
                .then(() => log.log(`Adopted new @lfg role ${role.id} in server ${role.guild.name} (${role.guild.id})`))
                .catch(report(`Adopting role ${role.id} in server ${role.guild.id}`));
        }
    });
}
