const { MessageFlags, ContainerBuilder, Snowflake, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SectionBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, ActionRowBuilder } = require('discord.js');

/**
 *
 * @param {string} url The steam link URL
 */
function steamAlreadyLinkedMessage() {

    const titleComponent = new TextDisplayBuilder().setContent('## Steam Account Already Linked');
    const separatorComponent = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

    const noticeComponent = new TextDisplayBuilder()
        .setContent('Your Steam account is already linked. If you want to change the linked account, please unlink it first.');

    const sectionComponent = new SectionBuilder()
        .addTextDisplayComponents(noticeComponent)
        .setButtonAccessory(new ButtonBuilder()
            .setLabel('Unlink Steam Account')
            .setStyle(ButtonStyle.Danger)
            .setCustomId('steam_unlink'));

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addSeparatorComponents(separatorComponent)
        .addSectionComponents(sectionComponent);

    const message = {
        flags: MessageFlags.IsComponentsV2,
        components: [containerComponent],
    };

    return message;
}

/**
 *
 */
function steamUnlinkedConfirmationMessage() {

    const titleComponent = new TextDisplayBuilder().setContent('## Steam Account Unlinked');
    const separatorComponent = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

    const noticeComponent = new TextDisplayBuilder()
        .setContent('Your Steam account has been successfully unlinked.\n You can now link a new Steam account with the command `/link`.');

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addSeparatorComponents(separatorComponent)
        .addTextDisplayComponents(noticeComponent);

    const message = {
        flags: MessageFlags.IsComponentsV2,
        components: [containerComponent],
    };

    return message;
}

module.exports = {
    steamAlreadyLinkedMessage,
    steamUnlinkedConfirmationMessage
};