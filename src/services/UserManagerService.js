const { Snowflake } = require('discord.js');
const db = require('../lib/database'); // Your database singleton

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
        try {
            const [existingLink] = await db.query(
                "SELECT * FROM serverUser WHERE userId = :userId AND serverId = :serverId",
                {userId: userId, serverId: serverId}
            );
            console.log("serverUser query result:", existingLink);
            if (existingLink || existingLink === undefined) {
                return;
            }

            await db.insert('serverUser', {
                userId: userId,
                serverId: serverId,
            });
        }
        catch (error) {
            console.error(`Error adding user ${userId} to server ${serverId}:`, error);
            throw error;
        }
    }

    async setSharing(userId, serverId, enabled) {
        try {
            const [existingLink] = await db.query(
                "SELECT * FROM serverUser WHERE userId = :userId AND serverId = :serverId",
                { userId: userId, serverId: serverId }
            );

            if (!existingLink) {
                throw new Error(`User ${userId} is not linked to server ${serverId}`);
            }

            await db.update('serverUser', { sharing: enabled }, 'serverId = ? AND userId = ?', [ serverId, userId ]);

        } catch (error) {
            console.error(`Error setting sharing for user ${userId} on server ${serverId}:`, error);
            throw error;
        }
    }
}

const userManagerServiceInstance = new UserManagerService();
module.exports = userManagerServiceInstance;