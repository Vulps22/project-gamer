// eslint-disable-next-line no-unused-vars
const { MessageCreateOptions, Channel, Snowflake } = require('discord.js');
const { config, ConfigOption } = require('../config.js');
const { clientProvider } = require('../provider');

const logger = {

    /**
     * Logs a message to the log channel across shards.
     * @param {MessageCreateOptions | string} messageOptions
     * @returns {Promise<string|null>} - Resolves with the message ID if sent successfully, or null if unsuccessful.
     */
    async log(messageOptions) {
        if (!messageOptions) {
            console.error('Message options must be provided.');
            return null;
        }

        const channelId = config.get(ConfigOption.DISCORD_LOG_CHANNEL);
        return await sendTo(messageOptions, channelId);
    },

    /**
     *
     * @param messageId {string}
     * @param messageOptions {MessageCreateOptions | string}
     * @returns {Promise<boolean|null>}
     */
    async editLog(messageId, messageOptions) {
        if (!messageId || !messageOptions) {
            console.error('Message ID and message options must be provided.');
            return null;
        }

        const channelId = config.get(ConfigOption.DISCORD_LOG_CHANNEL);
        return await sendEdit(channelId, messageId, messageOptions);
    },

    /**
     *
     * @param messageOptions {MessageCreateOptions | string}
     * @returns {Promise<null>}
     */
    async error(messageOptions) {
        if (!messageOptions) {
            console.error('Message options must be provided.');
            return null;
        }

        const channelId = config.get(ConfigOption.DISCORD_ERROR_CHANNEL);
        await sendTo(messageOptions, channelId);
    },

};

module.exports = {
    logger
};

    /**
     * Sends a message to a specific channel of the support server across shards.
     * @param {MessageCreateOptions} messageOptions - The message options (content, embeds, etc.) to be sent.
     * @param {string} channelId - The ID of the channel to send the message to.
     * @returns {Promise<string|null>} - Resolves with the message ID if sent successfully, or null if unsuccessful.
     */
async function sendTo(messageOptions, channelId) {
    if (!channelId) {
        console.error('Channel ID must be provided.');
        return null;
    }

    // if messageOptions is a string, convert it to an object and set content
    if (typeof messageOptions === 'string') messageOptions = { content: messageOptions };

    //console.log('Sending message to channel:', channelId, 'with options:', messageOptions);

    try {

        const client = clientProvider.getClient();
        if (!client) {
            console.error('Client instance is not available. Ensure it is set in the provider.');
            return null;
        }

        const result = await client.shard.broadcastEval(
            // eslint-disable-next-line no-shadow
            async (client, { channelId, messageOptions }) => {
                /**
                     * @type {Channel}
                     */
                const channel = client.channels.cache.get(channelId);

                // eslint-disable-next-line curly
                if (channel && channel.isTextBased()) {
                    try {
                        const options = { ...messageOptions, fetchReply: true };
                        const message = await channel.send(options);
                        return message.id;
                    } catch (error) {
                        console.error(`Error sending message in shard ${client.shard.ids[0]} to channel ${channelId}:`, error);
                        return false;
                    }
                }
                return false;
            },
            { context: { channelId, messageOptions } },
        );

        const messageId = result.find(id => id !== false);
        return messageId || null;
    } catch (error) {
        console.error(`Failed to broadcast message to channel ${channelId}:`, error);
        return null;
    }
}

    /**
     * Edits a message in a specific channel across shards.
     * @param {Snowflake} channelId
     * @param {Snowflake} messageId
     * @param {MessageCreateOptions} messageOptions
     * @returns {Promise<boolean>} - Resolves to true if the message was edited successfully, false otherwise.
     */
async function sendEdit(channelId, messageId, messageOptions) {
    if (!messageId || !messageOptions || !channelId) {
        console.error('Message ID, Channel ID and message options must be provided.');
        return null;
    }

    const client = clientProvider.getClient();

    if (!client) {
        console.error('Client instance is not available. Ensure it is set in the provider.');
        return null;
    }

    const results = await client.shard.broadcastEval(
        async (client, {
            channelId, messageId, messageOptions }) => {
        const channel = client.channels.cache.get(channelId);

        if (!channel || !channel.isTextBased()) {
          return false;
        }

        try {
          const message = await channel.messages.fetch(messageId);

          if (message) {
            await message.edit(messageOptions);
          }
        } catch (error) {
          console.error(`Error editing message in shard ${client.shard.ids[0]}:`, error);
          return false;
        }

        return true;
      }, {
        context: { channelId, messageId, messageOptions }
      },
    );

    return results.some(success => success === true);
}