import { Database } from '../database/Database';
import { UserFacingError } from '../errors';
import { Game, Store, StoreLink } from '../types/models';

export interface NewGame {
    name: string;
    coverArt: string | null;
    storeId: string;
    storeGameId: string;
    url: string;
}

const AUTOCOMPLETE_LIMIT = 25;
const STORE_COLUMNS = 'id, name, slug, base_url, scraper';

export class GameService {
    constructor(private readonly db: Database) {}

    async getById(id: string): Promise<Game | null> {
        return this.db.get<Game>('SELECT id, name, cover_art FROM games.catalogue WHERE id = $1', [id]);
    }

    /** Catalogue games whose name contains the search, for autocomplete. */
    async search(search: string): Promise<Game[]> {
        return this.db.select<Game>(
            `SELECT id, name, cover_art FROM games.catalogue
             WHERE name ILIKE '%' || $1 || '%' ORDER BY lower(name) LIMIT ${AUTOCOMPLETE_LIMIT}`,
            [escapeLike(search)],
        );
    }

    async storeLinks(gameId: string): Promise<StoreLink[]> {
        return this.db.select<StoreLink>(
            `SELECT s.name AS store_name, e.url FROM games.store_entries e
             JOIN store.stores s ON s.id = e.store_id WHERE e.game_id = $1 ORDER BY s.name`,
            [gameId],
        );
    }

    async stores(): Promise<Store[]> {
        return this.db.select<Store>(`SELECT ${STORE_COLUMNS} FROM store.stores ORDER BY name`);
    }

    /**
     * The store an admin named, or a new one. Matches the name or short code, ignoring case. A new store
     * takes the submitted page's site as its web address, unless another store already has that site,
     * so later links from it are recognised. Runs in the caller's transaction.
     */
    async findOrCreateStoreIn(tx: Database, name: string, pageUrl: URL): Promise<{ store: Store; created: boolean }> {
        const slug = slugify(name);
        const existing = await findStoreByName(tx, name, slug);
        if (existing) {
            return { store: existing, created: false };
        }
        if (!slug) {
            throw new UserFacingError('Give the store a name with at least one letter or number.');
        }
        const siteTaken = await this.storeForUrl(pageUrl) !== null;
        const created = await tx.get<Store>(
            `INSERT INTO store.stores (name, slug, base_url) VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING RETURNING ${STORE_COLUMNS}`,
            [name, slug, siteTaken ? null : pageUrl.origin],
        );
        if (created) {
            return { store: created, created: true };
        }
        // Someone else created it at the same moment.
        const raced = await findStoreByName(tx, name, slug);
        if (!raced) {
            throw new Error(`Store "${name}" neither inserted nor found`);
        }
        return { store: raced, created: false };
    }

    /** The known store a URL belongs to, matched on host, or null. */
    async storeForUrl(url: URL): Promise<Store | null> {
        const host = stripWww(url.hostname);
        return (await this.stores()).find(store => store.base_url !== null && stripWww(new URL(store.base_url).hostname) === host) ?? null;
    }

    async findByStoreEntry(storeId: string, storeGameId: string): Promise<Game | null> {
        return findByStoreEntry(this.db, storeId, storeGameId);
    }

    /** Adds a game to the catalogue with its first store entry, or returns the game that entry already belongs to. */
    async create(game: NewGame): Promise<Game> {
        return this.db.transaction(tx => this.createIn(tx, game));
    }

    /** As create(), inside the caller's transaction. */
    async createIn(tx: Database, game: NewGame): Promise<Game> {
        const existing = await findByStoreEntry(tx, game.storeId, game.storeGameId);
        if (existing) {
            return existing;
        }
        const created = await tx.get<Game>(
            'INSERT INTO games.catalogue (name, cover_art) VALUES ($1, $2) RETURNING id, name, cover_art',
            [game.name, game.coverArt],
        );
        if (!created) {
            throw new Error('Inserting a game returned no row');
        }
        await tx.query(
            'INSERT INTO games.store_entries (game_id, store_id, store_game_id, url) VALUES ($1, $2, $3, $4)',
            [created.id, game.storeId, game.storeGameId, game.url],
        );
        return created;
    }
}

function findStoreByName(db: Database, name: string, slug: string): Promise<Store | null> {
    return db.get<Store>(
        `SELECT ${STORE_COLUMNS} FROM store.stores WHERE lower(name) = lower($1) OR slug = lower($1) OR slug = $2 LIMIT 1`,
        [name, slug],
    );
}

/** A store's short code: "Robert Space Industries" → "robert-space-industries". */
export function slugify(name: string): string {
    return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function findByStoreEntry(db: Database, storeId: string, storeGameId: string): Promise<Game | null> {
    return db.get<Game>(
        `SELECT g.id, g.name, g.cover_art FROM games.catalogue g
         JOIN games.store_entries e ON e.game_id = g.id
         WHERE e.store_id = $1 AND e.store_game_id = $2`,
        [storeId, storeGameId],
    );
}

function stripWww(host: string): string {
    return host.toLowerCase().replace(/^www\./, '');
}

/** Escapes LIKE wildcards so a search is matched literally. */
export function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, char => `\\${char}`);
}
