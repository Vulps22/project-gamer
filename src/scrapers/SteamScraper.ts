import { HttpFetch, ScrapedGame, Scraper } from './Scraper';

interface AppDetailsResponse {
    [appId: string]: { success: boolean; data?: { name: string; header_image?: string } };
}

/** Steam, through the store's public appdetails API. */
export class SteamScraper implements Scraper {
    constructor(private readonly http: HttpFetch) {}

    parseId(url: URL): string | null {
        return /^\/app\/(\d+)/.exec(url.pathname)?.[1] ?? null;
    }

    async fetch(appId: string): Promise<ScrapedGame | null> {
        const response = await this.http(`https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`);
        if (!response.ok) {
            throw new Error(`Steam appdetails returned ${response.status}`);
        }
        const entry = (await response.json() as AppDetailsResponse)[appId];
        if (!entry?.success || !entry.data) {
            return null;
        }
        return {
            name: entry.data.name,
            coverArt: entry.data.header_image ?? null,
            url: `https://store.steampowered.com/app/${appId}`,
        };
    }
}
