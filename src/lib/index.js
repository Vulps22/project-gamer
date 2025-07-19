// lib/index.js

const db = require('./database.js');
const { logger } = require('./logger.js');

module.exports = {
    db,
    logger
};