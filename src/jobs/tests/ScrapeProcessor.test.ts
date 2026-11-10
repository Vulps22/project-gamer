import { mockServices } from '../../tests/mocks';
import { ScrapeProcessor } from '../ScrapeProcessor';
import { ScrapeJob } from '../types';

const job: ScrapeJob = {
    url: 'https://store.steampowered.com/app/620', storeId: 'steam', storeGameId: '620', scraper: 'steam',
    userId: 'acc-1', discordUserId: '111', applicationId: 'app', interactionToken: 'token', flowId: '123456789',
};

function setup(fetch: jest.Mock) {
    const services = mockServices({
        scrapers: { get: jest.fn().mockReturnValue({ fetch, parseId: jest.fn() }) },
        games: { create: jest.fn().mockResolvedValue({ id: 'game-1', name: 'Portal 2', cover_art: null }) },
        library: { add: jest.fn().mockResolvedValue(true) },
        submissions: { create: jest.fn().mockResolvedValue({ id: 'sub-1' }) },
        submissionNotifier: { notify: jest.fn().mockResolvedValue(undefined) },
        discord: { editInteractionReply: jest.fn().mockResolvedValue(undefined) },
    });
    return { services, processor: new ScrapeProcessor(services) };
}

const replyText = (services: ReturnType<typeof setup>['services']): string =>
    JSON.stringify((services.discord.editInteractionReply as jest.Mock).mock.calls[0][2]);

describe('ScrapeProcessor', () => {
    it('adds a scraped game to the catalogue and the library, then tells the user', async () => {
        const { services, processor } = setup(jest.fn().mockResolvedValue({ name: 'Portal 2', coverArt: null, url: job.url }));
        await processor.process(job, false);
        expect(services.games.create).toHaveBeenCalledWith({ name: 'Portal 2', coverArt: null, url: job.url, storeId: 'steam', storeGameId: '620' });
        expect(services.library.add).toHaveBeenCalledWith('acc-1', 'game-1', 'manual');
        expect(replyText(services)).toContain('Added **Portal 2**');
    });

    it('sends a page the store doesn\'t recognise to review, continuing the flow', async () => {
        const { services, processor } = setup(jest.fn().mockResolvedValue(null));
        await processor.process(job, false);
        expect(services.submissions.create).toHaveBeenCalledWith('acc-1', job.url, 'steam');
        expect(services.submissionNotifier.notify).toHaveBeenCalled();
        expect(replyText(services)).toContain('sent it to our team');
    });

    it('rethrows a scrape failure so BullMQ retries it', async () => {
        const { processor } = setup(jest.fn().mockRejectedValue(new Error('timeout')));
        await expect(processor.process(job, false)).rejects.toThrow('timeout');
    });

    it('sends the URL to review when the last retry fails', async () => {
        const { services, processor } = setup(jest.fn().mockRejectedValue(new Error('timeout')));
        await processor.process(job, true);
        expect(services.submissions.create).toHaveBeenCalled();
    });

    it('carries on if the reply can no longer be edited', async () => {
        const { services, processor } = setup(jest.fn().mockResolvedValue({ name: 'Portal 2', coverArt: null, url: job.url }));
        (services.discord.editInteractionReply as jest.Mock).mockRejectedValue(new Error('Unknown Webhook'));
        await expect(processor.process(job, false)).resolves.toBeUndefined();
    });
});
