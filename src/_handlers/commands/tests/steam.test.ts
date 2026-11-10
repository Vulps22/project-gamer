import { PgCommandInteraction } from '../../../discord/interactions';
import { mockServices } from '../../../tests/mocks';
import { steam } from '../steam';

function interaction(subcommand: string) {
    return {
        user: { id: '111', username: 'tester' }, guildId: '9001', token: 'tok', applicationId: 'app',
        options: { getSubcommand: () => subcommand },
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined),
    } as unknown as PgCommandInteraction & { editReply: jest.Mock };
}

function setup(link: { steam_id: string; last_synced: Date | null } | null) {
    return mockServices({
        users: { ensure: jest.fn().mockResolvedValue({ id: 'acc-1', discord_id: '111' }) },
        servers: { ensure: jest.fn().mockResolvedValue({ id: 'srv-1' }), ensureMember: jest.fn().mockResolvedValue(undefined) },
        steam: { getLink: jest.fn().mockResolvedValue(link), unlink: jest.fn().mockResolvedValue(link !== null) },
        steamLogins: { create: jest.fn().mockResolvedValue('state-1') },
        steamApi: { loginUrl: jest.fn().mockReturnValue('https://steamcommunity.com/openid/login?x') },
        jobs: { enqueueSteamSync: jest.fn().mockResolvedValue(true) },
    } as never);
}

const reply = (i: { editReply: jest.Mock }): string => JSON.stringify(i.editReply.mock.calls[0][0]);
const linked = { steam_id: '765', last_synced: new Date(Date.now() - 60 * 60 * 1000) };

describe('/steam connect', () => {
    it('gives a one-time Steam sign-in link that comes back to our callback', async () => {
        const services = setup(null);
        const i = interaction('connect');
        await steam.execute(i, services);
        expect(services.steamLogins.create).toHaveBeenCalledWith({ discordUserId: '111', applicationId: 'app', interactionToken: 'tok' });
        expect(services.steamApi.loginUrl).toHaveBeenCalledWith('https://pg.test/auth/steam/callback?state=state-1', 'https://pg.test');
        expect(reply(i)).toContain('https://steamcommunity.com/openid/login?x');
    });

    it('says so when an account is already linked', async () => {
        const services = setup(linked);
        const i = interaction('connect');
        await steam.execute(i, services);
        expect(services.steamLogins.create).not.toHaveBeenCalled();
        expect(reply(i)).toContain('already linked');
    });
});

describe('/steam sync', () => {
    it('queues a sync that will update this reply', async () => {
        const services = setup(linked);
        const i = interaction('sync');
        await steam.execute(i, services);
        expect(services.jobs.enqueueSteamSync).toHaveBeenCalledWith({ userId: 'acc-1', discordUserId: '111', reason: 'requested', followUp: { applicationId: 'app', interactionToken: 'tok' } });
        expect(reply(i)).toContain('Syncing');
    });

    it('needs a linked account', async () => {
        const services = setup(null);
        const i = interaction('sync');
        await steam.execute(i, services);
        expect(services.jobs.enqueueSteamSync).not.toHaveBeenCalled();
        expect(reply(i)).toContain('/steam connect');
    });

    it('refuses a sync straight after the last one', async () => {
        const services = setup({ steam_id: '765', last_synced: new Date(Date.now() - 60 * 1000) });
        const i = interaction('sync');
        await steam.execute(i, services);
        expect(services.jobs.enqueueSteamSync).not.toHaveBeenCalled();
        expect(reply(i)).toContain('sync again in 9 minutes');
    });
});

describe('/steam unlink', () => {
    it('unlinks and keeps the games', async () => {
        const services = setup(linked);
        const i = interaction('unlink');
        await steam.execute(i, services);
        expect(services.steam.unlink).toHaveBeenCalledWith('acc-1');
        expect(reply(i)).toContain('stay in your library');
    });
});
