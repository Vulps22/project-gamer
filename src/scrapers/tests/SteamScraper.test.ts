import { SteamScraper } from '../SteamScraper';

function respond(ok: boolean, body: unknown, status = 200): jest.Mock {
    return jest.fn().mockResolvedValue({ ok, status, json: () => Promise.resolve(body) });
}

describe('SteamScraper', () => {
    it('reads the app ID from a store URL', () => {
        const scraper = new SteamScraper(jest.fn());
        expect(scraper.parseId(new URL('https://store.steampowered.com/app/620/Portal_2/'))).toBe('620');
        expect(scraper.parseId(new URL('https://store.steampowered.com/search?q=portal'))).toBeNull();
    });

    it('returns the game\'s name, cover and canonical URL', async () => {
        const http = respond(true, { 620: { success: true, data: { name: 'Portal 2', header_image: 'https://img' } } });
        await expect(new SteamScraper(http).fetch('620')).resolves.toEqual({ name: 'Portal 2', coverArt: 'https://img', url: 'https://store.steampowered.com/app/620' });
    });

    it('returns null for an app Steam doesn\'t have', async () => {
        await expect(new SteamScraper(respond(true, { 1: { success: false } })).fetch('1')).resolves.toBeNull();
    });

    it('throws on an HTTP error, so the job retries', async () => {
        await expect(new SteamScraper(respond(false, null, 503)).fetch('620')).rejects.toThrow('503');
    });
});
