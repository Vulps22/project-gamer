const { MessageFlags, ContainerBuilder, Snowflake, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SectionBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize } = require("discord.js");

/**
 * 
 * @param {object} game The name of the game
 * @param {string} links The links to the game on all supported platforms
 * @param {Snowflake} requestor The user who requested the LFG
 * @param {Snowflake[]} taggables The users who can be tagged in the LFG message
 */
function LFGMessage(game, links, requestor, taggables, openInvitation = false) {

    let titleComponent = new TextDisplayBuilder().setContent(`## <@${requestor}> is looking for players to play **${game.name}**`);
    let separatorComponent = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    
    let tagTextComponent;

    if( !openInvitation) {
        tagTextComponent = new TextDisplayBuilder().setContent(`${taggables.map(user => `- <@${user}>`).join('\n')}`);
    }

    let linksContent = links.map((link, index) => { return `- [${link.name}](<${link.url}>)`; }).join(' \n');
    let linksComponent = new TextDisplayBuilder().setContent(`**Available on:** \n ${linksContent}`);

    let availableSectionComponent = new SectionBuilder()
        .addTextDisplayComponents(linksComponent)
        .setButtonAccessory(new ButtonBuilder()
            .setLabel("I have this game")
            .setStyle(ButtonStyle.Success)
            .setCustomId(`lfg_addGame_id:${game.id}`)
        );

    let imageComponent = new MediaGalleryBuilder()
        .addItems([new MediaGalleryItemBuilder()
            .setURL(game.imageURL)
            .setDescription(`${game.name} Branding Image`)
        ])

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addSeparatorComponents(separatorComponent)

    if (!openInvitation) {
        containerComponent
            .addTextDisplayComponents(tagTextComponent)
            .addSeparatorComponents(separatorComponent)
    }

    containerComponent
        .addSectionComponents(availableSectionComponent)
        .addSeparatorComponents(separatorComponent)
        .addMediaGalleryComponents(imageComponent);

    const message = {
        flags: MessageFlags.IsComponentsV2,
        components: [containerComponent],
    }

    return message;
}

function getSuccessMessage() {
    const containerBuilder = new ContainerBuilder();
    const textBuilder = new TextDisplayBuilder().setContent("## Successfully Submitted LFG.");

    containerBuilder.addTextDisplayComponents(textBuilder);

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [ containerBuilder ]
    };
}

module.exports = {
    LFGMessage,
    getSuccessMessage
};