import { PgCommandInteraction } from '../../../discord/interactions';
import { UserFacingError } from '../../../errors';
import { mockServices } from '../../../tests/mocks';
import { libraryAdd } from '../library/add';

const steam = { id: 'steam-id', name: 'Steam', slug: 'steam', base_url: 'https://store.steampowered.com', scraper: 'steam' };

function interaction(url: string) {
    return {
        user: { id: '111', username: 'tester' }, guildId: '9001', flowId: '1001', token: 'tok', applicationId: 'app',
        options: { getString: () => url },
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined),
        createCustomId: jest.fn().mockReturnValue('id'),
    } as unknown as PgCommandInteraction & { editReply: jest.Mock };
}

function setup(store: typeof steam | null, known: { id: string; name: string } | null = null) {
    return mockServices({
        users: { ensure: jest.fn().mockResolvedValue({ id: 'acc-1', discord_id: '111' }) },
        servers: { ensure: jest.fn().mockResolvedValue({ id: 'srv-1' }), ensureMember: jest.fn().mockResolvedValue(undefined) },
        games: { storeForUrl: jest.fn().mockResolvedValue(store), findByStoreEntry: jest.fn().mockResolvedValue(known) },
        scrapers: { get: jest.fn((name: string | null) => (name === 'steam' ? { parseId: (u: URL) => /\/app\/(\d+)/.exec(u.pathname)?.[1] ?? null, fetch: jest.fn() } : null)) },
        library: { add: jest.fn().mockResolvedValue(true) },
        jobs: { enqueueScrape: jest.fn().mockResolvedValue(undefined) },
        reviewQueue: { submit: jest.fn().mockResolvedValue({ id: 'sub-1' }) },
    } as never);
}

const reply = (i: { editReply: jest.Mock }): string => JSON.stringify(i.editReply.mock.calls[0][0]);

describe('/library add', () => {
    it('rejects something that isn\'t a link', async () => {
        await expect(libraryAdd(interaction('portal 2'), setup(steam))).rejects.toThrow(UserFacingError);
    });

    it('rejects a store link that isn\'t a game page', async () => {
        await expect(libraryAdd(interaction('https://store.steampowered.com/search'), setup(steam))).rejects.toThrow('game\'s page on Steam');
    });

    it('adds a game the catalogue already has straight away', async () => {
        const services = setup(steam, { id: 'game-1', name: 'Portal 2' });
        const i = interaction('https://store.steampowered.com/app/620/Portal_2/');
        await libraryAdd(i, services);
        expect(services.library.add).toHaveBeenCalledWith('acc-1', 'game-1', 'manual');
        expect(services.jobs.enqueueScrape).not.toHaveBeenCalled();
        expect(reply(i)).toContain('Added **Portal 2**');
    });

    it('hands a new game on a scrapable store to the worker', async () => {
        const services = setup(steam);
        const i = interaction('https://store.steampowered.com/app/620/Portal_2/');
        await libraryAdd(i, services);
        expect(services.jobs.enqueueScrape).toHaveBeenCalledWith(expect.objectContaining({ storeGameId: '620', userId: 'acc-1', interactionToken: 'tok', flowId: '1001' }));
        expect(reply(i)).toContain('Adding your game');
    });

    it('sends a store with no scraper to admin review', async () => {
        const services = setup(null);
        const i = interaction('https://www.gog.com/en/game/the_witcher');
        await libraryAdd(i, services);
        expect(services.reviewQueue.submit).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'acc-1', submitterDiscordId: '111', url: 'https://www.gog.com/en/game/the_witcher', storeId: null,
        }));
        expect(reply(i)).toContain('DM you when it');
    });

    it('passes on a failed submission without claiming it was sent', async () => {
        const services = setup(null);
        (services.reviewQueue.submit as jest.Mock).mockRejectedValue(new UserFacingError('nothing was saved'));
        const i = interaction('https://www.gog.com/en/game/the_witcher');
        await expect(libraryAdd(i, services)).rejects.toThrow('nothing was saved');
        expect(i.editReply).not.toHaveBeenCalled();
    });
});
