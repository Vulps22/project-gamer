import { Database } from '../database/Database';
import { Server } from '../types/models';

const COLUMNS = 'id, discord_id, lfg_channel_id, lfg_role_id';

export class ServerService {
    constructor(private readonly db: Database) {}

    /** The server's config row, created on first sight. */
    async ensure(guildId: string): Promise<Server> {
        const server = await this.db.get<Server>(
            `INSERT INTO servers.config (discord_id) VALUES ($1)
             ON CONFLICT (discord_id) DO UPDATE SET discord_id = EXCLUDED.discord_id
             RETURNING ${COLUMNS}`,
            [guildId],
        );
        if (!server) {
            throw new Error('Upserting a server returned no row');
        }
        return server;
    }

    async getById(id: string): Promise<Server | null> {
        return this.db.get<Server>(`SELECT ${COLUMNS} FROM servers.config WHERE id = $1`, [id]);
    }

    async setLfgChannel(serverId: string, channelId: string): Promise<void> {
        await this.db.query('UPDATE servers.config SET lfg_channel_id = $2 WHERE id = $1', [serverId, channelId]);
    }

    async setLfgRole(serverId: string, roleId: string | null): Promise<void> {
        await this.db.query('UPDATE servers.config SET lfg_role_id = $2 WHERE id = $1', [serverId, roleId]);
    }

    /** Forgets the server's @lfg role if it is this one. */
    async clearLfgRole(guildId: string, roleId: string): Promise<void> {
        await this.db.query('UPDATE servers.config SET lfg_role_id = NULL WHERE discord_id = $1 AND lfg_role_id = $2', [guildId, roleId]);
    }

    /** Adopts a role as the server's @lfg role, only if it has none. */
    async adoptLfgRole(guildId: string, roleId: string): Promise<void> {
        await this.db.query('UPDATE servers.config SET lfg_role_id = $2 WHERE discord_id = $1 AND lfg_role_id IS NULL', [guildId, roleId]);
    }

    /** Records that the user uses the bot in this server. Sharing defaults on. */
    async ensureMember(serverId: string, userId: string): Promise<void> {
        await this.db.query(
            'INSERT INTO servers.members (server_id, user_id) VALUES ($1, $2) ON CONFLICT (server_id, user_id) DO NOTHING',
            [serverId, userId],
        );
    }

    /** Whether the user shares their library in this server. Members default to sharing. */
    async isSharing(serverId: string, userId: string): Promise<boolean> {
        const row = await this.db.get<{ sharing: boolean }>(
            'SELECT sharing FROM servers.members WHERE server_id = $1 AND user_id = $2',
            [serverId, userId],
        );
        return row?.sharing ?? true;
    }

    /** Sets sharing, and says whether it changed. */
    async setSharing(serverId: string, userId: string, sharing: boolean): Promise<boolean> {
        const changed = await this.db.query(
            `INSERT INTO servers.members (server_id, user_id, sharing) VALUES ($1, $2, $3)
             ON CONFLICT (server_id, user_id) DO UPDATE SET sharing = EXCLUDED.sharing
             WHERE servers.members.sharing IS DISTINCT FROM EXCLUDED.sharing`,
            [serverId, userId, sharing],
        );
        return changed > 0;
    }
}
