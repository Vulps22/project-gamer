// src/services/GameManagerService.js
const { Snowflake } = require('discord.js'); // Import Snowflake type for userId
const { db, logger } = require('../lib');
const { clientProvider } = require('../provider');
const { storeManager } = require('./'); // Import the StoreManagerService

const gameStatus = {
    APPROVED: 'approved',
    PENDING: 'pending',
    REJECTED: 'rejected',
}


class GameManagerService {
    async init() {
        if (GameManagerService.instance) {
            return GameManagerService.instance;
        }
        GameManagerService.instance = this;
        console.log('GameManagerService initialized.');
    }

    async registerGameFromUrl(url, userId) {
    try {
        const gameDataFromStore = await storeManager.fetchGameDataFromUrl(url);
        console.log(`GameManagerService: Scraped data for URL <${url}>:`, gameDataFromStore);

        if (gameDataFromStore.error && !gameDataFromStore.title) {
            const errorMessage = gameDataFromStore.error;
            logger.error(`GameManagerService: Failed to process URL <${url}>. Reason: ${errorMessage}`);
            return { submission: null, error: errorMessage };
        }

        // --- CHANGE 1: Destructure imageURL from the scraped data ---
        const { storeName, storeUrl, error, title, storeGameId, imageURL } = gameDataFromStore;

        const [store] = await db.query('SELECT id FROM store WHERE name = ?', [storeName]);

        if (!store) {
            // Unrecognized store logic remains the same...
            logger.log(`Unrecognized store "${storeName}" from URL <${url}>. Creating a pending submission.`);
            await db.insert('gameSubmissions', { url: url, submittedBy: userId });
            return {
                submission: { url: storeUrl, status: gameStatus.PENDING },
                error: null,
            };
        } else {
            // The store is supported...
            if (!title) {
                const errorMessage = 'Could not determine game title from a supported store URL.';
                logger.error(`GameManagerService: ${errorMessage} (URL: <${url}>)`);
                return { submission: null, error: errorMessage };
            }

            const storeId = store.id;
            let gameId;

            const [existingLink] = await db.query(
                'SELECT gameId FROM gameStore WHERE storeId = :storeId AND storeGameId = :storeGameId',
                { storeId: storeId, storeGameId: storeGameId }
            );

            if (existingLink) {
                gameId = existingLink.gameId;
            } else {
                const [existingGame] = await db.query('SELECT id, imageURL FROM game WHERE name = ?', [title]);

                if (existingGame) {
                    gameId = existingGame.id;
                    
                    // --- CHANGE 2: If the game exists but is missing an imageURL, update it. ---
                    if (!existingGame.imageURL && imageURL) {
                        logger.log(`GameManagerService: Found existing game "${title}" (ID: ${gameId}) and updating its missing imageURL.`);
                        await db.query('UPDATE game SET imageURL = ? WHERE id = ?', [imageURL, gameId]);
                    }

                } else {
                    // --- CHANGE 3: When inserting a NEW game, include the imageURL. ---
                    logger.log(`GameManagerService: Creating new game entry for "${title}" with imageURL.`);
                    gameId = await db.insert('game', {
                        name: title,
                        status: 'APPROVED',
                        imageURL: imageURL // Using your casing
                    });
                }
                
                // This part remains the same
                await db.insert('gameStore', { gameId, storeId, storeGameId, url: storeUrl, status: 'APPROVED' });
            }

            return {
                submission: {
                    url: storeUrl,
                    status: 'APPROVED',
                    gameId: gameId,
                },
                error: null,
            };
        }
    } catch (error) {
        logger.error(`Critical error in registerGameFromUrl for URL <${url}>:`);
        console.error(error);
        return { submission: null, error: 'An unexpected internal error occurred.' };
    }
}

    /**
     * 
     * @param {Snowflake} userId 
     * @param {number} gameStoreId 
     * @returns {Promise<boolean>} - Returns true if the game was added successfully, false otherwise.
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
                return true
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

    // Stub other methods as their implementation will depend more on your specific DB schema
    // and other parts of your application.

    async removeGameFromUserLibrary(userId, gameIdOrName) {
        console.log('removeGameFromUserLibrary called with:', userId, gameIdOrName);
        // 1. Find gameId if name is given
        // 2. db.delete('user_games', 'user_id = ? AND game_id = ?', [userId, gameId]);
        return false; // Placeholder
    }

    async getUsersForGame(gameId, guildId) {
        console.log('getUsersForGame called with:', gameId, guildId);
        const sql = `SELECT DISTINCT
                u.id
            FROM
                user AS u
            INNER JOIN
                serverUser AS su ON u.id = su.userId
            INNER JOIN
                userLibrary AS ul ON u.id = ul.userId
            INNER JOIN
                gameStore AS gs ON ul.gameStoreId = gs.id
            WHERE
                su.serverId = :serverId
                AND gs.gameId = :gameId
                AND su.sharing = 1;`;

        let ids = await db.query(sql, { serverId: guildId, gameId: gameId });

        const client = clientProvider.getClient();
        if (!client) {
            console.error('Client instance is not available.');
            return [];
        }

        const users = ids.map(row => {
            const user = client.users.cache.get(row.id);
            return {
                id: row.id,
                username: user ? user.username : 'Unknown User',
            }
        });
        console.log('getUsersForGame found users:', users);

        return users;

    }

    async getGameById(gameId) {
        console.log('getGameById called with:', gameId);
        const sql = 'SELECT * FROM game WHERE id = ?';
        const results = await db.query(sql, [gameId]);
        console.log('getGameById results:', results[0]);
        return results[0] || null; // Return the first result or null if not found
    }

    async getStoreUrlsForGame(gameId) {
        console.log('getStoreUrlsForGame called with:', gameId);
        const sql = `
        SELECT
            s.name,
            gs.url
        FROM
            gameStore AS gs
        INNER JOIN
            store AS s ON gs.storeId = s.id
        WHERE
            gs.gameId = ?;
    `;
        return await db.query(sql, [gameId]);
    }

    /**
     * Searches for games by name, ordered by popularity limited to 25 results.
     * @param {string} name 
     * @returns 
     */
    async searchGamesByName(name) {
        console.log('searchGamesByName (by popularity) called with:', name);
        const sql = `
        SELECT
            g.id,
            g.name,
            COUNT(ul.id) AS popularity
        FROM
            game AS g
        LEFT JOIN gameStore AS gs ON g.id = gs.gameId
        LEFT JOIN userLibrary AS ul ON gs.id = ul.gameStoreId
        WHERE
            g.name LIKE :name
        GROUP BY
            g.id, g.name
        ORDER BY
            popularity DESC, g.name ASC
        LIMIT 20;`;

        return await db.query(sql, { name: `%${name}%` });
    }

    /**
 * Gets all stores for a given game that the user does not already have in their library.
 * @param {string} gameId The ID of the game.
 * @param {string} userId The ID of the user to check against.
 * @returns {Promise<Array<object>>} A filtered array of store objects.
 */
    async getStoresForGame(gameId, userId) {
        console.log(`getStoresForGame called for gameId: ${gameId}, excluding stores for userId: ${userId}`);

        // The ? placeholders are positional. The first '?' will be userId, the second will be gameId.
        const sql = `
        SELECT
            gs.id,
            s.name
        FROM
            gameStore AS gs
        INNER JOIN
            store AS s ON gs.storeId = s.id
        LEFT JOIN
            userLibrary AS ul ON gs.id = ul.gameStoreId AND ul.userId = ?
        WHERE
            gs.gameId = ? AND ul.id IS NULL;
    `;

        // The order of parameters in this array MUST match the order of the '?' in the SQL.
        const results = await db.query(sql, [userId, gameId]);

        if (!results || results.length === 0) {
            return [];
        }

        return results;
    }
}

const gameManagerInstance = new GameManagerService();
module.exports = {
    gameManager: gameManagerInstance,
    gameStatus: gameStatus,
};