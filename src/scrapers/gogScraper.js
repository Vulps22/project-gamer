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
        imageUrl: null,
    };

    // Prioritize JSON-LD for all data, including the image
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
                    // --- NEW: Also get the image from JSON-LD if available ---
                    data.imageUrl = item.image || data.imageUrl;
                    data.storeGameId = item.sku || item.mpn || data.storeGameId;
                    // Once we find the main VideoGame item, we can often stop.
                    if (data.title && data.imageUrl && item['@type'] === 'VideoGame') break;
                }
            }
        } catch (e) {
            console.warn(`GOG: Could not parse JSON-LD for ${url}: ${e.message}`);
        }
    });

    // --- UPDATED: Fallback to og:image meta tag if not found in JSON-LD ---
    if (!data.imageUrl) {
        const imageMetaTag = $('meta[property="og:image"]');
        if (imageMetaTag) {
            data.imageUrl = imageMetaTag.attr('content');
        }
    }

    // Fallbacks for title if JSON-LD fails or is incomplete
    if (!data.title) {
        data.title = $('[class*="productcard-basics__title"]').text().trim() || $('h1.product-card__title').text().trim() || null;
    }

    // Final cleanup step to decode HTML entities from the title
    if (data.title) {
        const tempCheerio = cheerio.load(data.title);
        data.title = tempCheerio.root().text();
    }
    
    return data;
}

module.exports = {
    scrape,
};