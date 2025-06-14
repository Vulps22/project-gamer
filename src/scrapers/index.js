// scrapers/index.js

const generic = null; // TODO: Change this later, generic is referenced in StoreManagerService.
const steam = require('./steamScraper.js')
const gog = require('./gogScraper.js')
const meta = require('./metaScraper.js')

module.exports = {
    generic,
    steam,
    gog,
    meta,
    findScraperByName(name) {
        switch (name.toLowerCase()) {
            case "generic":
                return generic;
            case "steam":
                return steam;
            case "gog":
                return gog;
            case "meta":
                return meta;
        }
    }
};