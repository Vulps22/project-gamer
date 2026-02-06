// /structures/BotInteraction.js
const { MessageFlags, Interaction, PermissionsBitField } = require('discord.js');

// Discord API Error Codes that are expected and non-critical
const EXPECTED_DISCORD_ERRORS = {
    UNKNOWN_INTERACTION: 10062,           // Interaction expired or already used
    INTERACTION_ALREADY_ACKNOWLEDGED: 40060, // Interaction already acknowledged
    UNKNOWN_MESSAGE: 10008,               // Message was deleted
    MISSING_ACCESS: 50001,                // Bot lost channel access
    MISSING_PERMISSIONS: 50013,           // Bot missing permissions
};

// Error messages for logging
const ERROR_MESSAGES = {
    10062: 'Interaction expired or was already acknowledged',
    40060: 'Interaction was already acknowledged',
    10008: 'Target message no longer exists',
    50001: 'Bot no longer has access to this channel',
    50013: 'Bot lacks permissions to perform this action',
};

/**
 * BotInteraction - Wrapper class for Discord.js Interaction objects.
 *
 * This class provides a unified interface for handling Discord interactions with
 * built-in error handling for common API errors (expired interactions, etc.).
 *
 * Key Features:
 * - Automatic handling of expired interactions (code 10062)
 * - Graceful handling of already-acknowledged interactions (code 40060)
 * - Permission and access error handling
 * - Smart reply routing (reply vs editReply based on interaction state)
 *
 * Return Format:
 * All interaction methods return a response object:
 * {
 *   success: boolean,  // true if the API call succeeded
 *   error: string|null, // error code if failed (e.g., "DiscordAPIError:10062")
 *   response: any|null  // the Discord API response if successful
 * }
 *
 * @class
 */
class BotInteraction {
    /**
     * @param {Interaction} interaction The original interaction from discord.js
     */
    constructor(interaction) {
        this._interaction = interaction;
    }

    // --- PRIVATE HELPER METHODS ---

    /**
     * Handles Discord API errors gracefully, logging expected errors and re-throwing unexpected ones.
     * @private
     * @param {Error} error - The error caught from a Discord API call
     * @param {string} methodName - The name of the method that threw the error
     * @returns {{success: boolean, error: string|null, response: null}}
     * @throws {Error} Re-throws the error if it's not an expected Discord API error
     */
    _handleDiscordError(error, methodName) {
        // Check if this is a Discord API error with a code
        const errorCode = error?.code;

        // If not a Discord API error or not in our expected list, re-throw
        if (!errorCode || !Object.values(EXPECTED_DISCORD_ERRORS).includes(errorCode)) {
            throw error; // Propagate unexpected errors
        }

        // This is an expected error - log it but don't throw
        const errorMessage = ERROR_MESSAGES[errorCode] || 'Unknown Discord API error';

        // Log with context for debugging
        console.warn(`[BotInteraction.${methodName}] Discord API Error ${errorCode}: ${errorMessage}`, {
            interactionId: this.id,
            userId: this.user?.id,
            guildId: this.guildId,
            errorCode,
            errorMessage,
            originalError: error.message,
        });

        // Return a failure response object
        return {
            success: false,
            error: `DiscordAPIError:${errorCode}`,
            response: null,
        };
    }

    /**
     * Creates a success response object.
     * @private
     * @param {*} response - The response from Discord API
     * @returns {{success: boolean, error: null, response: *}}
     */
    _createSuccessResponse(response) {
        return {
            success: true,
            error: null,
            response: response,
        };
    }

    // --- PROXY PROPERTIES ---
    get user() { return this._interaction.user; }
    get member() { return this._interaction.member; }
    get channel() { return this._interaction.channel; }
    get guild() { return this._interaction.guild; }
    get client() { return this._interaction.client; }
    get customId() { return this._interaction.customId; }
    get deferred() { return this._interaction.deferred; }
    get replied() { return this._interaction.replied; }
    get options() { return this._interaction.options; }
    get commandName() { return this._interaction.commandName; }
    get id() { return this._interaction.id; }
    get guildId() { return this._interaction.guildId; }
    get values() { return this._interaction.values; }

    // --- PROXY METHODS ---

    /**
     * Sends an initial reply to the interaction.
     * Handles Discord API errors gracefully (e.g., expired interactions).
     * @param {*} options - Reply options
     * @returns {Promise<{success: boolean, error: string|null, response: *}>}
     */
    async reply(options) {
        try {
            const response = await this._interaction.reply(options);
            return this._createSuccessResponse(response);
        } catch (error) {
            return this._handleDiscordError(error, 'reply');
        }
    }

    /**
     * Edits the initial reply to the interaction.
     * Handles Discord API errors gracefully (e.g., expired interactions).
     * @param {*} options - Edit options
     * @returns {Promise<{success: boolean, error: string|null, response: *}>}
     */
    async editReply(options) {
        try {
            const response = await this._interaction.editReply(options);
            return this._createSuccessResponse(response);
        } catch (error) {
            return this._handleDiscordError(error, 'editReply');
        }
    }

    /**
     * Defers the reply to the interaction, showing "Bot is thinking..." message.
     * Handles Discord API errors gracefully (e.g., expired interactions).
     * @param {*} options - Defer options
     * @returns {Promise<{success: boolean, error: string|null, response: *}>}
     */
    async deferReply(options) {
        try {
            const response = await this._interaction.deferReply(options);
            return this._createSuccessResponse(response);
        } catch (error) {
            return this._handleDiscordError(error, 'deferReply');
        }
    }

    /**
     * Updates a component interaction (for buttons/select menus).
     * Handles Discord API errors gracefully (e.g., expired interactions).
     * @param {*} options - Update options
     * @returns {Promise<{success: boolean, error: string|null, response: *}>}
     */
    async update(options) {
        try {
            const response = await this._interaction.update(options);
            return this._createSuccessResponse(response);
        } catch (error) {
            return this._handleDiscordError(error, 'update');
        }
    }


    // --- CUSTOM METHODS ---

    /**
     * Smart reply method that automatically chooses between reply and editReply.
     * Handles Discord API errors gracefully.
     * @param {string|null} content - The message content
     * @param {*} options - Reply options
     * @returns {Promise<{success: boolean, error: string|null, response: *}>}
     */
    async sendReply(content, options = {}) {
        // Build a new options object instead of modifying the one passed in.
        // This makes the function "pure" and avoids side effects.
        const replyOptions = { ...options };
        if (typeof content === 'string' && content.length > 0) {
            replyOptions.content = content;
        }

        if (this.deferred || this.replied) {
            return this.editReply(replyOptions);
        } else {
            return this.reply(replyOptions);
        }
    }

    /**
     * Sends an ephemeral reply (only visible to the user who triggered the interaction).
     * Handles Discord API errors gracefully.
     * @param {string|null} content - The message content
     * @param {*} options - Reply options
     * @returns {Promise<{success: boolean, error: string|null, response: *}>}
     */
    async ephemeralReply(content, options = {}) {
        const existingFlags = options.flags || 0;
        const combinedFlags = existingFlags | MessageFlags.Ephemeral;
        const finalOptions = { ...options, flags: combinedFlags };

        return this.sendReply(content, finalOptions);
    }

    isAdministrator() {
        // Check if the user has the Administrator permission
        return this.member.permissions.has(PermissionsBitField.Flags.Administrator);
    }
}

module.exports = { BotInteraction };