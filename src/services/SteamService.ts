import { randomUUID } from 'node:crypto';
import { Database } from '../database/Database';
import { SteamApi, steamCoverArt, steamStoreUrl } from '../steam/SteamApi';

export interface SteamLink {
    user_id: string;
    steam_id: string;
    last_synced: Date | null;
}

export type SyncResult =
    | { status: 'synced'; owned: number; newToCatalogue: number; addedToLibrary: number }
    | { status: 'private' }
    | { status: 'not_linked' };

/** Steam account links (users.steam_links) and library sync. */
export class SteamService {
    constructor(private readonly db: Database, private readonly api: SteamApi) {}

    async getLink(userId: string): Promise<SteamLink | null> {
        return this.db.get<SteamLink>('SELECT user_id, steam_id, last_synced FROM users.steam_links WHERE user_id = $1', [userId]);
    }

    /** Links a Steam account, replacing any earlier one. A new account hasn't been synced yet. */
    async link(userId: string, steamId: string): Promise<void> {
        await this.db.query(
            `INSERT INTO users.steam_links (user_id, steam_id) VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE SET steam_id = EXCLUDED.steam_id,
               last_synced = CASE WHEN users.steam_links.steam_id = EXCLUDED.steam_id THEN users.steam_links.last_synced END`,
            [userId, steamId],
        );
    }

    /** Stops syncing. Games already in the library stay there. Says whether there was a link. */
    async unlink(userId: string): Promise<boolean> {
        return (await this.db.query('DELETE FROM users.steam_links WHERE user_id = $1', [userId])) > 0;
    }

    /** Linked users not synced in the last `hours`, oldest first, for auto-sync. */
    async dueForSync(hours: number, limit: number): Promise<{ user_id: string; discord_id: string }[]> {
        return this.db.select(
            `SELECT l.user_id, a.discord_id FROM users.steam_links l JOIN users.accounts a ON a.id = l.user_id
             WHERE l.last_synced IS NULL OR l.last_synced < now() - make_interval(hours => $1)
             ORDER BY l.last_synced NULLS FIRST LIMIT $2`,
            [hours, limit],
        );
    }

    /**
     * Adds every game the user owns on Steam to their library. Games the catalogue doesn't have yet are
     * added from Steam's own data (name and art), so a sync needs one Steam call, not one per game.
     */
    async sync(userId: string): Promise<SyncResult> {
        const link = await this.getLink(userId);
        if (!link) {
            return { status: 'not_linked' };
        }
        const owned = await this.api.ownedGames(link.steam_id);
        if (owned === null) {
            return { status: 'private' };
        }
        const games = [...new Map(owned.map(game => [game.appId, game])).values()];

        return this.db.transaction(async tx => {
            // Two syncs adding the same new game at once would otherwise both create it.
            await tx.query('SELECT pg_advisory_xact_lock(hashtext(\'pg:steam-catalogue\'))');
            const store = await tx.get<{ id: string }>('SELECT id FROM store.stores WHERE scraper = \'steam\' LIMIT 1');
            if (!store) {
                throw new Error('No Steam store in store.stores');
            }

            const known = await tx.select<{ game_id: string; store_game_id: string }>(
                'SELECT game_id, store_game_id FROM games.store_entries WHERE store_id = $1 AND store_game_id = ANY($2::text[])',
                [store.id, games.map(game => game.appId)],
            );
            const knownAppIds = new Set(known.map(entry => entry.store_game_id));
            const fresh = games.filter(game => !knownAppIds.has(game.appId)).map(game => ({ ...game, id: randomUUID() }));

            if (fresh.length > 0) {
                await tx.query(
                    'INSERT INTO games.catalogue (id, name, cover_art) SELECT * FROM unnest($1::uuid[], $2::text[], $3::text[])',
                    [fresh.map(game => game.id), fresh.map(game => game.name), fresh.map(game => steamCoverArt(game.appId))],
                );
                await tx.query(
                    `INSERT INTO games.store_entries (game_id, store_id, store_game_id, url)
                     SELECT game_id, $2, app_id, url FROM unnest($1::uuid[], $3::text[], $4::text[]) AS t(game_id, app_id, url)`,
                    [fresh.map(game => game.id), store.id, fresh.map(game => game.appId), fresh.map(game => steamStoreUrl(game.appId))],
                );
            }

            const addedToLibrary = await tx.query(
                `INSERT INTO users.game_library (user_id, game_id, source)
                 SELECT $1, game_id, 'steam_sync' FROM unnest($2::uuid[]) AS t(game_id)
                 ON CONFLICT (user_id, game_id) DO NOTHING`,
                [userId, [...known.map(entry => entry.game_id), ...fresh.map(game => game.id)]],
            );
            await tx.query('UPDATE users.steam_links SET last_synced = now() WHERE user_id = $1', [userId]);
            return { status: 'synced', owned: games.length, newToCatalogue: fresh.length, addedToLibrary };
        });
    }
}
