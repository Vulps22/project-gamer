import { Pool } from 'pg';
import { Database } from '../Database';

function fakePool() {
    const client = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: jest.fn() };
    const pool = { query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }], rowCount: 2 }), connect: jest.fn().mockResolvedValue(client) };
    return { client, pool, db: new Database(pool, pool as unknown as Pool) };
}

describe('Database', () => {
    it('returns rows, the first row, or the row count', async () => {
        const { db } = fakePool();
        await expect(db.select('SELECT')).resolves.toEqual([{ id: 1 }, { id: 2 }]);
        await expect(db.get('SELECT')).resolves.toEqual({ id: 1 });
        await expect(db.query('UPDATE')).resolves.toBe(2);
    });

    it('commits a transaction that succeeds', async () => {
        const { client, db } = fakePool();
        await expect(db.transaction(() => Promise.resolve('done'))).resolves.toBe('done');
        expect(client.query.mock.calls.map(call => call[0])).toEqual(['BEGIN', 'COMMIT']);
        expect(client.release).toHaveBeenCalled();
    });

    it('rolls back a transaction that throws', async () => {
        const { client, db } = fakePool();
        await expect(db.transaction(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
        expect(client.query.mock.calls.map(call => call[0])).toEqual(['BEGIN', 'ROLLBACK']);
        expect(client.release).toHaveBeenCalled();
    });

    it('refuses to nest transactions', async () => {
        const { db } = fakePool();
        await expect(db.transaction(tx => tx.transaction(() => Promise.resolve()))).rejects.toThrow('Nested');
    });
});
