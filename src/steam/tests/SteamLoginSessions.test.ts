import { SessionStore, SteamLoginSessions } from '../SteamLoginSessions';

function memoryStore(): SessionStore & { ttl: Map<string, number> } {
    const values = new Map<string, string>();
    const ttl = new Map<string, number>();
    return {
        ttl,
        set: (key, value, _mode, seconds) => { values.set(key, value); ttl.set(key, seconds); return Promise.resolve('OK'); },
        getdel: key => { const value = values.get(key) ?? null; values.delete(key); return Promise.resolve(value); },
    };
}

const session = { discordUserId: '111', applicationId: 'app', interactionToken: 'tok' };

describe('SteamLoginSessions', () => {
    it('hands back the session for its state token once, then never again', async () => {
        const sessions = new SteamLoginSessions(memoryStore());
        const state = await sessions.create(session);
        expect(state).toMatch(/^[0-9a-f]{64}$/);
        await expect(sessions.consume(state)).resolves.toEqual(session);
        await expect(sessions.consume(state)).resolves.toBeNull();
    });

    it('expires sessions after 15 minutes', async () => {
        const store = memoryStore();
        await new SteamLoginSessions(store).create(session);
        expect([...store.ttl.values()]).toEqual([900]);
    });

    it('ignores a malformed state without touching Redis', async () => {
        const store = memoryStore();
        const getdel = jest.spyOn(store, 'getdel');
        await expect(new SteamLoginSessions(store).consume('../../etc')).resolves.toBeNull();
        expect(getdel).not.toHaveBeenCalled();
    });
});
