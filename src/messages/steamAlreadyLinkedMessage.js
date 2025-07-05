const { MessageFlags, ContainerBuilder, Snowflake, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SectionBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, ActionRowBuilder } = require("discord.js");

/**
 * 
 * @param {string} url The steam link URL
 */
function steamAlreadyLinkedMessage() {

    let titleComponent = new TextDisplayBuilder().setContent(`## Steam Account Already Linked`);
    let separatorComponent = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)

    let noticeComponent = new TextDisplayBuilder()
        .setContent(`Your Steam account is already linked. If you want to change the linked account, please unlink it first.`);

        let sectionComponent = new SectionBuilder()
        .addTextDisplayComponents(noticeComponent)
        .setButtonAccessory(new ButtonBuilder()
            .setLabel("Unlink Steam Account")
            .setStyle(ButtonStyle.Danger)
            .setCustomId(`steam_unlink`));

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addSeparatorComponents(separatorComponent)
        .addSectionComponents(sectionComponent);

    const message = {
        flags: MessageFlags.IsComponentsV2,
        components: [containerComponent],
    }

    return message;
}

function steamUnlinkedConfirmationMessage() {

    let titleComponent = new TextDisplayBuilder().setContent(`## Steam Account Unlinked`);
    let separatorComponent = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)

    let noticeComponent = new TextDisplayBuilder()
        .setContent(`Your Steam account has been successfully unlinked.\n Youy can now link a new Steam account with the command \`/link\`.`);

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addSeparatorComponents(separatorComponent)
        .addTextDisplayComponents(noticeComponent);

    const message = {
        flags: MessageFlags.IsComponentsV2,
        components: [containerComponent],
    }

    return message;
}

module.exports = {
    steamAlreadyLinkedMessage,
    steamUnlinkedConfirmationMessage
};