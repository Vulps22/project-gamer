const { Events, Client, Guild } = require('discord.js');
const { logger } = require('../lib');

const { serverManagerService } = require('../services');

module.exports = {
    name: Events.GuildCreate,
    /**
     * @param {Guild} guild
     */
    async execute(guild) {

        logger.log(`Joined Server ${guild.id} - ${guild.name} (${guild.memberCount} members)`);
        await serverManagerService.getOrCreateServer(guild.id);
    },
};