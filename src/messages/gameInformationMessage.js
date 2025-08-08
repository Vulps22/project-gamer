const { MessageFlags, TextDisplayBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle,
    ActionRowBuilder,
    MediaGalleryBuilder
} = require('discord.js');

/**
 * Creates a game information message from provided data (pure function - no data fetching)
 * @param {object} gameData - The game data object
 * @param {string} gameData.name - Game name
 * @param {string} gameData.id - Game ID
 * @param {string} gameData.imageURL - Game image URL
 * @param {Array} stores - Array of store objects with name and url
 * @param {object} stats - Statistics object
 * @param {number} stats.communityCount - Number of community members who own this game
 * @param {number} stats.globalCount - Number of global users who own this game
 * @param {boolean} ephemeral - Whether this is an ephemeral message (default: true)
 * @returns {object} Discord message object
 */
function gameInformationMessage(gameData, stores, stats, ephemeral = true) {
    const titleComponent = new TextDisplayBuilder()
        .setContent(`## ${gameData.name}`);

    console.log('Title component:', titleComponent.toJSON());

    const imageComponent = new MediaGalleryBuilder()
        .addItems({
            description: 'Game Image',
            media: {
                url: gameData.imageURL
            }
        });

    let storesMessage = '### Stores ';
    stores.forEach(store => storesMessage += `\n- [${store.name}](${store.url})`);

    const storesComponent = new TextDisplayBuilder()
        .setContent(storesMessage);

    console.log('Stores component:', storesComponent.toJSON());

    let bodyMessage = '';
    bodyMessage += `**${stats.communityCount}** members of this community own this game.`;
    bodyMessage += `\n**${stats.globalCount}** members globally own this game.`;

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
        .setCustomId(`lfg_addGame_id:${gameData.id}`);
    const removeButton = new ButtonBuilder()
        .setLabel('Remove from Library')
        .setStyle(ButtonStyle.Danger)
        .setCustomId(`library_removeGame_id:${gameData.id}`);

    if (ephemeral) {
        // For ephemeral messages, only remove and share buttons (user already has the game)
        const shareButton = new ButtonBuilder()
            .setLabel('Share with Channel')
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`library_gameShare_id:${gameData.id}`);
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