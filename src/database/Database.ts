import { Pool, PoolClient, QueryResultRow } from 'pg';

/** Anything that can run a query: the pool, or a client inside a transaction. */
interface Queryable {
    query<R extends QueryResultRow>(sql: string, params?: unknown[]): Promise<{ rows: R[]; rowCount: number | null }>;
}

/** Thin typed wrapper over pg. No ORM, no query builder: just SQL. */
export class Database {
    constructor(private readonly runner: Queryable, private readonly pool: Pool | null = null) {}

    /** Every row the query returns. */
    async select<R extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<R[]> {
        return (await this.runner.query<R>(sql, params)).rows;
    }

    /** The first row the query returns, or null. */
    async get<R extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<R | null> {
        return (await this.runner.query<R>(sql, params)).rows[0] ?? null;
    }

    /** Runs a statement and returns how many rows it touched. */
    async query(sql: string, params: unknown[] = []): Promise<number> {
        return (await this.runner.query(sql, params)).rowCount ?? 0;
    }

    /** Runs `work` in a transaction, committing if it resolves and rolling back if it throws. */
    async transaction<T>(work: (tx: Database) => Promise<T>): Promise<T> {
        if (!this.pool) {
            throw new Error('Nested transactions are not supported');
        }
        const client: PoolClient = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await work(new Database(client));
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

/** Connects as bot_user, the only role the bot and worker use. */
export function createDatabase(options: { host: string; port: number; database: string; user: string; password: string }): Database {
    const pool = new Pool({ ...options, max: 10 });
    return new Database(pool, pool);
}
