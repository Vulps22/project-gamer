// /structures/BotButtonInteraction.js
const { BotInteraction } = require('./botInteraction');

class BotButtonInteraction extends BotInteraction {
    /**
     * @param {import('discord.js').ButtonInteraction} interaction
     */
    constructor(interaction) {
        // Call the parent constructor to set up the shared stuff
        super(interaction);

        this._baseId = null;
        this._buttonData = {};
        this._parseCustomId();
    }

    // NOTE: Keep these in alphabetical order for consistency
    get action() { return this._buttonData.action; }
    get baseId() { return this._baseId; }
    get buttonData() { return this._buttonData; }
    get customIdRaw() { return this._interaction.customId; }
    /**
     * @returns {Map<string, string>} The parameters extracted from the custom ID.
     */
    get params() { return this._buttonData.params; }
    get prefix() { return this._buttonData.prefix; }


    // ... your _parseCustomId method remains the same ...
    // In your BotButtonInteraction class

    _parseCustomId() {
        const parts = this._interaction.customId.split('_');
        const prefix = parts[0] || null;
        const action = parts[1] || null;
        const paramParts = parts.slice(2);

        // Initialize buttonData. params will ALWAYS be a Map.
        this._buttonData = {
            prefix,
            action,
            params: new Map(),
        };

        // Loop through the parameter parts and enforce the key:value format.
        for (const part of paramParts) {
            // Check if the part contains our key-value separator ':'
            if (part.includes(':')) {
                const [key, value] = part.split(':', 2); // Split only on the first ':'
                this._buttonData.params.set(key, value);
            } else {
                // If a part is not in key:value format, it's an error.
                throw new Error(`Invalid customId format. Parameter "${part}" is missing a key. Expected format 'key:value'.`);
            }
        }

        // Set the baseId as before
        if (prefix && action) {
            this._baseId = `${prefix}_${action}`;
        }
    }
}

module.exports = { BotButtonInteraction };