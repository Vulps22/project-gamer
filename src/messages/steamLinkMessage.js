const { MessageFlags, ContainerBuilder, Snowflake, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SectionBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, ActionRowBuilder } = require('discord.js');

/**
 *
 * @param {string} url The steam link URL
 */
function steamLinkMessage(url) {

    if (!url) throw new Error('Steam link URL is required to create the LFG message.');

    const titleComponent = new TextDisplayBuilder().setContent('## Click the button below to link your Steam account');
    const separatorComponent = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);


    const linkButtonComponent = new ButtonBuilder()
        .setLabel('Link Steam Account')
        .setStyle(ButtonStyle.Link)
        .setURL(url);

    const actionRow = new ActionRowBuilder()
        .addComponents(linkButtonComponent);

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addSeparatorComponents(separatorComponent)
        .addActionRowComponents(actionRow);

    const message = {
        flags: MessageFlags.IsComponentsV2,
        components: [containerComponent],
    };

    return message;
}

module.exports = {
    steamLinkMessage
};