const { Snowflake } = require('discord.js');
const { db, logger } = require('../lib');

class UserManagerService {
    async init() {
        if (UserManagerService.instance) {
            return UserManagerService.instance;
        }
        UserManagerService.instance = this;
        console.log('UserManagerService initialized.');
    }

    /**
     * Find the user by their Discord ID.
     * @param {Snowflake} userId
     * @returns
     */
    async getUserById(userId) {

        try {
            const [user] = await db.query('SELECT * FROM user WHERE id = :userId', { userId: userId });
            return user;
        } catch (error) {
            console.error(`Error fetching user with ID ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Create a new user in the database.
     * @param {Snowflake} userId
     * @returns {Snowflake} The ID of the newly created user.
     */
    async createUser(userId) {

        logger.log(`Creating user with ID ${userId}`);

        try {
            await db.insert('user', { id: userId });
            return userId; // Assuming the database returns the ID of the newly created user
        } catch (error) {
            console.error(`Error creating user with ID ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get a user by their ID, or create them if they do not exist.
     * @param {Snowflake} userId
     * @returns {Snowflake} The ID of the user, either fetched or newly created.
     */
    async getOrCreateUser(userId) {
        try {
            let user = await this.getUserById(userId);

            if (!user || user.length === 0) {
                user = await this.createUser(userId);
            }
            return user;
        } catch (error) {
            console.error(`Error getting or creating user with ID ${userId}:`, error);
            throw error;
        }
    }

    async addUserToServer(userId, serverId) {

        // console.log(`Adding user ${userId} to server ${serverId}`);

        try {
            const existingLink = await db.query(
                'SELECT * FROM serverUser WHERE userId = :userId AND serverId = :serverId',
                { userId: userId, serverId: serverId }
            );
            // console.log("serverUser query result:", existingLink);
            if (existingLink.length > 0) {
                // console.log(`User ${userId} is already linked to server ${serverId}`);
                return;
            }

            console.log(`User ${userId} is not linked to server ${serverId}, adding...`);
            await db.insert('serverUser', {
                userId: userId,
                serverId: serverId,
            });
        } catch (error) {
            console.error(`Error adding user ${userId} to server ${serverId}:`, error);
            throw error;
        }
    }

    async setSharing(userId, serverId, enabled) {
        try {
            const [existingLink] = await db.query(
                'SELECT * FROM serverUser WHERE userId = :userId AND serverId = :serverId',
                { userId: userId, serverId: serverId }
            );

            if (!existingLink) {
                return false;
            }

            await db.update('serverUser', { sharing: enabled }, 'serverId = ? AND userId = ?', [ serverId, userId ]);
            return true;

        } catch (error) {
            console.error(`Error setting sharing for user ${userId} on server ${serverId}:`, error);
            throw error;
        }
    }

    /**
     * Set the user's Steam ID in the database.
     * This will link the user's Discord account with their Steam account.
     * If the user already has a Steam ID linked, it will update it.
     * Leaving steamId as null will unlink the account.
     * @param {Snowflake} userId
     * @param {number} steamId
     */
    async linkSteamAccount(userId, steamId = null) {
        try {
            // Check if the user already has a linked Steam account
            const user = await db.query(
                'SELECT * FROM user WHERE id = :userId',
                { userId: userId }
            );

            if (user) {
                await db.update('user', { steamId: steamId }, 'id = ?', [userId]);
            }

            console.log(`Steam account linked for user ${userId} with Steam ID ${steamId}`);
        } catch (error) {
            console.error(`Error linking Steam account for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get the Steam ID for a given Discord user ID.
     * @param {Snowflake} userId The Discord User ID.
     * @returns {Promise<string|null>} The Steam ID if found, otherwise null.
     */
    async getSteamIdForUser(userId) {
        try {
            const [user] = await db.query('SELECT steamId FROM user WHERE id = ?', [userId]);
            return user ? user.steamId : null;
        } catch (error) {
            logger.error(`Error fetching Steam ID for user ${userId}: ${error.message}`);
            console.error(`Error fetching Steam ID for user ${userId}:`, error);
            return null;
        }
    }
}

const userManagerService = new UserManagerService();
module.exports = userManagerService;