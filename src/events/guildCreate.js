// eslint-disable-next-line no-unused-vars
const { Events, Client, Guild } = require('discord.js');
const { logger } = require('../lib/logger.js');

const serverManagerServiceInstance = require('../services/ServerManagerService.js');

module.exports = {
    name: Events.GuildCreate,
    /**
     * @param {Guild} guild
     */
    async execute(guild) {

        logger.log(`Joined Server ${guild.id} - ${guild.name} (${guild.memberCount} members)`);
        await serverManagerServiceInstance.getOrCreateServer(guild.id);
    },
};