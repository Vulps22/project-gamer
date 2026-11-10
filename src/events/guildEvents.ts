import { Client, Events } from 'discord.js';
import { ensureLfgRole } from '../discord/lfgRole';
import { Services } from '../services';

/** Logs a failed background task. */
function reporter(services: Services): (context: string) => (error: unknown) => void {
    return context => error => services.log.error(`${context}: ${error instanceof Error ? error.message : String(error)}`);
}

/** Server setup and @lfg role tracking. */
export function registerGuildEvents(client: Client, services: Services): void {
    const { servers, log } = services;
    const report = reporter(services);

    client.on(Events.GuildCreate, guild => {
        void (async (): Promise<void> => {
            const server = await servers.ensure(guild.id);
            await ensureLfgRole(guild, server, servers, log);
            log.log(`Joined server ${guild.id}`);
        })().catch(report(`Setting up server ${guild.id}`));
    });

    client.on(Events.GuildDelete, guild => {
        log.log(`Left server ${guild.id}`);
    });

    client.on(Events.GuildRoleDelete, role => {
        void servers.clearLfgRole(role.guild.id, role.id).catch(report(`Forgetting deleted role ${role.id}`));
    });

    client.on(Events.GuildRoleCreate, role => {
        if (role.name.toLowerCase() === 'lfg') {
            void servers.adoptLfgRole(role.guild.id, role.id).catch(report(`Adopting role ${role.id}`));
        }
    });
}
