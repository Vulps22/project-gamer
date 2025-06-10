// src/scrapers/steamScraper.js

/**
 * Scrapes game data from a Steam store page.
 * @param {object} $ - The Cheerio instance loaded with the page's HTML.
 * @param {string} url - The original URL of the page.
 * @returns {Promise<object>} Standardized game data object.
 */
async function scrape($, url) {
    const data = {
        title: $('.apphub_AppName').text().trim() || null,
        description: $('.game_description_snippet').text().trim() || null,
        imageUrl: $('.game_header_image_full').attr('src') || null,
        developer: null,
        publisher: null,
        storeSpecificId: null,
    };

    $('.dev_row').each((i, el) => {
        const row = $(el);
        const titleEl = row.find('.subtitle').text().trim();
        const valueEl = row.find('a').text().trim();
        if (titleEl === 'Developer:') {
            data.developer = valueEl || null;
        } else if (titleEl === 'Publisher:') {
            data.publisher = valueEl || null;
        }
    });

    const appIdMatch = url.match(/app\/(\d+)/);
    if (appIdMatch && appIdMatch[1]) {
        data.storeSpecificId = appIdMatch[1];
    }

    return data;
}

module.exports = {
    scrape,
};