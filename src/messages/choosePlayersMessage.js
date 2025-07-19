const { MessageFlags, ContainerBuilder, Snowflake, TextDisplayBuilder, ActionRowBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder, ButtonBuilder, ButtonStyle, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');

/**
 *
 * @param {string} name The name of the game
 * @param {{id: Snowflake, username: string}} players The players who own the game
 * @param gameId
 */
function choosePlayersMessage(name, players, gameId) {

    console.log('Choose players message called with players:', players, players.length, 'name:', name);

    const playerArray = players.map(player => ({
        label: player.username,
        value: `${gameId}_${player.id}`,
    }));


    if (playerArray.length === 0) {
        playerArray.push({
            label: 'No players found',
            value: 'none',
        });
    }

    console.log('Player array:', playerArray);

    const titleComponent = new TextDisplayBuilder().setContent(`## Who would you like to play **${name}** with?`);

    console.log('Title component:', titleComponent.toJSON());

    const playerSelectComponent = new StringSelectMenuBuilder()
        .setCustomId('lfg_playerSelect')
        .addOptions(playerArray);

    console.log('Player select component:', playerSelectComponent.toJSON());

    const anyoneButton = new ButtonBuilder()
        .setCustomId(`lfg_anyone_id:${gameId}`)
        .setLabel('Anyone')
        .setStyle(ButtonStyle.Success);

    const playerActionRowComponent = new ActionRowBuilder()
        .addComponents([playerSelectComponent]);

    const anyoneSectionComponent = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Or open it up to'))
        .setButtonAccessory(anyoneButton);

    const containerComponent = new ContainerBuilder()
        .addTextDisplayComponents(titleComponent)
        .addActionRowComponents(playerActionRowComponent)
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addSectionComponents(anyoneSectionComponent);

    const message = {
        flags: MessageFlags.IsComponentsV2,
        components: [containerComponent],
    };

    return message;

}

module.exports = {
    choosePlayersMessage
};