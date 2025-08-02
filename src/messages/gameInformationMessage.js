const { MessageFlags, TextDisplayBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const { gameManagerService } = require('../services');

/**
 * @param gameName {string} Game name
 * @returns {any} Message containing games.
 */
async function gameInformationMessage(gameName) {
    const titleComponent = new TextDisplayBuilder().setContent(`## ${gameName}`);

    console.log('Title component:', titleComponent.toJSON());

    const gameId = await gameManagerService.getIdByGame(gameName);
    const stores = await gameManagerService.getAllStoresForGame(gameId);
    const storesMessage = 'Stores: ';

    stores.forEach(store => storesMessage.concat(`\n- ${store}`));

    const storesComponent = new TextDisplayBuilder().setContent(storesMessage);

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(storesComponent);

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [ containerComponent ]
    };
}

module.exports = {
    gameInformationMessage: gameInformationMessage
};