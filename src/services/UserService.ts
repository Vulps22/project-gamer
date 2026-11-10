import { Database } from '../database/Database';
import { Account } from '../types/models';

export class UserService {
    constructor(private readonly db: Database) {}

    /** The user's account, created on first sight. Also marks them as active now. */
    async ensure(discordId: string): Promise<Account> {
        const account = await this.db.get<Account>(
            `INSERT INTO users.accounts (discord_id, last_interaction_at) VALUES ($1, now())
             ON CONFLICT (discord_id) DO UPDATE SET last_interaction_at = now()
             RETURNING id, discord_id`,
            [discordId],
        );
        if (!account) {
            throw new Error('Upserting an account returned no row');
        }
        return account;
    }

    /** Looks a user up without marking them active, for when someone else is asking about them. */
    async findByDiscordId(discordId: string): Promise<Account | null> {
        return this.db.get<Account>('SELECT id, discord_id FROM users.accounts WHERE discord_id = $1', [discordId]);
    }

    async getById(id: string): Promise<Account | null> {
        return this.db.get<Account>('SELECT id, discord_id FROM users.accounts WHERE id = $1', [id]);
    }
}
