const { Events, Client } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    /**
     * @param {Client} client
     * @returns
     */
    async execute(client) {

        console.log(`Shard ${client.shard.ids[0]} is ready with ${client.guilds.cache.size} servers!`);
    },
};