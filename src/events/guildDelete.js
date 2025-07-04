// eslint-disable-next-line no-unused-vars
const { Events, Client, Guild } = require('discord.js');
const { logger } = require('../lib');

const { serverManagerService } = require('../services');

module.exports = {
    name: Events.GuildDelete,
    /**
     * @param {Guild} guild
     */
    async execute(guild) {

        logger.log(`Left Server ${guild.id} - ${guild.name} (${guild.memberCount} members)`);
        await serverManagerService.deleteServer(guild.id);
    },
};