import { Database } from '../database/Database';
import { UserFacingError } from '../errors';
import { Game, Submission } from '../types/models';
import { GameService, NewGame } from './GameService';
import { LibraryService } from './LibraryService';

const COLUMNS = 'id, submitted_by, url, store_id, status';

/** The submissions table. Every write runs in the caller's transaction: see ReviewQueue. */
export class SubmissionService {
    constructor(
        private readonly db: Database,
        private readonly games: GameService,
        private readonly library: LibraryService,
    ) {}

    async createIn(tx: Database, userId: string, url: string, storeId: string | null): Promise<Submission> {
        const submission = await tx.get<Submission>(
            `INSERT INTO games.submissions (submitted_by, url, store_id) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
            [userId, url, storeId],
        );
        if (!submission) {
            throw new Error('Inserting a submission returned no row');
        }
        return submission;
    }

    async getById(id: string): Promise<Submission | null> {
        return this.db.get<Submission>(`SELECT ${COLUMNS} FROM games.submissions WHERE id = $1`, [id]);
    }

    /** Adds the game to the catalogue and to the submitter's library, and marks the submission approved. */
    async approveIn(tx: Database, id: string, game: Omit<NewGame, 'url'>): Promise<{ submission: Submission; game: Game }> {
        const submission = await this.review(tx, id, 'approved');
        const created = await this.games.createIn(tx, { ...game, url: submission.url });
        await tx.query('UPDATE games.submissions SET result_game_id = $2 WHERE id = $1', [id, created.id]);
        await this.library.add(submission.submitted_by, created.id, 'manual', tx);
        return { submission, game: created };
    }

    async rejectIn(tx: Database, id: string): Promise<Submission> {
        return this.review(tx, id, 'rejected');
    }

    /** Moves a pending submission to its final status. Refuses one that was already reviewed. */
    private async review(tx: Database, id: string, status: 'approved' | 'rejected'): Promise<Submission> {
        const submission = await tx.get<Submission>(
            `UPDATE games.submissions SET status = $2, reviewed_at = now()
             WHERE id = $1 AND status = 'pending' RETURNING ${COLUMNS}`,
            [id, status],
        );
        if (!submission) {
            throw new UserFacingError('That submission has already been reviewed.');
        }
        return submission;
    }
}
