import { randomBytes } from 'node:crypto';

/** The few Redis commands the sessions use. ioredis satisfies it. */
export interface SessionStore {
    set(key: string, value: string, mode: 'EX', seconds: number): Promise<unknown>;
    getdel(key: string): Promise<string | null>;
}

/** Who started a Steam login, and the reply to update when it finishes. */
export interface SteamLoginSession {
    discordUserId: string;
    /** The /steam connect reply, editable for 15 minutes. */
    applicationId: string;
    interactionToken: string;
}

/** As long as the interaction token it carries stays valid. */
const TTL_SECONDS = 15 * 60;
const PREFIX = 'pg:steam-login:';

/**
 * One-time state tokens tying a Steam login back to the Discord user who started it. Kept in Redis, so
 * they expire by themselves and any process can read them: the shard creates one, the main process's
 * callback route uses it up.
 */
export class SteamLoginSessions {
    constructor(private readonly store: SessionStore) {}

    async create(session: SteamLoginSession): Promise<string> {
        const state = randomBytes(32).toString('hex');
        await this.store.set(PREFIX + state, JSON.stringify(session), 'EX', TTL_SECONDS);
        return state;
    }

    /** The session for a state token, removed as it's read so it can't be replayed. Null if unknown or expired. */
    async consume(state: string): Promise<SteamLoginSession | null> {
        if (!/^[0-9a-f]{64}$/.test(state)) {
            return null;
        }
        const raw = await this.store.getdel(PREFIX + state);
        return raw ? JSON.parse(raw) as SteamLoginSession : null;
    }
}
