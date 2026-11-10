import { mockServices } from '../../tests/mocks';
import { SteamSyncProcessor } from '../SteamSyncProcessor';
import { SteamSyncJob } from '../types';

const job: SteamSyncJob = { userId: 'acc-1', discordUserId: '111', reason: 'requested', followUp: { applicationId: 'app', interactionToken: 'tok' } };

function setup(sync: jest.Mock) {
    const services = mockServices({
        steam: { sync, dueForSync: jest.fn().mockResolvedValue([{ user_id: 'acc-1', discord_id: '111' }, { user_id: 'acc-2', discord_id: '222' }]) },
        jobs: { enqueueSteamSync: jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false) },
        discord: { editInteractionReply: jest.fn().mockResolvedValue(undefined) },
    } as never);
    return { services, processor: new SteamSyncProcessor(services) };
}

const reply = (services: ReturnType<typeof setup>['services']): string =>
    JSON.stringify((services.discord.editInteractionReply as jest.Mock).mock.calls[0][2]);

describe('SteamSyncProcessor.sync', () => {
    it('reports what was added', async () => {
        const { services, processor } = setup(jest.fn().mockResolvedValue({ status: 'synced', owned: 40, newToCatalogue: 3, addedToLibrary: 5 }));
        await processor.sync(job, false);
        expect(reply(services)).toContain('added **5** games');
        expect(services.log.log).toHaveBeenCalledWith(expect.stringContaining('5 added to library, 3 new to the catalogue'));
    });

    it('tells the user how to fix a private profile', async () => {
        const { services, processor } = setup(jest.fn().mockResolvedValue({ status: 'private' }));
        await processor.sync(job, false);
        expect(reply(services)).toContain('Game details');
    });

    it('retries a Steam outage quietly, and tells the user on the last attempt', async () => {
        const failing = jest.fn().mockRejectedValue(new Error('Steam GetOwnedGames returned 503'));
        const quiet = setup(failing);
        await expect(quiet.processor.sync(job, false)).rejects.toThrow('503');
        expect(quiet.services.discord.editInteractionReply).not.toHaveBeenCalled();

        const last = setup(failing);
        await expect(last.processor.sync(job, true)).rejects.toThrow('503');
        expect(reply(last.services)).toContain('try `/steam sync` again');
    });

    it('has nobody to tell for an auto-sync', async () => {
        const { services, processor } = setup(jest.fn().mockResolvedValue({ status: 'synced', owned: 1, newToCatalogue: 0, addedToLibrary: 0 }));
        await processor.sync({ userId: 'acc-1', discordUserId: '111', reason: 'auto' }, false);
        expect(services.discord.editInteractionReply).not.toHaveBeenCalled();
    });
});

describe('SteamSyncProcessor.autoSync', () => {
    it('queues a sync for each user due one', async () => {
        const { services, processor } = setup(jest.fn());
        await processor.autoSync();
        expect(services.jobs.enqueueSteamSync).toHaveBeenCalledWith({ userId: 'acc-1', discordUserId: '111', reason: 'auto' });
        expect(services.log.log).toHaveBeenCalledWith('Steam auto-sync queued 1 of 2 user(s) due a sync');
    });
});
