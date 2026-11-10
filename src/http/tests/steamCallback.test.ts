import { Request, Response } from 'express';
import { route } from '../../routes/auth/steam/callback';
import { mockServices } from '../../tests/mocks';
import { provideRouteServices } from '../routeContext';

const session = { discordUserId: '111', applicationId: 'app', interactionToken: 'tok' };

function setup(found: typeof session | null, steamId: string | null) {
    const services = mockServices({
        steamLogins: { consume: jest.fn().mockResolvedValue(found) },
        steamApi: { verifyLogin: jest.fn().mockResolvedValue(steamId) },
        users: { ensure: jest.fn().mockResolvedValue({ id: 'acc-1', discord_id: '111' }) },
        steam: { link: jest.fn().mockResolvedValue(undefined) },
        discord: { editInteractionReply: jest.fn().mockResolvedValue(undefined) },
        jobs: { enqueueSteamSync: jest.fn().mockResolvedValue(true) },
    } as never);
    provideRouteServices(services);
    const res = { status: jest.fn(), type: jest.fn(), send: jest.fn() };
    res.status.mockReturnValue(res);
    res.type.mockReturnValue(res);
    return { services, res };
}

async function call(res: ReturnType<typeof setup>['res'], query: Record<string, unknown> = { state: 'abc', 'openid.mode': 'id_res' }): Promise<void> {
    await (route.get as (req: Request, res: Response) => Promise<void>)({ query } as unknown as Request, res as unknown as Response);
}

describe('GET /auth/steam/callback', () => {
    it('links the account, queues the first sync and says so', async () => {
        const { services, res } = setup(session, '76561197960287930');
        await call(res);
        expect(services.steamApi.verifyLogin).toHaveBeenCalledWith(expect.objectContaining({ state: 'abc' }), 'https://pg.test/auth/steam/callback?state=abc');
        expect(services.steam.link).toHaveBeenCalledWith('acc-1', '76561197960287930');
        expect(services.jobs.enqueueSteamSync).toHaveBeenCalledWith(expect.objectContaining({ userId: 'acc-1', reason: 'linked' }));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send.mock.calls[0][0]).toContain('Steam account linked');
    });

    it('refuses an expired or reused link', async () => {
        const { services, res } = setup(null, '76561197960287930');
        await call(res);
        expect(services.steamApi.verifyLogin).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send.mock.calls[0][0]).toContain('expired or was already used');
    });

    it('refuses a login Steam doesn\'t confirm, linking nothing', async () => {
        const { services, res } = setup(session, null);
        await call(res);
        expect(services.steam.link).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('reports a failure to the error channel and shows a friendly page', async () => {
        const { services, res } = setup(session, '76561197960287930');
        (services.steam.link as jest.Mock).mockRejectedValue(new Error('db down'));
        await call(res);
        expect(services.log.error).toHaveBeenCalledWith(expect.stringContaining('db down'));
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('ignores repeated query parameters rather than trusting either', async () => {
        const { services, res } = setup(session, null);
        await call(res, { state: 'abc', 'openid.claimed_id': ['a', 'b'] });
        expect(services.steamApi.verifyLogin).toHaveBeenCalledWith({ state: 'abc' }, expect.any(String));
    });

    it('never echoes the query into the page', async () => {
        const { res } = setup(null, null);
        await call(res, { state: '<script>alert(1)</script>' });
        expect(res.send.mock.calls[0][0]).not.toContain('<script>alert');
    });
});
