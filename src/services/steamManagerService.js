// src/services/SteamManagerService.js

const config = require("../config");
const { db, logger } = require('../lib'); // Import db and logger
const crypto = require('node:crypto'); // For generating secure tokens

class SteamManagerService {

    constructor() {
        // Implement the singleton pattern
        if (SteamManagerService.instance) {
            return SteamManagerService.instance;
        }
        SteamManagerService.instance = this;
        this.isInitialized = false; // Add an initialization flag
    }

    /**
     * Initializes the SteamManagerService. This should be called once at startup.
     */
    async init() {
        if (this.isInitialized) {
            console.warn('SteamManagerService already initialized.');
            return;
        }

        console.log('SteamManagerService initializing...');
        // In the future, this is where you would load API keys,
        // establish connections, or set up any necessary data.

        this.isInitialized = true;
        console.log('SteamManagerService initialized.');
    }

    getToken() {
        return config.get(config.ConfigOption.STEAM_API_TOKEN)
    }

    /**
     * Generates a unique session token (CSRF token) for a Steam login workflow
     * and saves it to the database with an expiration time.
     * @param {string} userId The Discord user ID initiating the link.
     * @returns {Promise<string>} The generated session token.
     * @throws {Error} If the session token cannot be generated or saved.
     */
    async generateSession(userId) {
        try {
            // Generate a secure, random token
            const sessionToken = crypto.randomBytes(32).toString('hex'); // 64 character hex string

            // Set expiration for 15 minutes from now
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 15);

            await db.insert('steam_link_sessions', {
                token: sessionToken,
                userId: userId,
                expiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '), // Format for MySQL DATETIME
            });

            logger.log(`Generated Steam link session for user ${userId} with token: ${sessionToken.substring(0, 8)}...`);
            return sessionToken;
        } catch (error) {
            logger.error(`Error generating Steam link session for user ${userId}: ${error.message}`);
            console.error(`Error generating Steam link session for user ${userId}:`, error);
            throw new Error('Failed to generate Steam link session. Please try again.');
        }
    }
}

// Export a single instance of the service
const steamManagerServiceInstance = new SteamManagerService();
module.exports = steamManagerServiceInstance;
