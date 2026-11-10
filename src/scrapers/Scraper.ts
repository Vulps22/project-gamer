export interface ScrapedGame {
    name: string;
    coverArt: string | null;
    /** The canonical store page URL. */
    url: string;
}

/** Reads game details from one store. */
export interface Scraper {
    /** The store's own ID for the game in a URL, or null if the URL isn't a game page. */
    parseId(url: URL): string | null;
    /** The game's details, or null if the store has no such game. Throws on transient failures, so the job retries. */
    fetch(storeGameId: string): Promise<ScrapedGame | null>;
}

export type HttpFetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Scrapers by the name stored in store.stores.scraper. */
export class ScraperRegistry {
    constructor(private readonly scrapers: Readonly<Record<string, Scraper>>) {}

    /** The scraper for a store, or null if it has none (its URLs go to manual approval). */
    get(name: string | null): Scraper | null {
        return name !== null ? this.scrapers[name] ?? null : null;
    }
}
