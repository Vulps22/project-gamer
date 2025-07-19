// src/services/UserLibraryManagerService.js

const { Snowflake } = require('discord.js');
const { db, logger } = require('../lib');

class UserLibraryManagerService {
    constructor() {
        if (UserLibraryManagerService.instance) {
            return UserLibraryManagerService.instance;
        }
        UserLibraryManagerService.instance = this;
        this.isInitialized = false;
        console.log('UserLibraryManagerService created (not yet initialized).');
    }

    async init() {
        if (this.isInitialized) {
            console.warn('UserLibraryManagerService already initialized.');
            return;
        }
        console.log('UserLibraryManagerService initializing...');
        // Any specific initialization logic for UserLibraryManagerService if needed
        this.isInitialized = true;
        console.log('UserLibraryManagerService initialized.');
    }

    /**
     *
     * @param {Snowflake} userId
     * @param {number} gameStoreId
     * @returns {Promise<boolean>} - Returns true if the game was added successfully, false otherwise.
     * @deprecated Use UserLibraryManagerService instead.
     */
    async addGameToUserLibrary(userId, gameStoreId) {

        console.log('addGameToUserLibrary called with:', userId, gameStoreId);

        try {
            const [existingLink] = await db.query(
                'SELECT id FROM userLibrary WHERE userId = ? AND gameStoreId = ?',
                [userId, gameStoreId]
            );

            if (existingLink) {
                logger.log(`User ${userId} already has game ${gameStoreId} in their library.`);
                return true;
            }

            const result = await db.insert('userLibrary', {
                userId: userId,
                gameStoreId: gameStoreId,
            });

            if (!result) {
                logger.error(`Failed to add game ${gameStoreId} for user ${userId}.`);
                return false;
            }

            logger.log(`Added game ${gameStoreId} to user ${userId}'s library.`);

            return true; // Assumes this returns the new ID
        } catch (error) {
            logger.error(`Error adding game ${gameStoreId} for user ${userId}:`);
            console.error(`Error adding game ${gameStoreId} for user ${userId}:`, error);
            return false; // Return an error status
        }
    }

    /**
     * Synchronizes a user's game library with the bot's database.
     * Adds all provided gameStoreIds to the user's library if they don't already exist.
     * @param {Snowflake} discordUserId The Discord User ID.
     * @param {Array<number>} gameStoreIds An array of gameStoreIds to add to the user's library.
     * @returns {Promise<number>} Count of games added to the user's library.
     */
    async syncUserLibrary(discordUserId, gameStoreIds) {
        logger.log(`UserLibraryManagerService: Starting library sync for user ${discordUserId}. ${gameStoreIds.length} games to process.`);

        if (!gameStoreIds || gameStoreIds.length === 0) {
            logger.log(`UserLibraryManagerService: No games to sync for user ${discordUserId}.`);
            return 0;
        }

        let addedToUserLibrary = 0;

        try {
            // Fetch all existing user library entries for this user
            const existingUserLibraryEntries = await db.query(
                'SELECT gameStoreId FROM userLibrary WHERE userId = ?',
                [discordUserId]
            );
            const userGameStoreIds = new Set(existingUserLibraryEntries.map(entry => entry.gameStoreId));

            // Filter out games that are already in the user's library
            const gamesToAdd = gameStoreIds.filter(gameStoreId => !userGameStoreIds.has(gameStoreId));

            if (gamesToAdd.length === 0) {
                logger.log(`UserLibraryManagerService: All games already in user ${discordUserId}'s library.`);
                return 0;
            }

            // Batch insert the new games into the user's library
            const insertPromises = gamesToAdd.map(gameStoreId =>
                db.insert('userLibrary', {
                    userId: discordUserId,
                    gameStoreId: gameStoreId,
                })
            );

            await Promise.all(insertPromises);
            addedToUserLibrary = gamesToAdd.length;

            logger.log(`UserLibraryManagerService: Library sync for user ${discordUserId} completed. Added ${addedToUserLibrary} games to user library.`);
            return addedToUserLibrary;

        } catch (error) {
            logger.error(`UserLibraryManagerService: Error during library synchronization for user ${discordUserId}: ${error.message}`);
            console.error(`UserLibraryManagerService: Error during library synchronization for user ${discordUserId}:`, error);
            throw new Error(`Failed to synchronize user library: ${error.message}`);
        }
    }

}

// Export a single instance of the service
const userLibraryManagerServiceInstance = new UserLibraryManagerService();
module.exports = { userLibraryManagerService: userLibraryManagerServiceInstance };
