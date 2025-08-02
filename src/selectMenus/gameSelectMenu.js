// At the top of your file
const { StringSelectMenuInteraction } = require('discord.js');

module.exports = {
    data: {
        id: 'gameSelect',
        administrator: false,
    },

    /**
     * @param {StringSelectMenuInteraction} interaction
     * @param context May have context to the interaction
     */
    async execute(interaction) {
        const values = interaction.values;

        if (values.length !== 1) {
            return interaction.ephemeralReply('Error with command. [No Return Values]');
        }

        const stringSplit = values[0].split(';');
        const gameName = stringSplit[0];
        const storeName = stringSplit[1];

        if (gameName === null || storeName === null) {
            return interaction.ephemeralReply('Error with command. [Missing Game/Store]');
        }

        interaction.ephemeralReply(`Store Selected: ${storeName}\nGame Selected: ${gameName}`);
    }
};