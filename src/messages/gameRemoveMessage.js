const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

/**
 * Creates a message whenever the boolean is true (success) or false (fail)
 * @param {string} gameName
 * @param {boolean} success
 * @returns {{flags: *, components: ContainerBuilder[]}}
 */
function successMessage(gameName, success) {
    const containerBuilder = new ContainerBuilder();
    const textBuilder = new TextDisplayBuilder();

    if (success) {
        textBuilder.setContent(`## ${gameName} removed from your library.`)
    } else {
        textBuilder.setContent(`## Failed to remove ${gameName} from your library. \n-# Possibly wrong store selected?`);
    }

    containerBuilder.addTextDisplayComponents(textBuilder);

    const message = {
        flags: MessageFlags.IsComponentsV2,
        components: [ containerBuilder ]
    };

    return message;
}

module.exports = {
    successMessage
}