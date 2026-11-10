import { Database } from '../database/Database';
import { LfgPost } from '../types/models';

const COLUMNS = 'id, server_id, posted_by, game_id, type, vc_channel_id, message_id, status';

export interface NewLfgPost {
    serverId: string;
    postedBy: string;
    gameId: string;
    /** Account IDs of the players picked directly. Empty for an open invitation. */
    invitees: string[];
}

/** Everything needed to draw an LFG post. */
export interface LfgPostDetails {
    post: LfgPost;
    gameName: string;
    coverArt: string | null;
    posterDiscordId: string;
    inviteeDiscordIds: string[];
    interestedDiscordIds: string[];
    lfgChannelId: string | null;
    lfgRoleId: string | null;
}

export class LfgService {
    constructor(private readonly db: Database) {}

    /** Creates an immediate post with its invitees. */
    async createImmediate(post: NewLfgPost): Promise<LfgPost> {
        return this.db.transaction(async tx => {
            const created = await tx.get<LfgPost>(
                `INSERT INTO lfg.posts (server_id, posted_by, game_id, type) VALUES ($1, $2, $3, 'immediate') RETURNING ${COLUMNS}`,
                [post.serverId, post.postedBy, post.gameId],
            );
            if (!created) {
                throw new Error('Inserting an LFG post returned no row');
            }
            if (post.invitees.length > 0) {
                await tx.query(
                    'INSERT INTO lfg.invitees (post_id, user_id) SELECT $1, unnest($2::uuid[]) ON CONFLICT DO NOTHING',
                    [created.id, post.invitees],
                );
            }
            return created;
        });
    }

    async getById(id: string): Promise<LfgPost | null> {
        return this.db.get<LfgPost>(`SELECT ${COLUMNS} FROM lfg.posts WHERE id = $1`, [id]);
    }

    async findActiveByVc(channelId: string): Promise<LfgPost | null> {
        return this.db.get<LfgPost>(`SELECT ${COLUMNS} FROM lfg.posts WHERE vc_channel_id = $1 AND status = 'active'`, [channelId]);
    }

    async setMessage(postId: string, messageId: string): Promise<void> {
        await this.db.query('UPDATE lfg.posts SET message_id = $2 WHERE id = $1', [postId, messageId]);
    }

    async setVc(postId: string, channelId: string): Promise<void> {
        await this.db.query('UPDATE lfg.posts SET vc_channel_id = $2 WHERE id = $1', [postId, channelId]);
    }

    /** Marks an active post expired. Says whether it was active, so only one caller closes it. */
    async expire(postId: string): Promise<boolean> {
        return (await this.db.query(`UPDATE lfg.posts SET status = 'expired' WHERE id = $1 AND status = 'active'`, [postId])) > 0;
    }

    /** Says whether the user was newly added. */
    async addInterested(postId: string, userId: string): Promise<boolean> {
        return (await this.db.query('INSERT INTO lfg.interested (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [postId, userId])) > 0;
    }

    /** Says whether the user was there to remove. */
    async removeInterested(postId: string, userId: string): Promise<boolean> {
        return (await this.db.query('DELETE FROM lfg.interested WHERE post_id = $1 AND user_id = $2', [postId, userId])) > 0;
    }

    async details(postId: string): Promise<LfgPostDetails | null> {
        const post = await this.getById(postId);
        if (!post) {
            return null;
        }
        const [header, invitees, interested] = await Promise.all([
            this.db.get<{ name: string; cover_art: string | null; discord_id: string; lfg_channel_id: string | null; lfg_role_id: string | null }>(
                `SELECT g.name, g.cover_art, a.discord_id, s.lfg_channel_id, s.lfg_role_id FROM lfg.posts p
                 JOIN games.catalogue g ON g.id = p.game_id
                 JOIN users.accounts a ON a.id = p.posted_by
                 JOIN servers.config s ON s.id = p.server_id
                 WHERE p.id = $1`,
                [postId],
            ),
            this.discordIds('invitees', postId),
            this.discordIds('interested', postId),
        ]);
        if (!header) {
            return null;
        }
        return {
            post,
            gameName: header.name,
            coverArt: header.cover_art,
            posterDiscordId: header.discord_id,
            inviteeDiscordIds: invitees,
            interestedDiscordIds: interested,
            lfgChannelId: header.lfg_channel_id,
            lfgRoleId: header.lfg_role_id,
        };
    }

    private async discordIds(table: 'invitees' | 'interested', postId: string): Promise<string[]> {
        const rows = await this.db.select<{ discord_id: string }>(
            `SELECT a.discord_id FROM lfg.${table} t JOIN users.accounts a ON a.id = t.user_id
             WHERE t.post_id = $1 ORDER BY t.created_at`,
            [postId],
        );
        return rows.map(row => row.discord_id);
    }
}
