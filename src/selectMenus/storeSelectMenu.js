// At the top of your file
const { StringSelectMenuInteraction } = require('discord.js');
const { gameManager } = require('../services');
const { GlobalMessages } = require('../messages');

module.exports = {
    data: {
        id: 'storeSelect',
        administrator: false,
    },

    /**
     * @param {StringSelectMenuInteraction} interaction
     * @param context May have context to the interaction
     */
    async execute(interaction, context = null) {
        const selectedStores = interaction.values;

        if (selectedStores[0] === 'none') {
            return;
        }

        //console.log('Selected stores:', selectedStores);

        if (context !== null && context === "remove") {
            console.log("Remove subcommand!!!")

            //const success = await gameManager.removeGameFromUserLibrary(interaction.user.id, game);

            //await interaction.ephemeralReply(GlobalMessages.getSuccessMessage(success[0], success[1]))
            await interaction.channel.send(GlobalMessages.getSuccessMessage("Test", "Idk Maybe"))

            return;
        }

        // 1. Create an array of promises, just like before.
        const promises = selectedStores.map(storeId =>
            gameManager.addGameToUserLibrary(interaction.user.id, storeId)
        );

        // 2. Use Promise.allSettled to wait for all of them to complete.
        const results = await Promise.allSettled(promises);

        // 3. Process the results to count successes and failures.
        const successfulAdds = results.filter(result =>
            result.status === 'fulfilled' && result.value === true
        );

        const failedCount = results.length - successfulAdds.length;

        // 4. Build a dynamic response message based on the outcome.
        let content = '';

        if (successfulAdds.length > 0) {
            content += `Game added to your library on ${successfulAdds.length} store(s). `;
        }

        if (failedCount > 0) {
            content += `${failedCount} store(s) encountered an error. You may already own the game on that store, or there was a system issue.`;
        }

        if (content === '') {
            // This case would happen if something went wrong but wasn't a typical error.
            content = 'An unknown error occurred. Please try again later.';
        }

        // 5. Send the final, detailed reply.
        return interaction.ephemeralReply(content.trim());
    },
};