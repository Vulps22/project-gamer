// src/scrapers/gogScraper.js

const cheerio = require("cheerio");

/**
 * Scrapes game data from a GOG store page.
 * @param {object} $ - The Cheerio instance loaded with the page's HTML.
 * @param {string} url - The original URL of the page.
 * @returns {Promise<object>} Standardized game data object.
 */
async function scrape($, url) {
    const data = {
        title: null,
        storeGameId: null,
        description: null, // Added for completeness from your example
        imageUrl: null,    // Added for completeness from your example
    };

    // Prioritize JSON-LD
    const gogJsonLdScripts = $('script[type="application/ld+json"]');
    gogJsonLdScripts.each((i, el) => {
        const scriptContent = $(el).html();
        if (!scriptContent) return;

        try {
            const jsonData = JSON.parse(scriptContent);
            const items = Array.isArray(jsonData) ? jsonData : [jsonData];

            for (const item of items) {
                if (item['@type'] === 'Product' || item['@type'] === 'VideoGame') {
                    data.title = item.name || data.title;
                    data.storeGameId = item.sku || item.mpn || data.storeGameId;
                    if (data.title && item['@type'] === 'VideoGame') break;
                }
            }
        } catch (e) {
            console.warn(`GOG: Could not parse JSON-LD for ${url}: ${e.message}`);
        }
    });

    // Fallbacks if JSON-LD fails or is incomplete
    if (!data.title) data.title = $('[class*="productcard-basics__title"]').text().trim() || $('h1.product-card__title').text().trim() || null;

    // ===================================================================
    // NEW: Final cleanup step to decode HTML entities from the title
    // ===================================================================
    if (data.title) {
        // This ensures that if the title came from JSON-LD with HTML
        // entities (like &#039;), it gets decoded to its plain text
        // representation (like ').
        const tempCheerio = cheerio.load(data.title);
        data.title = tempCheerio.root().text();
    }
    // ===================================================================

    return data;
}

module.exports = {
    scrape,
};