// /structures/BotInteraction.js
const { MessageFlags, Interaction } = require('discord.js');

class BotInteraction {
    /**
     * @param {Interaction} interaction The original interaction from discord.js
     */
    constructor(interaction) {
        this._interaction = interaction;
    }

    // --- PROXY PROPERTIES ---
    get user() { return this._interaction.user; }
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
    
    // --- PROXY METHODS ---
    reply(options) { return this._interaction.reply(options); }
    editReply(options) { return this._interaction.editReply(options); }
    deferReply(options) { return this._interaction.deferReply(options); }
    update(options) { return this._interaction.update(options); }


    // --- YOUR CUSTOM METHODS ---
    async sendReply(content, options = {}) {
        // FIX 2: Build a new options object instead of modifying the one passed in.
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

    async ephemeralReply(content, options = {}) {
        const existingFlags = options.flags || 0;
        const combinedFlags = existingFlags | MessageFlags.Ephemeral;
        const finalOptions = { ...options, flags: combinedFlags };

        return this.sendReply(content, finalOptions);
    }
}

module.exports = { BotInteraction };