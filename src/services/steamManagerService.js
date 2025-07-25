// src/services/SteamManagerService.js
const { Snowflake } = require('discord.js');
const { config, ConfigOption } = require('../config');
const { db, logger } = require('../lib'); // Import db and logger
const crypto = require('node:crypto'); // For generating secure tokens
const userManagerService = require('./userManagerService');
const { default: axios } = require('axios');

// Steam OpenID endpoint
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const STEAM_API_BASE_URL = 'https://api.steampowered.com/';

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

    /**
     * Retrieve the Steam API token from the configuration.
     * @returns {string} The Steam API token from the configuration.
     */
    getToken() {
        return config.get(ConfigOption.STEAM_API_TOKEN);
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
                expiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
            });

            logger.log(`Generated Steam link session for user ${userId} with token: ${sessionToken.substring(0, 8)}...`);
            return sessionToken;
        } catch (error) {
            logger.error(`Error generating Steam link session for user ${userId}: ${error.message}`);
            console.error(`Error generating Steam link session for user ${userId}:`, error);
            throw new Error('Failed to generate Steam link session. Please try again.');
        }
    }

    /**
     * Creates a Steam login URL, generating a unique session token in the process.
     * This URL will redirect the user to Steam for authentication.
     * @param {string} userId The Discord user ID initiating the link.
     * @returns {Promise<string>} The constructed Steam OpenID login URL.
     * @throws {Error} If a session token cannot be generated or the base URL is not configured.
     */
    async getSessionURL(userId) {
        try {
            // Generate a session token for the current user
            const sessionToken = await this.generateSession(userId);

            // Get the bot's base URL from configuration
            const baseUrl = config.get(ConfigOption.BASE_URL);

            if (!baseUrl) {
                const errorMessage = 'BASE_URL is not configured. Cannot generate Steam login URL.';
                logger.error(errorMessage);
                throw new Error(errorMessage);
            }

            // Construct the return_to URL for Steam's callback
            const returnToUrl = `${baseUrl}/auth/steam/callback?state=${sessionToken}`;

            // Construct the Steam login URL with OpenID parameters
            const steamLoginURL = `${STEAM_OPENID_URL}` +
                '?openid.ns=http://specs.openid.net/auth/2.0' +
                '&openid.mode=checkid_setup' +
                `&openid.return_to=${encodeURIComponent(returnToUrl)}` +
                `&openid.realm=${encodeURIComponent(baseUrl)}` +
                '&openid.identity=http://specs.openid.net/auth/2.0/identifier_select' +
                '&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select';

            logger.log(`Generated Steam login URL for user ${userId}: ${steamLoginURL}`);
            return steamLoginURL;
        } catch (error) {
            logger.error(`Error creating Steam login URL: ${error.message}`);
            console.error('Error creating Steam login URL:', error);
            throw new Error('Failed to create Steam login URL. Please try again.');
        }
    }

    /**
     * Validates a Steam login session token. Fetches the session from the database,
     * checks its expiration, and cleans it up after validation (whether successful or not).
     * @param {string} token The session token received from the Steam callback.
     * @returns {Promise<{userId: string, expiresAt: Date} | null>} An object containing userId and expiresAt if valid, otherwise null.
     */
    async validateSession(token) {
        try {
            const [session] = await db.query('SELECT userId, expiresAt FROM steam_link_sessions WHERE token = ?', [token]);

            if (!session) {
                logger.error(`Invalid or non-existent state token received during validation: ${token}`);
                return null;
            }

            // Convert expiresAt to Date object for comparison
            const expiresAtDate = new Date(session.expiresAt);

            if (new Date() > expiresAtDate && config.get(ConfigOption.ENVIRONMENT) !== 'dev') {
                logger.error(`Expired state token found for user ${session.userId}: ${token}`);
                // Clean up expired token immediately
                await this.burnSession(token);
                return null;
            }

            // If valid, return the user ID and expiration date
            // The token will be deleted after being consumed in index.js to prevent replay
            return { userId: session.userId, expiresAt: expiresAtDate };

        } catch (error) {
            logger.error(`Error validating Steam session token ${token}: ${error.message}`);
            console.error(`Error validating Steam session token ${token}:`, error);
            // Re-throw to indicate a deeper system issue, not just an invalid token
            throw new Error('An internal error occurred during session validation.');
        }
    }

    /**
     * Cleans up expired or invalid Steam link sessions from the database.
     * This should be called periodically to maintain the integrity of the session store.
     * Will be called once every hour from index.js
     */
    async cleanupExpiredSessions() {
        try {
            // Delete sessions that have expired
            const result = await db.delete('steam_link_sessions', 'expiresAt < NOW()');
            logger.log(`Cleaned up ${result.affectedRows} expired Steam link sessions.`);
        } catch (error) {
            logger.error(`Error cleaning up expired Steam link sessions: ${error.message}`);
            console.error('Error cleaning up expired Steam link sessions:', error);
        }
    }

    /**
     * Deletes a Steam link session by its token.
     * This is useful for manual cleanup or when a user explicitly unlinks their Steam account.
     * @param {string} token The session token to delete.
     * @returns {Promise<void>}
     */
    async burnSession(token) {
        try {
            await db.delete('steam_link_sessions', 'token = ?', [token]);
        } catch (error) {
            logger.error(`Error deleting Steam link session for token ${token}: ${error.message}`);
            console.error(`Error deleting Steam link session for token ${token}:`, error);
            throw new Error('Failed to delete Steam link session. Please try again.');
        }
    }

    /**
     * Fetches the user's Steam Library in JSON format from the Steam API.
     * @param {string} steamId The Discord User ID of the user.
     * @returns {Promise<object[]|null>} An array of game objects if successful, otherwise null.
     */
    async getSteamLibrary(steamId) {
        try {
            if (!steamId) {
                logger.warn(`User ${steamId} is not linked to a Steam account.`);
                return null; // User is not linked
            }

            const apiKey = this.getToken(); // Using the renamed method
            if (!apiKey) {
                logger.error('Steam API Key is not configured.');
                throw new Error('Steam API Key is missing in configuration.');
            }

            const url = `${STEAM_API_BASE_URL}IPlayerService/GetOwnedGames/v1/` +
                `?key=${apiKey}` +
                `&steamid=${steamId}` +
                '&format=json' +
                '&include_appinfo=1' + // Include app names and icons
                '&include_played_free_games=1'; // Include free games if desired

            logger.log(`Fetching Steam library for Steam ID: ${steamId}...`);
            const response = await axios.get(url);

            if (response.data && response.data.response && response.data.response.games) {
                const games = response.data.response.games;
                console.log(`Successfully fetched Steam library for steam user ${steamId}. Found ${games.length} games.`);
                // For debugging, dump the whole library (or first few games)
                console.log(JSON.stringify(games.slice(0, 5), null, 2)); // Log first 5 games for brevity
                return games;
            } else {
                logger.warn(`Steam API did not return expected game data for Steam ID ${steamId}. Response: ${JSON.stringify(response.data)}`);
                return null; // No games found or unexpected response structure
            }
        } catch (error) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                logger.error(`Steam API Error (Status: ${error.response.status}): ${error.response.data.apimessage || error.message}`);
                console.error('Steam API Error Response Data:', error.response.data);
            } else if (error.request) {
                // The request was made but no response was received
                logger.error(`No response received from Steam API: ${error.message}`);
            } else {
                // Something else happened in setting up the request that triggered an Error
                logger.error(`Error setting up Steam API request: ${error.message}`);
            }
            console.error(`Full error during Steam library fetch for user ${steamId}:`, error);
            throw new Error('Failed to fetch Steam library. Check logs for details.');
        }
    }

}

// Export a single instance of the service
const steamManagerServiceInstance = new SteamManagerService();
module.exports = steamManagerServiceInstance;
