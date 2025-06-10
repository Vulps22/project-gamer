// src/scrapers/steamScraper.js

/**
 * Scrapes game data from a Steam store page.
 * @param {object} $ - The Cheerio instance loaded with the page's HTML.
 * @param {string} url - The original URL of the page.
 * @returns {Promise<object>} Standardized game data object.
 */
async function scrape($, url) {
    const data = {
        title: $('#appHubAppName').text().trim() || null,
        storeSpecificId: null,
    };

    console.log("Steam Scraper: Scrapped:", data);

    const appIdMatch = url.match(/app\/(\d+)/);
    if (appIdMatch && appIdMatch[1]) {
        data.storeGameId = appIdMatch[1];
    }
    return data;
}

module.exports = {
    scrape,
};