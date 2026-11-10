import { Database } from '../../database/Database';
import { UserFacingError } from '../../errors';
import { ScraperRegistry } from '../../scrapers/Scraper';
import { Submission } from '../../types/models';
import { slugify, GameService } from '../GameService';
import { ReviewCards, ReviewQueue } from '../ReviewQueue';
import { SubmissionService } from '../SubmissionService';
import { UserService } from '../UserService';

const pending: Submission = { id: 'sub-1', submitted_by: 'acc-1', url: 'https://minecraft.net/en-us', store_id: null, status: 'pending' };
const ids = (): string => 'custom-id';
const minecraft = { id: 'store-new', name: 'Minecraft', slug: 'minecraft', base_url: 'https://minecraft.net', scraper: null };

/** A database whose transactions run the work, then fail to commit if told to. */
function fakeDb(commitFails = false): Database {
    const tx = {} as Database;
    return {
        transaction: jest.fn(async (work: (t: Database) => Promise<unknown>) => {
            const result = await work(tx);
            if (commitFails) {
                throw new Error('commit failed');
            }
            return result;
        }),
    } as unknown as Database;
}

function setup(options: { commitFails?: boolean; storeCreated?: boolean } = {}) {
    const cards = {
        post: jest.fn().mockResolvedValue('card-1'),
        edit: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
    };
    const submissions = {
        createIn: jest.fn().mockResolvedValue(pending),
        getById: jest.fn().mockResolvedValue(pending),
        approveIn: jest.fn().mockResolvedValue({ submission: { ...pending, status: 'approved' }, game: { id: 'game-1', name: 'Minecraft', cover_art: null } }),
        rejectIn: jest.fn().mockResolvedValue({ ...pending, status: 'rejected' }),
    };
    const games = {
        stores: jest.fn().mockResolvedValue([]),
        findOrCreateStoreIn: jest.fn().mockResolvedValue({ store: minecraft, created: options.storeCreated ?? false }),
    };
    const users = { getById: jest.fn().mockResolvedValue({ id: 'acc-1', discord_id: '111' }) };
    const scrapers = { get: jest.fn().mockReturnValue(null) };
    const log = { log: jest.fn(), error: jest.fn(), debug: jest.fn(), logInteractionReceived: jest.fn() };
    const queue = new ReviewQueue(
        fakeDb(options.commitFails),
        submissions as unknown as SubmissionService,
        games as unknown as GameService,
        users as unknown as UserService,
        scrapers as unknown as ScraperRegistry,
        cards as ReviewCards,
        log,
    );
    return { queue, cards, submissions, games, log };
}

const entry = { userId: 'acc-1', submitterDiscordId: '111', url: pending.url, storeId: null, ids };
const approval = { submissionId: 'sub-1', cardMessageId: 'card-1', reviewerDiscordId: '222', gameName: 'Minecraft', storeName: 'Minecraft', coverArt: null, ids };

describe('ReviewQueue.submit', () => {
    it('saves the submission and posts its card', async () => {
        const { queue, cards, log } = setup();
        await expect(queue.submit(entry)).resolves.toEqual(pending);
        expect(cards.post).toHaveBeenCalled();
        expect(log.log).toHaveBeenCalledWith(expect.stringContaining('queued for review'));
    });

    it('saves nothing when the card can\'t be posted, and tells the user to try again', async () => {
        const { queue, cards, log } = setup();
        cards.post.mockRejectedValue(new Error('Missing Access'));
        await expect(queue.submit(entry)).rejects.toThrow(UserFacingError);
        expect(cards.remove).not.toHaveBeenCalled();
        expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Missing Access'));
    });

    it('deletes the card when saving fails after it was posted', async () => {
        const { queue, cards } = setup({ commitFails: true });
        await expect(queue.submit(entry)).rejects.toThrow('nothing was saved');
        expect(cards.remove).toHaveBeenCalledWith('card-1');
    });
});

describe('ReviewQueue.approve', () => {
    it('approves into the named store and marks the card approved', async () => {
        const { queue, cards, games, submissions } = setup();
        const result = await queue.approve(approval);
        expect(games.findOrCreateStoreIn).toHaveBeenCalledWith(expect.anything(), 'Minecraft', new URL(pending.url));
        expect(submissions.approveIn).toHaveBeenCalledWith(expect.anything(), 'sub-1', expect.objectContaining({ storeId: 'store-new', storeGameId: pending.url }));
        expect(JSON.stringify(cards.edit.mock.calls[0][1])).toContain('Approved by');
        expect(result.submitterDiscordId).toBe('111');
    });

    it('logs a store it created', async () => {
        const { queue, log } = setup({ storeCreated: true });
        await queue.approve(approval);
        expect(log.log).toHaveBeenCalledWith(expect.stringContaining('New store added: Minecraft'));
    });

    it('changes nothing when the card can\'t be updated', async () => {
        const { queue, cards, log } = setup();
        cards.edit.mockRejectedValue(new Error('Missing Access'));
        await expect(queue.approve(approval)).rejects.toThrow('nothing was changed');
        expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Missing Access'));
    });

    it('puts the card back to pending when saving fails after it changed', async () => {
        const { queue, cards } = setup({ commitFails: true });
        await expect(queue.approve(approval)).rejects.toThrow('nothing was changed');
        expect(cards.edit).toHaveBeenCalledTimes(2);
        expect(JSON.stringify(cards.edit.mock.calls[1][1])).toContain('Approve');
        expect(JSON.stringify(cards.edit.mock.calls[1][1])).not.toContain('Approved by');
    });

    it('refuses a submission that was already reviewed, without touching the card', async () => {
        const { queue, cards, submissions } = setup();
        submissions.getById.mockResolvedValue({ ...pending, status: 'rejected' });
        await expect(queue.approve(approval)).rejects.toThrow('already been reviewed');
        expect(cards.edit).not.toHaveBeenCalled();
    });
});

describe('ReviewQueue.reject', () => {
    it('rejects and marks the card rejected', async () => {
        const { queue, cards, log } = setup();
        await queue.reject({ submissionId: 'sub-1', cardMessageId: 'card-1', reviewerDiscordId: '222', ids });
        expect(JSON.stringify(cards.edit.mock.calls[0][1])).toContain('Rejected by');
        expect(log.log).toHaveBeenCalledWith(expect.stringContaining('rejected by 222'));
    });
});

describe('slugify', () => {
    it('makes a short code from a store name', () => {
        expect(slugify('Robert Space Industries')).toBe('robert-space-industries');
        expect(slugify('  itch.io ')).toBe('itch-io');
        expect(slugify('Pokémon Center')).toBe('pokemon-center');
        expect(slugify('!!!')).toBe('');
    });
});
