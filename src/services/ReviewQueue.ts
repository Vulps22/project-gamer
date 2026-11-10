import { Database } from '../database/Database';
import { DiscordApi } from '../discord/DiscordApi';
import { CustomIdFactory } from '../discord/customIds';
import { describeError, UserFacingError } from '../errors';
import { ScraperRegistry } from '../scrapers/Scraper';
import { Game, Store, Submission } from '../types/models';
import { Log } from '../types/Log';
import { MessageView } from '../views/MessageView';
import { submissionView } from '../views/submissionViews';
import { GameService } from './GameService';
import { SubmissionService } from './SubmissionService';
import { UserService } from './UserService';

/** Where review cards live. Swappable, so the cards can move (to a webhook, say) without touching the queue. */
export interface ReviewCards {
    post(view: MessageView): Promise<string>;
    edit(messageId: string, view: MessageView): Promise<void>;
    remove(messageId: string): Promise<void>;
}

/** Review cards in the admin server's new-games channel, sent by the bot over REST (so any shard or the worker can). */
export class ChannelReviewCards implements ReviewCards {
    constructor(private readonly discord: DiscordApi, private readonly channelId: string) {}

    post(view: MessageView): Promise<string> {
        return this.discord.send(this.channelId, view);
    }

    edit(messageId: string, view: MessageView): Promise<void> {
        return this.discord.edit(this.channelId, messageId, view);
    }

    remove(messageId: string): Promise<void> {
        return this.discord.deleteMessage(this.channelId, messageId);
    }
}

export interface NewSubmission {
    userId: string;
    submitterDiscordId: string;
    url: string;
    storeId: string | null;
    /** Builds the card's Approve / Reject buttons, carrying the submitter's flow. */
    ids: CustomIdFactory;
}

export interface Approval {
    submissionId: string;
    cardMessageId: string;
    reviewerDiscordId: string;
    gameName: string;
    /** As the admin typed it: a store's name or short code, or the name of a new store. */
    storeName: string;
    coverArt: string | null;
    /** Rebuilds the pending card's buttons, should the approval have to be undone. */
    ids: CustomIdFactory;
}

export interface Rejection {
    submissionId: string;
    cardMessageId: string;
    reviewerDiscordId: string;
    ids: CustomIdFactory;
}

/**
 * Games the bot can't add by itself, waiting for an admin. Every step is all-or-nothing: the database
 * change commits only once the review card has been posted or updated. If the card fails, nothing is
 * saved; if saving fails after the card changed, the card is put back.
 */
export class ReviewQueue {
    constructor(
        private readonly db: Database,
        private readonly submissions: SubmissionService,
        private readonly games: GameService,
        private readonly users: UserService,
        private readonly scrapers: ScraperRegistry,
        private readonly cards: ReviewCards,
        private readonly log: Log,
    ) {}

    /** Saves a submission and posts its card. Throws a UserFacingError, having saved nothing, if either fails. */
    async submit(entry: NewSubmission): Promise<Submission> {
        const posted: { id?: string } = {};
        try {
            const submission = await this.db.transaction(async tx => {
                const created = await this.submissions.createIn(tx, entry.userId, entry.url, entry.storeId);
                const storeName = await this.storeName(created.store_id);
                posted.id = await this.cards.post(submissionView(created, entry.submitterDiscordId, storeName, { status: 'pending', ids: entry.ids }));
                return created;
            });
            this.log.log(`Submission ${submission.id} from ${entry.submitterDiscordId} queued for review: ${entry.url}`);
            return submission;
        } catch (error) {
            if (posted.id) {
                await this.retract(posted.id);
            }
            this.log.error(`Couldn't submit ${entry.url} for ${entry.submitterDiscordId}. Nothing was saved.\n${describeError(error)}`);
            throw new UserFacingError('I couldn\'t send that to our team just now, so nothing was saved. Please try again in a few minutes.');
        }
    }

    /** Approves a submission, creating its store if it's new, and updates its card. Returns what the reviewer and submitter need to hear. */
    async approve(approval: Approval): Promise<{ submission: Submission; game: Game; store: Store; storeCreated: boolean; submitterDiscordId: string }> {
        return this.reviewed(approval, async tx => {
            const pending = await this.pending(approval.submissionId);
            const url = new URL(pending.url);
            const { store, created } = await this.games.findOrCreateStoreIn(tx, approval.storeName, url);
            const { submission, game } = await this.submissions.approveIn(tx, approval.submissionId, {
                name: approval.gameName,
                coverArt: approval.coverArt,
                storeId: store.id,
                // A store with a scraper knows its own game IDs; otherwise the page URL identifies the game.
                storeGameId: this.scrapers.get(store.scraper)?.parseId(url) ?? url.href,
            });
            const submitterDiscordId = await this.submitterDiscordId(submission);
            await this.cards.edit(approval.cardMessageId, submissionView(submission, submitterDiscordId, store.name, {
                status: 'approved', reviewerDiscordId: approval.reviewerDiscordId, gameName: game.name,
            }));
            return { result: { submission, game, store, storeCreated: created, submitterDiscordId }, pending };
        }, ({ submission, game, store, storeCreated }) => {
            if (storeCreated) {
                this.log.log(`New store added: ${store.name} (${store.slug}), site ${store.base_url ?? 'none'}, by reviewer ${approval.reviewerDiscordId}`);
            }
            this.log.log(`Submission ${submission.id} approved by ${approval.reviewerDiscordId} as ${game.name} (${game.id}) on ${store.name}`);
        });
    }

    async reject(rejection: Rejection): Promise<Submission> {
        return this.reviewed(rejection, async tx => {
            const pending = await this.pending(rejection.submissionId);
            const submission = await this.submissions.rejectIn(tx, rejection.submissionId);
            const submitterDiscordId = await this.submitterDiscordId(submission);
            await this.cards.edit(rejection.cardMessageId, submissionView(submission, submitterDiscordId, await this.storeName(submission.store_id), {
                status: 'rejected', reviewerDiscordId: rejection.reviewerDiscordId,
            }));
            return { result: submission, pending };
        }, submission => this.log.log(`Submission ${submission.id} rejected by ${rejection.reviewerDiscordId}: ${submission.url}`));
    }

    async storeName(storeId: string | null): Promise<string | null> {
        if (!storeId) {
            return null;
        }
        return (await this.games.stores()).find(store => store.id === storeId)?.name ?? null;
    }

    /** The submitter's Discord ID, for the card and the approval DM. */
    async submitterDiscordId(submission: Submission): Promise<string> {
        const account = await this.users.getById(submission.submitted_by);
        if (!account) {
            throw new Error(`Submission ${submission.id} has no submitter`);
        }
        return account.discord_id;
    }

    /**
     * Runs a review in a transaction whose last step updates the card. If the commit fails after the
     * card changed, the card goes back to pending so it matches the database.
     */
    private async reviewed<T>(
        review: { submissionId: string; cardMessageId: string; ids: CustomIdFactory },
        work: (tx: Database) => Promise<{ result: T; pending: Submission }>,
        onCommitted: (result: T) => void,
    ): Promise<T> {
        // Set inside the transaction once the card has changed, so a failed commit knows to put it back.
        const changed: { pending?: Submission } = {};
        try {
            const result = await this.db.transaction(async tx => {
                const done = await work(tx);
                changed.pending = done.pending;
                return done.result;
            });
            onCommitted(result);
            return result;
        } catch (error) {
            if (changed.pending) {
                await this.restoreCard(review.cardMessageId, changed.pending, review.ids);
            }
            if (error instanceof UserFacingError) {
                throw error;
            }
            this.log.error(`Reviewing submission ${review.submissionId} failed. Nothing was changed.\n${describeError(error)}`);
            throw new UserFacingError('That didn\'t go through, so nothing was changed. Please try again.');
        }
    }

    private async pending(id: string): Promise<Submission> {
        const submission = await this.submissions.getById(id);
        if (!submission) {
            throw new UserFacingError('That submission no longer exists.');
        }
        if (submission.status !== 'pending') {
            throw new UserFacingError('That submission has already been reviewed.');
        }
        return submission;
    }

    private async restoreCard(messageId: string, pending: Submission, ids: CustomIdFactory): Promise<void> {
        try {
            const view = submissionView(pending, await this.submitterDiscordId(pending), await this.storeName(pending.store_id), { status: 'pending', ids });
            await this.cards.edit(messageId, view);
        } catch (error) {
            this.log.error(`Couldn't put submission ${pending.id}'s card back to pending after a failed review. The card is wrong; the database is right.\n${describeError(error)}`);
        }
    }

    private async retract(messageId: string): Promise<void> {
        await this.cards.remove(messageId).catch((error: unknown) => {
            this.log.error(`Couldn't delete review card ${messageId} after its submission failed to save. Delete it by hand.\n${describeError(error)}`);
        });
    }
}
