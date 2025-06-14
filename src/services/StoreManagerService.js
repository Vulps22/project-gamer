// src/services/StoreManagerService.js

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const scrapers = require('../scrapers');
const { db } = require('../lib');

class StoreManagerService {

    async init() {
        if (StoreManagerService.instance) {
            return StoreManagerService.instance;
        }

        console.log('StoreManagerService initializing...');

        this.scrapers = scrapers;
        this.storeMatchers = []; // Will hold { scraper_key, base_hostname }
        await this._initializeStoreMatchers();

        StoreManagerService.instance = this;
        console.log(`StoreManagerService initialized with ${this.storeMatchers.length} stores.`);
    }

    async _initializeStoreMatchers() {
        try {
            const activeStores = await db.query(
                'SELECT scraper_key, base_hostname FROM store WHERE is_scrapable = TRUE ORDER BY LENGTH(base_hostname) DESC'
            );

            this.storeMatchers = activeStores.map(store => ({
                scraperKey: store.scraper_key,
                baseHostname: store.base_hostname
            }));

            console.log(`StoreManagerService: Initialized with ${this.storeMatchers.length} store matchers from DB.`);

            if (this.storeMatchers.length === 0) {
                console.warn('StoreManagerService: No scrapable stores found in the database. Store identification will rely on "Unknown Store".');
            }

        } catch (error) {
            console.error('StoreManagerService: Failed to initialize store matchers from database:', error);

            this.storeMatchers = [];
        }
    }

    // In your StoreManagerService class...
    async _downloadAndLoadHtml(url) {
        if (!url || typeof url !== 'string') {
            return { error: 'Invalid URL provided.' };
        }

        // --- META-SPECIFIC LOGIC (using Headless Browser) ---
        if (url.includes('meta.com')) {
            console.log('StoreManagerService: Using lean Puppeteer for Meta URL.');
            let browser = null;
            try {
                browser = await puppeteer.launch({ headless: 'new' });
                const page = await browser.newPage();
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

                // Navigate and wait only for the initial HTML document to be ready.
                // This is faster than waiting for all images and frames ('networkidle2').
                await page.goto(url, { waitUntil: 'domcontentloaded' });

                // We no longer need to click any buttons or reload the page.
                // We just grab the content immediately.
                const html = await page.content();
                const $ = cheerio.load(html);
                return { $, html };

            } catch (e) {
                console.error(`StoreManagerService: Puppeteer failed for URL ${url}:`, e);
                throw new Error(`Puppeteer failed to get page content from ${url}.`);
            } finally {
                if (browser) {
                    await browser.close();
                }
            }
        }

        // --- EXISTING LOGIC for other, simpler stores (Steam, GOG, etc.) ---
        try {
            const parsedUrl = new URL(url);
            const cleanUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;

            const headers = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            };

            if (cleanUrl.includes('store.steampowered.com')) {
                headers['Cookie'] = 'birthtime=252460800; lastagecheckage=1-January-1978';
            } else if (cleanUrl.includes('gog.com')) {
                // Note: I found a more reliable GOG cookie
                headers['Cookie'] = 'gog_wants_mature_content=1';
            }

            const response = await axios.get(cleanUrl, { headers, timeout: 10000 });
            const html = response.data;
            const $ = cheerio.load(html);
            return { $, html };

        } catch (error) {
            console.error(`StoreManagerService: Axios failed for URL ${url}:`, error.message);
            throw new Error(`Failed to download page content from ${url}.`);
        }
    }


    /**
     * Identifies the store name (scraper_key) based on the URL's hostname
     * by checking against the cached list of store matchers from the database.
     * @param {string} url The URL to identify.
     * @returns {string} The scraper_key (e.g., "Steam", "GOG") or "Unknown Store" or "Invalid URL".
     */
    getStoreNameFromUrl(url) {
        try {
            const parsedUrl = new URL(url);
            const currentHostname = parsedUrl.hostname.toLowerCase();

            if (this.storeMatchers.length === 0) {
                console.warn('StoreManagerService: storeMatchers not loaded, cannot identify store from DB. Falling back to "Unknown Store".');
                return 'Unknown Store';
            }

            for (const matcher of this.storeMatchers) {
                console.log(`Checking matcher`, matcher
                    , `against hostname`, currentHostname
                );

                if (currentHostname.includes(matcher.baseHostname)) {
                    console.log(`StoreManagerService: Matched URL ${url} to store ${matcher.scraperKey}`);
                    return matcher.scraperKey;
                }

                console.log(`StoreManagerService: No match for ${matcher.baseHostname} in ${currentHostname}`);
            }

            return 'Unknown Store'; // For valid URLs that don't match known stores in DB
        } catch (e) {
            return 'Invalid URL'; // If new URL(url) throws
        }
    }


    /**
     * fetchGameDataFromUrl method remains largely the same in its logic of using the storeName
     * to pick a scraper from this.scrapers. The storeName it receives will now be from the DB-driven logic.
     * 
     * @param {string} url The URL of the game's store page.
     * @returns {Promise<{
     * storeName: string,
     * storeUrl: string,
     * error: string | null,
     * title?: string | null,
     * imageURL?: string | null,
     * storeSpecificId?: string | null
     * }>} A promise that resolves to the scraped game data.
    */
    async fetchGameDataFromUrl(url) {
        let storeName = this.getStoreNameFromUrl(url); // This now uses the DB-backed logic
        let scrapedData = {};
        let errorMsg = null;

        if (storeName === 'Invalid URL') {
            return { storeName, storeUrl: url, error: 'The provided URL is invalid.' };
        }

        if (this.storeMatchers.length === 0 && storeName === 'Unknown Store') {
            console.warn(`StoreManagerService: Attempting to fetch data for ${url}, but store matchers are not loaded from DB.`);
            storeName = 'Unknown Store';
        }

        if (storeName == 'Unknown Store') {
            return {
                storeName: 'Unknown Store',
                storeUrl: url,
                error: null, // No error for unknown stores, just no data
                title: null,
            };
        }
        try {
            const { $ } = await this._downloadAndLoadHtml(url);

            // The key for this.scrapers should match the scraper_key from the database
            const scraperModule = this.scrapers.findScraperByName(storeName);

            if (scraperModule && typeof scraperModule.scrape === 'function') {
                console.log(`StoreManagerService: Using '${storeName === 'Unknown Store' ? 'Generic' : storeName}' scraper for ${url}`);
                scrapedData = await scraperModule.scrape($, url);
                console.log(`StoreManagerService: Scraped data for ${url}:`, scrapedData);
            } else {
                console.warn(`StoreManagerService: No valid scraper module found for resolved store key '${storeName}'. This might indicate a mismatch between 'stores' table scraper_key and 'scraperRegistry.js' keys, or a missing 'Generic' scraper in the registry.`);
                errorMsg = `Scraper configuration error for store key: ${storeName}.`;
                scrapedData = { title: null }; // Ensure defined for spread
            }

            if (!scrapedData.title) {
                errorMsg = errorMsg || 'Could not extract a valid title using the selected scraper.';
            }

            return {
                storeName, // This is now the scraper_key from your DB or "Unknown Store"
                storeUrl: url,
                ...scrapedData,
                error: errorMsg,
            };

        } catch (error) {
            console.error(`StoreManagerService: Error processing URL ${url} with resolved store key ${storeName}:`, error.message);
            errorMsg = error.message;
            if ((!scrapedData || !scrapedData.title) && storeName !== 'Generic' && this.scrapers.generic) {
                console.warn(`StoreManagerService: Specific scraper for ${storeName} failed. Passing to moderator for manual verification.`);
            }

            const returnData = {
                storeName, // This is now the scraper_key from your DB or "Unknown Store"
                storeUrl: url,
                ...scrapedData,
                error: errorMsg,
            };

            console.log(`StoreManagerService: Returning data for ${url}:`, returnData);
            return returnData;


        }
    }
}

const storeManagerInstance = new StoreManagerService();
module.exports = storeManagerInstance;