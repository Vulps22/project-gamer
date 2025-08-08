const { MessageFlags, TextDisplayBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle,
    ActionRowBuilder,
    MediaGalleryBuilder
} = require('discord.js');
const { gameManagerService } = require('../services');

/**
 * @param serverId {string} Server id
 * @param gameId {string} Game name
 * @param userId {Snowflake}
 * @returns {any} Message containing games.
 */
async function gameInformationMessage(serverId, gameId) {
    const game = await gameManagerService.getGameById(gameId);
    const titleComponent = new TextDisplayBuilder()
        .setContent(`## ${game.name}`);

    console.log('Title component:', titleComponent.toJSON());

    const imageComponent = new MediaGalleryBuilder()
        .addItems({
            description: 'Game Image',
            media: {
                url: game.imageURL
            }
        });

    const stores = await gameManagerService.getAllStoresForGame(gameId);

    let storesMessage = '### Stores ';
    stores.forEach(store => storesMessage += `\n- [${store.name}](${store.url})`);

    const storesComponent = new TextDisplayBuilder()
        .setContent(storesMessage);

    console.log('Stores component:', storesComponent.toJSON());

    const communityAmount = await gameManagerService.getUserAmountWithGameInServer(serverId, gameId);
    const overAllAmount = await gameManagerService.getUserAmountWithGame(gameId);

    let bodyMessage = '';

    bodyMessage += `**${communityAmount.user_count}** members of this community own this game.`; // TODO: Calculate these
    bodyMessage += `\n**${overAllAmount.user_count}** members globally own this game.`; // TODO: Maybe merge stores and body message?

    const bodyComponent = new TextDisplayBuilder().setContent(bodyMessage);

    console.log('Body component:', bodyComponent.toJSON());

    const addButton = new ButtonBuilder()
        .setLabel('Add to Library')
        .setStyle(ButtonStyle.Success)
        .setCustomId(`lfg_addGame_id:${game.id}`);
    const removeButton = new ButtonBuilder()
        .setLabel('Remove from Library')
        .setStyle(ButtonStyle.Danger)
        .setCustomId(`lfg_removeGame_id:${game.id}`);
    const actionRow = new ActionRowBuilder()
        .addComponents([ addButton, removeButton ]);

    console.log('ActionRow component:', actionRow.toJSON());

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addMediaGalleryComponents(imageComponent)
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(storesComponent)
        .addTextDisplayComponents(bodyComponent)
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addActionRowComponents(actionRow);

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [ containerComponent ]
    };
}

module.exports = {
    gameInformationMessage: gameInformationMessage
};