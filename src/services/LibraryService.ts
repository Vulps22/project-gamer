import { Database } from '../database/Database';
import { escapeLike } from './GameService';
import { Game } from '../types/models';

export type LibrarySource = 'manual' | 'steam_sync';

const AUTOCOMPLETE_LIMIT = 25;

export class LibraryService {
    constructor(private readonly db: Database) {}

    /** Adds a game to the user's library. Says whether it was new. Pass `tx` to run inside a transaction. */
    async add(userId: string, gameId: string, source: LibrarySource, tx: Database = this.db): Promise<boolean> {
        const added = await tx.query(
            `INSERT INTO users.game_library (user_id, game_id, source) VALUES ($1, $2, $3)
             ON CONFLICT (user_id, game_id) DO NOTHING`,
            [userId, gameId, source],
        );
        return added > 0;
    }

    /** Removes a game from the user's library. Says whether it was there. */
    async remove(userId: string, gameId: string): Promise<boolean> {
        return (await this.db.query('DELETE FROM users.game_library WHERE user_id = $1 AND game_id = $2', [userId, gameId])) > 0;
    }

    async count(userId: string): Promise<number> {
        const row = await this.db.get<{ count: string }>('SELECT count(*) FROM users.game_library WHERE user_id = $1', [userId]);
        return Number(row?.count ?? 0);
    }

    /** Games in the user's library, by name. With a search, only those whose name contains it, for autocomplete. */
    async list(userId: string, search?: string): Promise<Game[]> {
        const params: unknown[] = [userId];
        let filter = '';
        if (search !== undefined) {
            params.push(escapeLike(search));
            filter = `AND g.name ILIKE '%' || $2 || '%'`;
        }
        return this.db.select<Game>(
            `SELECT g.id, g.name, g.cover_art FROM users.game_library l
             JOIN games.catalogue g ON g.id = l.game_id
             WHERE l.user_id = $1 ${filter} ORDER BY lower(g.name)
             ${search !== undefined ? `LIMIT ${AUTOCOMPLETE_LIMIT}` : ''}`,
            params,
        );
    }

    async owns(userId: string, gameId: string): Promise<boolean> {
        return (await this.db.get('SELECT 1 FROM users.game_library WHERE user_id = $1 AND game_id = $2', [userId, gameId])) !== null;
    }

    /** How many of this server's members own the game, and how many users in all: the counts on a game card. */
    async ownerCounts(serverId: string, gameId: string): Promise<{ community: number; global: number }> {
        const row = await this.db.get<{ community: number; global: number }>(
            `SELECT
               (SELECT count(*)::int FROM servers.members m JOIN users.game_library l ON l.user_id = m.user_id
                 WHERE m.server_id = $1 AND l.game_id = $2) AS community,
               (SELECT count(*)::int FROM users.game_library WHERE game_id = $2) AS global`,
            [serverId, gameId],
        );
        return { community: row?.community ?? 0, global: row?.global ?? 0 };
    }

    /** Discord IDs of the server's members who own the game and share their library there. */
    async sharingOwners(serverId: string, gameId: string): Promise<string[]> {
        const rows = await this.db.select<{ discord_id: string }>(
            `SELECT a.discord_id FROM servers.members m
             JOIN users.game_library l ON l.user_id = m.user_id AND l.game_id = $2
             JOIN users.accounts a ON a.id = m.user_id
             WHERE m.server_id = $1 AND m.sharing
             ORDER BY a.last_interaction_at DESC NULLS LAST`,
            [serverId, gameId],
        );
        return rows.map(row => row.discord_id);
    }
}
