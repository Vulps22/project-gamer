// eslint-disable-next-line no-unused-vars
const { Client } = require('discord.js');

/** @type {Client | null} */
let clientInstance = null;

module.exports = {
    /**
     * Sets the client instance. Should only be called once when the shard starts.
     * @param {Client} client - The discord.js client instance for this shard.
     */
    setClient: (client) => {
        if (clientInstance) {
            console.warn(`Shard ${client.shard?.ids[0] || 'N/A'}: Client instance is already set!`);
            return;
        }
        if (!client) throw new Error('Cannot set a null or undefined client instance.');

        console.log(`Shard ${client.shard?.ids[0] || 'N/A'}: Client instance set in provider.`);
        clientInstance = client;
    },

    /**
     * Gets the client instance. Throws an error if it hasn't been set.
     * @returns {Client} The discord.js client instance.
     */
    getClient: () => {
        if (!clientInstance) throw new Error('Client instance has not been set yet! Ensure setClient() is called at shard startup.');
        return clientInstance;
    },
};