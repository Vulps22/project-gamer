// scrapers/index.js

const steam = require('./steamScraper.js')
const gog = require('./gogScraper.js')
const meta = require('./metaScraper.js')

module.exports = {
    steam,
    gog,
    meta,
    findScraperByName(name) {
        switch (name.toLowerCase()) {
            case "steam":
                return steam;
            case "gog":
                return gog;
            case "meta":
                return meta;
        }
    }
};