const OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const OPENID_NS = 'http://specs.openid.net/auth/2.0';
const IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select';
const CLAIMED_ID = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

/** A game a Steam account owns, as GetOwnedGames returns it. */
export interface OwnedGame {
    appId: string;
    name: string;
}

export type Fetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
    ok: boolean;
    status: number;
    text(): Promise<string>;
    json(): Promise<unknown>;
}>;

interface OwnedGamesResponse {
    response?: { game_count?: number; games?: { appid: number; name?: string }[] };
}

/** Steam's OpenID login and Web API. The API key is never put in an error or a log line. */
export class SteamApi {
    constructor(private readonly fetch: Fetch, private readonly apiKey: string) {}

    /** Steam's login page, which sends the user back to `returnTo` once they've signed in. */
    loginUrl(returnTo: string, realm: string): string {
        const params = new URLSearchParams({
            'openid.ns': OPENID_NS,
            'openid.mode': 'checkid_setup',
            'openid.return_to': returnTo,
            'openid.realm': realm,
            'openid.identity': IDENTIFIER_SELECT,
            'openid.claimed_id': IDENTIFIER_SELECT,
        });
        return `${OPENID_ENDPOINT}?${params.toString()}`;
    }

    /**
     * The Steam ID a login callback proves, or null if it doesn't prove one. The query must be for the
     * return URL we sent, and Steam itself must confirm it (check_authentication): the Steam ID in the
     * query alone could be forged.
     */
    async verifyLogin(query: Record<string, string>, expectedReturnTo: string): Promise<string | null> {
        const steamId = CLAIMED_ID.exec(query['openid.claimed_id'] ?? '')?.[1];
        if (
            query['openid.mode'] !== 'id_res'
            || query['openid.op_endpoint'] !== OPENID_ENDPOINT
            || query['openid.return_to'] !== expectedReturnTo
            || query['openid.identity'] !== query['openid.claimed_id']
            || !steamId
        ) {
            return null;
        }

        const body = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            if (key.startsWith('openid.')) {
                body.set(key, value);
            }
        }
        body.set('openid.mode', 'check_authentication');

        const response = await this.fetch(OPENID_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        if (!response.ok) {
            throw new Error(`Steam check_authentication returned ${response.status}`);
        }
        return /^is_valid:true$/m.test(await response.text()) ? steamId : null;
    }

    /** Every game the account owns, or null when its game details are private. Throws on a Steam outage, so the job retries. */
    async ownedGames(steamId: string): Promise<OwnedGame[] | null> {
        const params = new URLSearchParams({ key: this.apiKey, steamid: steamId, include_appinfo: '1', include_played_free_games: '1', format: 'json' });
        const response = await this.fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params.toString()}`);
        if (!response.ok) {
            // The URL holds the API key, so only the status goes in the error.
            throw new Error(`Steam GetOwnedGames returned ${response.status}`);
        }
        const data = (await response.json() as OwnedGamesResponse).response;
        // A private profile comes back as an empty response, with no game_count.
        if (data?.game_count === undefined) {
            return null;
        }
        return (data.games ?? []).filter(game => game.name).map(game => ({ appId: String(game.appid), name: game.name as string }));
    }
}

/** Steam's own art for a game, by app ID. */
export function steamCoverArt(appId: string): string {
    return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

export function steamStoreUrl(appId: string): string {
    return `https://store.steampowered.com/app/${appId}`;
}

/** Where Steam sends the user back to after login: the pathfinder route src/routes/auth/steam/callback.ts. */
export const STEAM_CALLBACK_PATH = '/auth/steam/callback';

export function steamCallbackUrl(publicUrl: string, state: string): string {
    return `${publicUrl}${STEAM_CALLBACK_PATH}?state=${state}`;
}
