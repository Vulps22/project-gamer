// src/messages/helpMessage.js
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require("discord.js");

/**
 * Builds a dynamic help message from a list of commands.
 * @param {Map<string, object>} commands - The client's command collection.
 * @param {string} officialServerUrl - The URL for the "official server" button.
 * @returns {import('discord.js').InteractionReplyOptions} The message payload.
 */
function createHelpMessage(commands, officialServerUrl) {

    const titleComponent = new TextDisplayBuilder()
        .setContent("## LFGameSync Command List");


    const howToComponent = new TextDisplayBuilder()
        .setContent("### How to use LFGameSync\n" +
            "1. **Add Games to your Library**: Use the `/library add` command to add games from various stores to your library.\n" +
            "2. **Share Your Library**: Use the `/sharing` command to allow others to see which games you own.\n" +
            "3. **Find Gamers**: Use the `/lfg` command to discover other players who share your interests.\n\n" +
            "Can't find your game in the store you bought it from? " +
            "Use the `/register game` command to add it manually.\n\n");

    const commandListString = Array.from(commands.values()).map(command => {

        return `> ### /${command.data.name}\n> *${command.data.description}*`;
    }).join('\n\n');

    const commandListComponent = new TextDisplayBuilder()
        .setContent(commandListString);

    const supportedStores = new TextDisplayBuilder()
    .setContent(
        "### Supported Stores\n" +
        "LFGameSync can automatically identify and register games from the following store page URLs:\n" +
        "- **Steam**\n" +
        "- **GOG**\n" +
        "- **Meta Quest Store**\n\n" +
        "_If you register a game using a URL from an unsupported store, it will be sent to our team for manual review._"
    );


    const supportServerButton = new ButtonBuilder()
        .setLabel('Join the Official Server')
        .setStyle(ButtonStyle.Link)
        .setURL(officialServerUrl);

    const finalSection = new SectionBuilder()
        .addTextDisplayComponents([new TextDisplayBuilder()
            .setContent("For help or to find even more Gamers, join our official server!")
        ])
        .setButtonAccessory(supportServerButton);

    // Assemble the container using our new single section for the command list.
    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents([titleComponent])
        .addSeparatorComponents([new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)])
        .addTextDisplayComponents([howToComponent]) // Add the how-to section
        .addSeparatorComponents([new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)])
        .addTextDisplayComponents([supportedStores]) // Add the supported stores section
        .addSeparatorComponents([new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)])
        .addTextDisplayComponents([commandListComponent]) // Add the single section containing the list
        .addSeparatorComponents([new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)])
        .addSectionComponents([finalSection]);
        
    const message = {
        flags: MessageFlags.IsComponentsV2,
        components: [containerComponent],
    };
    
    return message;
}

module.exports = {
    createHelpMessage
};