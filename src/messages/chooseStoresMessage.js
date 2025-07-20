const { StringSelectMenuBuilder, TextDisplayBuilder, ActionRowBuilder, ContainerBuilder, MessageFlags } = require('discord.js');


/**
 * Creates messages a dropdown selection for user.
 * @param {Array} stores Game stores.
 * @param {boolean} isDeleting Is user deleting the game?
 * @returns {*|{flags: *, components: ContainerBuilder[]}}
 */
function chooseStoresMessage(stores, isDeleting) {

    // console.log("Choose stores message called with stores:", stores, stores.length);

    if (!stores || stores.length === 0) {
        stores = [{ name: 'You have added all the stores available for this game', id: 'none' }];
    }

    const storeList = stores.map(store => {
        return {
            label: store.name,
            value: String(store.id),
        };
    });

    // console.log("Store list:", storeList);

    const messageText = new TextDisplayBuilder()
        .setContent('Please select where you own this game (you can select multiple stores):');

    const stringSelectComponent = new StringSelectMenuBuilder()
        .setCustomId('storeSelect')
        .setPlaceholder('Select a store')
        .addOptions(storeList)
        .setMinValues(1)
        .setMaxValues(storeList.length)
        .setCustomId(`storeSelect:${isDeleting}`);

    const actionRowComponent = new ActionRowBuilder()
        .addComponents(stringSelectComponent);

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(messageText)
        .addActionRowComponents(actionRowComponent);

    message = {
        flags: MessageFlags.IsComponentsV2,
        components: [containerComponent],
    };

    // console.log("Choose stores message:", message);
    return message;
}

module.exports = {
    chooseStoresMessage,
};