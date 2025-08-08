const { MessageFlags, TextDisplayBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle,
    ActionRowBuilder,
    MediaGalleryBuilder
} = require('discord.js');
const { gameManagerService } = require('../services');

/**
 * @param serverId {string} Server id
 * @param gameId {string} Game name
 * @param {boolean} ephemeral Whether this is an ephemeral message (default: true)
 * @returns {any} Message containing games.
 */
async function gameInformationMessage(serverId, gameId, ephemeral = true) {
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

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addMediaGalleryComponents(imageComponent)
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(storesComponent)
        .addTextDisplayComponents(bodyComponent)
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    // Add library management buttons
    const addButton = new ButtonBuilder()
        .setLabel('Add to Library')
        .setStyle(ButtonStyle.Success)
        .setCustomId(`lfg_addGame_id:${game.id}`);
    const removeButton = new ButtonBuilder()
        .setLabel('Remove from Library')
        .setStyle(ButtonStyle.Danger)
        .setCustomId(`library_removeGame_id:${game.id}`);

    if (ephemeral) {
        // For ephemeral messages, only remove and share buttons (user already has the game)
        const shareButton = new ButtonBuilder()
            .setLabel('Share with Channel')
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`library_gameShare_id:${game.id}`);
        const actionRow = new ActionRowBuilder()
            .addComponents([ removeButton, shareButton ]);

        console.log('Ephemeral ActionRow component:', actionRow.toJSON());
        containerComponent.addActionRowComponents(actionRow);
    } else {
        // For public messages, only library management buttons
        const actionRow = new ActionRowBuilder()
            .addComponents([ addButton, removeButton ]);

        console.log('Public ActionRow component:', actionRow.toJSON());
        containerComponent.addActionRowComponents(actionRow);
    }

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [ containerComponent ]
    };
}

module.exports = {
    gameInformationMessage: gameInformationMessage
};