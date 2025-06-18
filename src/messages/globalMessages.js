const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

const GlobalMessages = {
    getSuccessMessage(game, success) {
        const containerBuilder = new ContainerBuilder();
        const textBuilder = new TextDisplayBuilder();

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

        return message;
    },
}

module.exports = {
    GlobalMessages
}