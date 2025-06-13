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
        imageURL: null, // Using your preferred casing
        storeGameId: null,
    };

    // --- FIX: Target the 'name' attribute instead of 'property' ---
    if (!data.title) {
        data.title = $('meta[name="og:title"]').attr('content') || null;
    }

    if (!data.imageURL) {
        data.imageURL = $('meta[name="og:image"]').attr('content') || null;
    }

    // For the store ID, the URL is the most reliable source.
    // In your scraper's scrape function...
if (!data.storeGameId) {
    const urlParts = url.split('/');
    
    // Get the last part of the path. It might be empty if the URL has a trailing slash.
    let potentialId = urlParts[urlParts.length - 1];

    // If the last part was empty, get the second-to-last part.
    if (!potentialId) {
        potentialId = urlParts[urlParts.length - 2];
    }
    
    // The Regex pattern to test for a string containing only digits.
    const idRegex = /^\d+$/;

    // .test() returns true if the string matches the pattern, false otherwise.
    if (potentialId && idRegex.test(potentialId)) {
        console.log(`Validated store ID: ${potentialId}`);
        data.storeGameId = potentialId;
    } else {
        console.log(`Could not validate a numeric ID from path segment: "${potentialId}"`);
        data.storeGameId = null;
    }
}

    return data;
}

module.exports = {
    scrape,
};