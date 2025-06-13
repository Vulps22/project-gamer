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

    //NOTE: Keep these in alphabetical order for consistency

    get baseId() { return this._baseId; }
    get buttonData() { return this._buttonData; }
    get customIdRaw() { return this._interaction.customId; }
    // In your BotButtonInteraction class

    _parseCustomId() {
        const parts = this._interaction.customId.split('_');
        const prefix = parts[0] || null;
        const action = parts[1] || null;

        // Get all parameter parts of the ID
        const paramParts = parts.slice(2);

        this._buttonData = {
            prefix: prefix,
            action: action,
            params: {},
        };

        let hasNamedParams = false;

        // Loop through the parameter parts to check for key:value pairs
        for (const part of paramParts) {
            // Check if the part contains our key-value separator ':'
            if (part.includes(':')) {
                hasNamedParams = true;
                const [key, value] = part.split(':');
                this._buttonData.params[key] = value;
            }
        }

        // If no key:value pairs were found, assume the original positional style
        if (!hasNamedParams) {
            this._buttonData.params = paramParts;
        }

        // Set the baseId as before
        if (prefix && action) {
            this._baseId = `${prefix}_${action}`;
        }
    }
}

module.exports = { BotButtonInteraction };