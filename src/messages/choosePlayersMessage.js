const { MessageFlags, ContainerBuilder, Snowflake, TextDisplayBuilder, ActionRowBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder } = require("discord.js");

/**
 * 
 * @param {string} name The name of the game
 * @param {{id: Snowflake, username: string}} players The players who own the game
 */
function choosePlayersMessage(name, players, gameId){
 
    console.log("Choose players message called with players:", players, players.length, "name:", name);

    playerArray = players.map(player => ({
            label: player.username,
            value: `${gameId}_${player.id}`,
        }));

        console.log("Player array:", playerArray);

    let titleComponent = new TextDisplayBuilder().setContent(`Who would you like to play **${name}** with?`);
    
    console.log("Title component:", titleComponent.toJSON());

    let playerSelectComponent = new StringSelectMenuBuilder()
    .setCustomId('lfg_playerSelect')
    .addOptions(playerArray)

    console.log("Player select component:", playerSelectComponent.toJSON());


    let actionRowComponent = new ActionRowBuilder()
    .addComponents(playerSelectComponent);

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addActionRowComponents(actionRowComponent);
    
    message = {
        flags: MessageFlags.IsComponentsV2,
        components: [containerComponent],
    }
    
    return message;

}

module.exports = {
    choosePlayersMessage
};