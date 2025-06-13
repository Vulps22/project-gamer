// src/services/GameManagerService.js

const db = require('../lib/database'); // Your database singleton
const { logger } = require('../lib/logger');
const storeManager = require('./StoreManagerService'); // Import the StoreManagerService
// const { logger } = require('../lib/logger'); // If you want to use your logger

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

            if (gameDataFromStore.error) {

                // We only need a URL for a submission, not a title.
                // But if the scraper itself throws an error (e.g., invalid URL), we should stop.
                const errorMessage = gameDataFromStore.error;

                logger.error(`GameManagerService: Failed to process URL <${url}>. Reason: ${errorMessage}`);

                return { submission: null, error: errorMessage };
            }

            // Destructure all data. Title is still needed for the "approved store" workflow.
            const { storeName, storeUrl, error, title, storeGameId } = gameDataFromStore;

            const [store] = await db.query('SELECT id FROM store WHERE name = ?', [storeName]);

            if (!store) {
                // --- The store is unrecognized. Add ONLY the URL and user to the submissions queue. ---
                logger.log(`Unrecognized store "${storeName}" from URL <${url}>. Creating a pending submission.`);

                await db.insert('gameSubmissions', {
                    url: url,
                    submittedBy: userId,
                    // 'status' will default to 'pending' in the database.
                });

                return {
                    submission: {
                        url: storeUrl,
                        status: gameStatus.PENDING, // Use the constant for clarity
                    },
                    error: null,
                };

            } else {
                // --- The store is supported, proceed with the original, robust logic ---

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
                    const [existingGame] = await db.query('SELECT id FROM game WHERE name = ?', [title]);

                    if (existingGame) {
                        gameId = existingGame.id;
                    } else {
                        gameId = await db.insert('game', { name: title, status: 'APPROVED' });
                    }
                    await db.insert('gameStore', { gameId, storeId, storeGameId, url: storeUrl, status: 'APPROVED' });
                }

                return {
                    submission: { // Use a consistent return shape
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

    async addGameToUserLibrary(userId, gameId) {
        try {
            const [existingLink] = await db.query(
                'SELECT id FROM userGames WHERE userId = ? AND gameId = ?',
                [userId, gameId]
            );

            if (existingLink) {
                logger.info(`User ${userId} already has game ${gameId} in their library.`);
                return existingLink.id;
            }

            const result = await db.insert('userGames', {
                userId: userId,
                gameId: gameId,
            });

            logger.info(`Added game ${gameId} to user ${userId}'s library.`);

            return result; // Assumes this returns the new ID
        } catch (error) {
            logger.error(`Error adding game ${gameId} for user ${userId}:`, error);
            return null;
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
        // const sql = `
        //     SELECT ug.user_id FROM user_games ug
        //     JOIN server_user_sharing sus ON ug.user_id = sus.user_id AND sus.guild_id = ?
        //     WHERE ug.game_id = ? AND sus.sharing_enabled = TRUE
        // `;
        // const users = await db.query(sql, [guildId, gameId]);
        // return users.map(u => u.user_id);
        return []; // Placeholder
    }

    async getStoreUrlsForGame(gameId) {
        console.log('getStoreUrlsForGame called with:', gameId);
        // const sql = 'SELECT store_name, url FROM game_stores WHERE game_id = ? AND is_verified_by_admin = TRUE';
        // return db.query(sql, [gameId]);
        return []; // Placeholder
    }

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

    async getStoresForGame(gameId) {
        console.log('getStoresForGame called with:', gameId);
        const sql = `
            SELECT gs.storeId AS id, s.name AS name
            FROM gameStore AS gs
            JOIN store AS s ON gs.storeId = s.id
            WHERE gs.gameId = ?
        `;
        return await db.query(sql, [gameId]);
    }
}

const gameManagerInstance = new GameManagerService();
module.exports = {
    gameManager: gameManagerInstance,
    gameStatus: gameStatus,
};