const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

/**
 * Creates a message whenever the boolean is true (success) or false (fail)
 * @param game
 * @param success
 * @returns {{flags: *, components: ContainerBuilder[]}}
 */
function successMessage(game, success) {
    const containerBuilder = new ContainerBuilder();
    const textBuilder = new TextDisplayBuilder();

    if (success) {
        textBuilder.setContent(`## ${game} removed from your library.`)
    } else {
        textBuilder.setContent(`## Failed to remove ${game} from your library. \n-# Possibly wrong store selected?`);
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