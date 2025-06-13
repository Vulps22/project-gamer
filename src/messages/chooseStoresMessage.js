const { StringSelectMenuBuilder, TextDisplayBuilder, ActionRowBuilder, ContainerBuilder, MessageFlags } = require("discord.js");


function chooseStoresMessage(stores) {
    if (!stores || stores.length === 0) {
        stores = {label: 'No stores available for this game.', value: 'none'};
    }

    const storeList = stores.map(store => {
        return {
            label: store.name,
            value: store.id
        }
    })

    const messageText = new TextDisplayBuilder()
        .setContent('Please select whhere you own this game (you can select multiple stores):')

    const stringSelectComponent = new StringSelectMenuBuilder()
        .setCustomId('storeSelect')
        .setPlaceholder('Select a store')
        .addOptions(storeList)
        .setMinValues(1)
        .setMaxValues(storeList.length);

    const actionRowComponent = new ActionRowBuilder()
        .addComponents(stringSelectComponent);

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(messageText)
        .addActionRowComponents(actionRowComponent);

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [containerComponent],
    }
}

module.exports = {
    chooseStoresMessage,
};