const { MessageFlags, TextDisplayBuilder, ContainerBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { userLibraryManagerService } = require('../services');

/**
 * @param userId {Snowflake} User id
 * @param storeName {string} Store Name
 * @returns {any} Message containing games.
 */
async function chooseGameMessage(userId, storeName) {
    const library = await userLibraryManagerService.getUserLibrary(userId);

    if (!library || Object.keys(library).length === 0) {
        const titleComponent = new TextDisplayBuilder()
            .setContent('# You do not have any games with this store.');
        const containerComponent = new ContainerBuilder()
            .addTextDisplayComponents(titleComponent);
        return {
            flags: MessageFlags.IsComponentsV2,
            components: [ containerComponent ]
        };
    }

    const userGames = [];

    for (const [store, games] of Object.entries(library)) {
        if (store !== storeName) continue;

        for (let i = 0; i < games.length; i++) {
            userGames.push({
                label: games[i],
                value: games[i] + ';' + storeName
            });
        }
    }

    const titleComponent = new TextDisplayBuilder().setContent('## Which game would you like more information on?');

    console.log('Title component:', titleComponent.toJSON());

    const gameSelectComponent = new StringSelectMenuBuilder()
        .setCustomId('gameSelect')
        .addOptions(userGames);

    console.log('Game select component:', gameSelectComponent.toJSON());

    const gameActionRowComponent = new ActionRowBuilder()
        .addComponents([ gameSelectComponent ]);

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addActionRowComponents(gameActionRowComponent);

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [ containerComponent ]
    };
}

module.exports = {
    chooseGameMessage
};