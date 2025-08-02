const { MessageFlags, TextDisplayBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const { gameManagerService } = require('../services');

/**
 * @param gameId {string} Game name
 * @returns {any} Message containing games.
 */
async function gameInformationMessage(gameId) {
    const game = await gameManagerService.getGameById(gameId);
    const titleComponent = new TextDisplayBuilder().setContent(`## ${game.name}`);

    console.log('Title component:', titleComponent.toJSON());

    const stores = await gameManagerService.getAllStoresForGame(gameId);
    let storesMessage = 'Stores: ';

    stores.forEach(store => storesMessage += `\n- [${store.name}](${store.url})`);

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