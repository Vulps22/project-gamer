// src/scrapers/gogScraper.js

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
    };

    // Prioritize JSON-LD
    const gogJsonLdScripts = $('script[type="application/ld+json"]');
    gogJsonLdScripts.each((i, el) => {
        const scriptContent = $(el).html();
        if (!scriptContent) return;

        try {
            const jsonData = JSON.parse(scriptContent);
            // GOG sometimes has an array of JSON-LD objects, sometimes a single one.
            const items = Array.isArray(jsonData) ? jsonData : [jsonData];

            for (const item of items) {
                if (item['@type'] === 'Product' || item['@type'] === 'VideoGame') {
                    data.title = item.name || data.title;
                    // GOG might use 'sku' for product ID, or sometimes 'mpn'.
                    data.storeGameId = item.sku || item.mpn || data.storeGameId;
                    // If we found the main product, we can often break
                    if (data.title && item['@type'] === 'VideoGame') break;
                }
            }
        } catch (e) {
            console.warn(`GOG: Could not parse JSON-LD for ${url}: ${e.message}`);
        }
    });


    // Fallbacks if JSON-LD fails or is incomplete
    if (!data.title) data.title = $('[class*="productcard-basics__title"]').text().trim() || $('h1.product-card__title').text().trim() || null;
    if (!data.description) data.description = $('div[class*="description ModuleDescription"]').text().trim() || null; // More specific selector
    if (!data.imageUrl) data.imageUrl = $('img.productcard-img__image--final').first().attr('src') || $('product-tile > figure > img.product-tile__image-img.ng-star-inserted').attr('src') || null;

    // Clean up description (GOG descriptions can be very messy with HTML)
    if (data.description) {
        // A simple way to strip HTML, though a more robust library might be better for complex cases.
        const tempCheerio = cheerio.load(`<div>${data.description}</div>`);
        data.description = tempCheerio.root().text().replace(/\s+/g, ' ').trim();
    }


    return data;
}

module.exports = {
    scrape,
};