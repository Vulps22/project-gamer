
const { db } = require('../lib');

class ServerManagerService {
  async init() {
        if (ServerManagerService.instance) {
            return ServerManagerService.instance;
        }

        ServerManagerService.instance = this;
        console.log('ServerManagerService initialized.');
    }

    async getServerById(serverId) { 

        try {
            const server = await db.query('SELECT * FROM server WHERE id = :serverId', { serverId: serverId });
            console.log(`Fetched server with ID ${serverId}:`, server);
            return server;

        } catch (error) {
            console.error(`Error fetching server with ID ${serverId}:`, error);
            throw error;
        }

    }

    async createServer(serverId) {

        console.log(`Creating server with ID ${serverId}`);

        try {
            await db.insert('server', { id: serverId });

            return serverId;
        } catch (error) {
            console.error(`Error creating server with ID ${serverId}:`, error);
            throw error;
        }

    }

    async getOrCreateServer(serverId) {
        try {
            let server = await this.getServerById(serverId);

            if (!server || server.length === 0) {
                console.log(`Server with ID ${serverId} not found. Creating a new server.`);
                server = await this.createServer(serverId);
            }
            console.log(`Returning server with ID ${serverId}:`, server);

            return server;
        } catch (error) {
            console.error(`Error getting or creating server with ID ${serverId}:`, error);
            throw error;
        }
    }

    async deleteServer(serverId) {
        try {
            const result = await db.query('DELETE FROM server WHERE id = :serverId', { serverId: serverId });

            if (result.affectedRows === 0) {
                console.warn(`No server found with ID ${serverId} to delete.`);
                return false;
            }

            console.log(`Server with ID ${serverId} deleted successfully.`);
            return true;

        } catch (error) {
            console.error(`Error deleting server with ID ${serverId}:`, error);
            throw error;
        }
    }

}

const serverManagerServiceInstance = new ServerManagerService();
module.exports = serverManagerServiceInstance;