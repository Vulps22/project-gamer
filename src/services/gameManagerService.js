// src/services/GameManagerService.js
const { Snowflake } = require('discord.js'); // Import Snowflake type for userId
const { db, logger } = require('../lib');
const { clientProvider } = require('../provider');
const storeManager = require('./storeManagerService'); // Import the StoreManagerService

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

        const { storeName, storeUrl, error, title, storeGameId, imageURL } = gameDataFromStore;

        const [store] = await db.query('SELECT id FROM store WHERE name = ?', [storeName]);

        if (!store) {

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
                        status: gameStatus.APPROVED,
                        imageURL: imageURL // Using your casing
                    });
                }

                // This part remains the same
                await db.insert('gameStore', { gameId, storeId, storeGameId, url: storeUrl, status: gameStatus.APPROVED });
            }

            return {
                submission: {
                    url: storeUrl,
                    status: gameStatus.APPROVED,
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
     * Adds specific game to user's library.
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

    /**
     * Removes the specified game from the user's library.
     * @param {Snowflake} userId User's ID.
     * @param {string} gameStoreId Game's ID or Name
     * @returns {Promise<{boolean}>} Whether the operation was successful.
     */
    async removeGameFromUserLibrary(userId, gameStoreId) {
        console.log('removeGameFromUserLibrary called with:', userId, gameStoreId);

        try {
            const results = await db.delete(`userLibrary`, `userId = ? AND gameStoreId = ?`, [userId, gameStoreId])

            if (!results || results === 0) {
                logger.error(`Failed to remove game ${gameStoreId} from user ${userId}.`)
                return false;
            }

            return true;
        } catch (error) {
            logger.error(`Error removing game ${gameStoreId} from user ${userId}`);
            console.error(`Error removing game ${gameStoreId} from user ${userId}`);

            return false;
        }
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
        const sql = 'SELECT * FROM game WHERE id = ?';
        const results = await db.query(sql, [gameId]);

        return results[0] || null;
    }

    async getIdByGame(game) {
        const sql = `SELECT gs.id FROM gameStore gs JOIN game g ON gs.gameId = g.id WHERE g.name = ?;`;
        const results = await db.query(sql, [game]);

        return results[0]?.id || null;
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
     * Searches for games by name, ordered by popularity limited to 25 results.
     * @param {string} name
     * @param {Snowflake} userId
     * @returns
     */
    async searchUserGamesByName(name, userId) {

        if(!userId) return [];

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
            AND ul.userId = :userId
        GROUP BY
            g.id, g.name
        ORDER BY
            popularity DESC, g.name ASC
        LIMIT 20;`;

        return await db.query(sql, { name: `%${name}%`, userId: userId});
    }

    /**
 * Gets all stores for a given game that the user does not already have in their library.
 * @param {string} gameId The ID of the game.
 * @param {string} userId The ID of the user to check against.
 * @returns {Promise<Array<object>>} A filtered array of store objects.
 */
    async getStoresForGame(gameId, userId) {
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

     /**
     * Finds all games in the master database that match a given list of store-specific IDs.
     * @param {number} storeId The internal ID of the store.
     * @param {string[]} storeGameIds An array of store-specific game IDs (e.g., Steam AppIDs).
     * @returns {Promise<Array<{gameStoreId: number, storeGameId: string}>>} A list of known games.
     */
    async getKnownGames(storeId, storeGameIds) {
        logger.log(`GameManagerService: Checking for ${storeGameIds.length} known games from store ID "${storeId}".`);
        if (!storeGameIds || storeGameIds.length === 0) {
            return []; // Return early if there's nothing to check.
        }

        try {
            // The storeId is now passed directly, no need to look it up.
            const sql = 'SELECT id as gameStoreId, storeGameId FROM gameStore WHERE storeId = ? AND storeGameId IN (?)';
            const results = await db.query(sql, [storeId, storeGameIds]);
            
            return results;
        } catch (error) {
            logger.error(`GameManagerService: Error in getKnownGames for store ID "${storeId}":`, error);
            // Re-throw the error to be handled by the caller (the sync command)
            throw error;
        }
    }

    /**
     * Adds brand new games to the master 'game' and 'gameStore' tables.
     * @param {number} storeId The internal ID of the store. 1= steam by defualt
     * @param {Array<object>} newGamesData Array of game objects from the Steam API.
     * @returns {Promise<number[]>} A list of the newly created internal gameStoreIds.
     */
    async registerNewGames(storeId = 1, newGamesData) {
        logger.log(`GameManagerService: Registering ${newGamesData.length} new games for store ID "${storeId}".`);
        if (!newGamesData || newGamesData.length === 0) {
            return [];
        }

        const steamStoreUrlBase = 'https://store.steampowered.com/app/';
        const newlyCreatedGameStoreIds = [];

        for (const gameData of newGamesData) {
            const steamAppId = String(gameData.appid);
            const gameName = gameData.name;
            const imageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/header.jpg`;
            const storeUrl = `${steamStoreUrlBase}${steamAppId}`;

            const conn = await db.getConnection();
            try {
                await conn.beginTransaction();

                let gameId;

                // 1. Check if the game already exists in the master 'game' table by name.
                const [existingGame] = await db.query('SELECT id FROM game WHERE name = ?', [gameName], conn);

                if (existingGame) {
                    // 2a. If it exists, use its ID.
                    gameId = existingGame.id;
                    logger.log(`GameManagerService: Found existing game entry for "${gameName}" (GameID: ${gameId}). Will link to Steam.`);
                } else {
                    // 2b. If not, create a new entry in the 'game' table.
                    gameId = await db.insert('game', {
                        name: gameName,
                        status: gameStatus.APPROVED,
                        imageURL: imageUrl,
                    }, conn);
                    logger.log(`GameManagerService: Created new game entry for "${gameName}" (GameID: ${gameId}).`);
                }

                // 3. Insert into 'gameStore' table with the correct gameId (either existing or new).
                // Use INSERT IGNORE to handle duplicates gracefully
                const insertResult = await db.query(
                    'INSERT IGNORE INTO gameStore (gameId, storeId, storeGameId, url, status) VALUES (?, ?, ?, ?, ?)',
                    [gameId, storeId, steamAppId, storeUrl, gameStatus.APPROVED],
                    conn
                );

                if (insertResult.affectedRows > 0) {
                    // New record was created
                    const newGameStoreId = insertResult.insertId;
                    await conn.commit();
                    newlyCreatedGameStoreIds.push(newGameStoreId);
                    logger.log(`GameManagerService: Registered game store link for "${gameName}" (GameStoreID: ${newGameStoreId}).`);
                } else {
                    // Record already existed, just commit and continue
                    await conn.commit();
                    logger.log(`GameManagerService: Game "${gameName}" (AppID: ${steamAppId}) already exists in gameStore. Skipping.`);
                }

            } catch (error) {
                await conn.rollback();
                logger.error(`GameManagerService: Failed to register game "${gameName}" (AppID: ${steamAppId}). Rolled back transaction.`, error);
                // Continue with other games - don't throw to avoid stopping the entire sync
            } finally {
                conn.release();
            }
        }

        return newlyCreatedGameStoreIds;
    }

    /**
     * Get all stores for a game.
     * @param gameId Game Id
     * @returns {Promise<*|*[]>} Array of all stores.
     */
    async getAllStoresForGame(gameId) {
        const sql = `
        SELECT
            gs.id,
            s.name
        FROM
            gameStore AS gs
        INNER JOIN
            store AS s ON gs.storeId = s.id
        WHERE
            gs.gameId = ?;
        `;

        const results = await db.query(sql, [gameId]);

        if (!results || results.length === 0) {
            return [];
        }

        return results;
    }
}

const gameManagerService = new GameManagerService();
module.exports = {
    gameManagerService: gameManagerService,
    gameStatus: gameStatus,
};