import { SteamApi } from '../SteamApi';

const RETURN_TO = 'https://pg.test/auth/steam/callback?state=abc';
const STEAM_ID = '76561197960287930';

function loginQuery(overrides: Record<string, string> = {}): Record<string, string> {
    return {
        state: 'abc',
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'id_res',
        'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
        'openid.claimed_id': `https://steamcommunity.com/openid/id/${STEAM_ID}`,
        'openid.identity': `https://steamcommunity.com/openid/id/${STEAM_ID}`,
        'openid.return_to': RETURN_TO,
        'openid.response_nonce': '2026-11-10T12:00:00Zabc',
        'openid.assoc_handle': '1234567890',
        'openid.signed': 'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
        'openid.sig': 'sig=',
        ...overrides,
    };
}

function respond(body: string | object, ok = true, status = 200) {
    return jest.fn().mockResolvedValue({
        ok, status,
        text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
        json: () => Promise.resolve(body),
    });
}

describe('SteamApi.loginUrl', () => {
    it('sends the user to Steam with our return address', () => {
        const url = new URL(new SteamApi(jest.fn(), 'key').loginUrl(RETURN_TO, 'https://pg.test'));
        expect(url.origin + url.pathname).toBe('https://steamcommunity.com/openid/login');
        expect(url.searchParams.get('openid.return_to')).toBe(RETURN_TO);
        expect(url.searchParams.get('openid.realm')).toBe('https://pg.test');
        expect(url.searchParams.get('openid.mode')).toBe('checkid_setup');
    });
});

describe('SteamApi.verifyLogin', () => {
    it('returns the Steam ID once Steam confirms the login', async () => {
        const fetch = respond('ns:http://specs.openid.net/auth/2.0\nis_valid:true\n');
        await expect(new SteamApi(fetch, 'key').verifyLogin(loginQuery(), RETURN_TO)).resolves.toBe(STEAM_ID);
        const [url, init] = fetch.mock.calls[0] as [string, { method: string; body: string }];
        expect(url).toBe('https://steamcommunity.com/openid/login');
        expect(init.method).toBe('POST');
        const body = new URLSearchParams(init.body);
        expect(body.get('openid.mode')).toBe('check_authentication');
        expect(body.get('openid.sig')).toBe('sig=');
        expect(body.has('state')).toBe(false);
    });

    it('refuses a login Steam doesn\'t confirm', async () => {
        await expect(new SteamApi(respond('is_valid:false\n'), 'key').verifyLogin(loginQuery(), RETURN_TO)).resolves.toBeNull();
    });

    it.each([
        ['a different return address', { 'openid.return_to': 'https://evil.test/auth/steam/callback?state=abc' }],
        ['another OpenID provider', { 'openid.op_endpoint': 'https://evil.test/openid' }],
        ['a claimed ID that isn\'t a Steam account', { 'openid.claimed_id': 'https://evil.test/id/1', 'openid.identity': 'https://evil.test/id/1' }],
        ['an identity that differs from the claimed ID', { 'openid.identity': 'https://steamcommunity.com/openid/id/76561197960287931' }],
        ['a cancelled login', { 'openid.mode': 'cancel' }],
    ])('refuses %s without asking Steam', async (_case, overrides) => {
        const fetch = respond('is_valid:true');
        await expect(new SteamApi(fetch, 'key').verifyLogin(loginQuery(overrides), RETURN_TO)).resolves.toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe('SteamApi.ownedGames', () => {
    it('lists the account\'s games', async () => {
        const fetch = respond({ response: { game_count: 2, games: [{ appid: 620, name: 'Portal 2' }, { appid: 400, name: 'Portal' }] } });
        await expect(new SteamApi(fetch, 'secret-key').ownedGames(STEAM_ID)).resolves.toEqual([{ appId: '620', name: 'Portal 2' }, { appId: '400', name: 'Portal' }]);
        expect(fetch.mock.calls[0][0]).toContain('include_appinfo=1');
    });

    it('returns null for a private profile', async () => {
        await expect(new SteamApi(respond({ response: {} }), 'key').ownedGames(STEAM_ID)).resolves.toBeNull();
    });

    it('returns an empty list for a public account with no games', async () => {
        await expect(new SteamApi(respond({ response: { game_count: 0 } }), 'key').ownedGames(STEAM_ID)).resolves.toEqual([]);
    });

    it('throws on an outage, without the API key in the error', async () => {
        const error = await new SteamApi(respond({}, false, 503), 'secret-key').ownedGames(STEAM_ID).catch((e: unknown) => e as Error);
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('503');
        expect((error as Error).message).not.toContain('secret-key');
    });
});
