// src/services/StoreManagerService.js

const axios = require('axios');
const cheerio = require('cheerio');
const scraperRegistry = require('../scrapers');
const db = require('../lib/database'); // Assuming your DB connection is here

class StoreManagerService {
    async init() {
        if (StoreManagerService.instance) {
            return StoreManagerService.instance;
        }
        
        console.log('StoreManagerService initializing...');

        this.scrapers = scraperRegistry;
        this.storeMatchers = []; // Will hold { scraper_key, base_hostname }
        await this._initializeStoreMatchers(); // Load store data from DB

        StoreManagerService.instance = this;
        console.log(`StoreManagerService initialized with ${this.storeMatchers.length} stores.`);
    }

    async _initializeStoreMatchers() {
        try {
            const activeStores = await db.query(
                'SELECT scraper_key, base_hostname FROM store WHERE is_scrapable = TRUE ORDER BY LENGTH(base_hostname) DESC'
                // Ordering by length DESC helps match more specific hostnames first, e.g., 'store.epicgames.com' before 'epicgames.com' if both existed for different scrapers.
            );
            this.storeMatchers = activeStores.map(store => ({
                scraperKey: store.scraper_key, // Ensure your DB column name matches
                baseHostname: store.base_hostname // Ensure your DB column name matches
            }));
            console.log(`StoreManagerService: Initialized with ${this.storeMatchers.length} store matchers from DB.`);
            if (this.storeMatchers.length === 0) {
                console.warn('StoreManagerService: No scrapable stores found in the database. Store identification will rely on "Unknown Store".');
            }
        } catch (error) {
            console.error('StoreManagerService: Failed to initialize store matchers from database:', error);
            // Decide on fallback behavior - perhaps retry or operate without DB matchers
            this.storeMatchers = []; // Ensure it's an array
        }
    }

    // _downloadAndLoadHtml method remains the same...
    async _downloadAndLoadHtml(url) {

        if (!url || typeof url !== 'string') {
            return;
        }

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                timeout: 10000,
            });
            const html = response.data;
            const $ = cheerio.load(html);
            return { html, $ };
        } catch (error) {
            console.error(`StoreManagerService: Failed to download URL ${url}: ${error.message}`);
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
     * imageUrl?: string | null,
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

        // If storeMatchers haven't loaded yet, we might want to wait or handle it.
        // For simplicity here, we assume _initializeStoreMatchers has run or is running.
        // A more robust solution might involve a promise for initialization.
        if (this.storeMatchers.length === 0 && storeName === 'Unknown Store') {
            console.warn(`StoreManagerService: Attempting to fetch data for ${url}, but store matchers are not loaded from DB.`);
            storeName = 'Unknown Store'; // Fallback to generic if matchers are empty}
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
            const scraperModule = this.scrapers[storeName];

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
            if ((!scrapedData || !scrapedData.title) && storeName !== 'Generic' && this.scrapers['Generic']) {
                console.warn(`StoreManagerService: Specific scraper for ${storeName} failed. Passing to moderator for manual verification.`);
            }

            returnData = {
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