const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

async function successMessage(game, success) {
    console.log(`successMessage called: ${game}, ${success}`)
    const containerBuilder = new ContainerBuilder();
    const textBuilder = new TextDisplayBuilder();

    textBuilder.setContent("## >:(")

    if (success) {
        textBuilder.setContent(`## Successfully removed ${game}`)
    } else {
        textBuilder.setContent(`## Failed to remove ${game}`);
    }

    containerBuilder.addTextDisplayComponents(textBuilder);

    const message = {
        flags: MessageFlags.IsComponentsV2,
        components: [ containerBuilder ]
    };

    console.log(`successMessage: `, message)
    return message;
}

module.exports = {
    successMessage
}