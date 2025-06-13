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
        // Use the more reliable og:image meta tag to get the image URL
        imageURL: $('meta[property="og:image"]').attr('content') || null,
        storeGameId: null,
    };

    console.log("Steam Scraper: Scraped:", data);

    // Get the app ID from the URL using a regular expression
    const appIdMatch = url.match(/app\/(\d+)/);
    if (appIdMatch && appIdMatch[1]) {
        data.storeGameId = appIdMatch[1];
    }
    
    return data;
}

module.exports = {
    scrape,
};