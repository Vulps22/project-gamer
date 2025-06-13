// src/scrapers/metaScraper.js

/**
 * Scrapes game data from a Meta Quest store page.
 * @param {object} $ - The Cheerio instance loaded with the page's HTML.
 * @param {string} url - The original URL of the page.
 * @returns {Promise<object>} Standardized game data object.
 */
async function scrape($, url) {
    const data = {
        title: null,
        imageURL: null,
        storeGameId: null,
    };

    // --- Get the raw title from the meta tag ---
    let rawTitle = $('meta[name="og:title"]').attr('content') || null;

    // --- NEW: Clean up the title if it was found ---
    if (rawTitle) {
        // This removes " on Meta Quest" ONLY if it's at the very end of the string.
        // The .trim() at the end removes any leftover whitespace.
        data.title = rawTitle.replace(/ on Meta Quest$/, '').trim();
    }

    // Get the image URL
    data.imageURL = $('meta[name="og:image"]').attr('content') || null;

    // Get the store ID
    if (!data.storeGameId) {
        const urlParts = url.split('/');
        let potentialId = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        const idRegex = /^\d+$/;

        if (potentialId && idRegex.test(potentialId)) {
            data.storeGameId = potentialId;
        } else {
            data.storeGameId = null;
        }
    }

    return data;
}

module.exports = {
    scrape,
};