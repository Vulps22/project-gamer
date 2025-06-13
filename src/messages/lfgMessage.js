const { MessageFlags, ContainerBuilder, Snowflake, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SectionBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize } = require("discord.js");

/**
 * 
 * @param {object} game The name of the game
 * @param {string} links The links to the game on all supported platforms
 * @param {Snowflake} requestor The user who requested the LFG
 * @param {Snowflake[]} taggables The users who can be tagged in the LFG message
 */
function LFGMessage(game, links, requestor, taggables){
 
    let titleComponent = new TextDisplayBuilder().setContent(`## <@${requestor}> is looking for players to play **${game.name}** with`);
    
    let separatorComponent = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

    let tagTextComponent = new TextDisplayBuilder().setContent(`${taggables.map(user => `- <@${user}>`).join('\n')}`);

    let linksContent = links.map((link, index) => {
        if (index === 0) {
            // For the first element, return the link WITHOUT angle brackets to allow a preview.
            return `- [${link.name}](${link.url})`;
        } else {
            // For all other links, return them WITH angle brackets to suppress the preview.
            return `- [${link.name}](<${link.url}>)`;
        }
    }).join(' \n'); // Join them all into a single string
    let linksComponent = new TextDisplayBuilder().setContent(`**Available on:** \n ${linksContent}`);

    let availableSectionComponent = new SectionBuilder()
        .addTextDisplayComponents(linksComponent)
        .setButtonAccessory(new ButtonBuilder()
            .setLabel("I have this game")
            .setStyle(ButtonStyle.Success)
            .setCustomId(`lfg_add_game_${game.id}`)
    )

    let imageComponent = new MediaGalleryBuilder()
        .addItems([new MediaGalleryItemBuilder()
            .setURL(game.imageURL)
            .setDescription(`${game.name} Branding Image`)
        ])

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addSeparatorComponents(separatorComponent)
        .addTextDisplayComponents(tagTextComponent)
        .addSeparatorComponents(separatorComponent)
        .addSectionComponents(availableSectionComponent)
        .addSeparatorComponents(separatorComponent)
        .addMediaGalleryComponents(imageComponent);
    
    message = {
        flags: MessageFlags.IsComponentsV2,
        components: [containerComponent],
    }
    console.log("LFG message in builder:", message.components);
    return message;

}

module.exports = {
    LFGMessage
};