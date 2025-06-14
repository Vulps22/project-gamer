// eslint-disable-next-line no-unused-vars
const { Events, Interaction } = require('discord.js');
const { logger } = require('../lib');
const { userManagerServiceInstance } = require('../services');
const { clientProvider } = require('../provider');
const { BotInteraction, BotButtonInteraction } = require('../structures');

module.exports = {
    name: Events.InteractionCreate,
    /**
     *
     * @param {Interaction} interaction
     * @returns
     */
    async execute(interaction) {

        if (!await saveUser(interaction)) {
            logger.error('No userId found in interaction: Aborting interaction.');
            interaction.reply('An error occurred while processing your interaction. Please try again later.');
            return;
        }

        if (interaction.isAutocomplete()) {
            console.log('Autocomplete interaction received:', interaction.commandName, interaction.options.data);
            await handleAutoComplete(interaction);
            return;
        }

        if (interaction.isButton()) {
            console.log('Button interaction received:', interaction.customId, interaction.user.id);
            const buttonInteraction = new BotButtonInteraction(interaction);
            await handleButtonInteraction(buttonInteraction);
            return;
        }

        if (interaction.isAnySelectMenu()) {
            const botInteraction = new BotInteraction(interaction);
            await handleSelectMenuInteraction(botInteraction);
            return;
        }

        if (interaction.isCommand()) {
            console.log('Command interaction received:', interaction.commandName, interaction.user.id);
            const botInteraction = new BotInteraction(interaction);
            await handleCommandInteraction(botInteraction);
            return;
        }

    },
};

/**
 * Handles command interactions.
 * @param {BotInteraction} interaction
 * @returns
 */
async function handleCommandInteraction(interaction) {
    try {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            logger.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        const logInteraction = `**Command**: ${interaction.commandName} | **Server**: ${interaction.guildId} | **User**: ${interaction.user.username} - ${interaction.user.id} ||`;
        interaction.logInteraction = logInteraction;

        interaction.logMessage = await logger.log(logInteraction);

        if (shouldExecute(interaction, command)) {
            logger.editLog(interaction.logMessage, `${logInteraction} Executing Command`);
            await command.execute(interaction);
        }
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}`);
        console.error(error);
        if (!interaction.deferred) interaction.reply('Something went wrong! Try another Command while we work out what went Wrong :thinking:');
        else interaction.editReply('Something went wrong! Try another Command while we work out what went Wrong :thinking:');

        logger.error(`\nCommand: ${interaction.commandName}\nError: ${error.message}`);
    }
}

/**
 * Handles select menu interactions.
 * @param {BotInteraction} interaction
 * @returns
 */
async function handleSelectMenuInteraction(interaction) {

    console.log('Select Menu interaction received:', interaction.customId, interaction.user.id);


    try {
        const menu = clientProvider.getClient().selectMenus.get(interaction.customId);
        console.log('Select Menu:', menu);


        if (!menu) {
            logger.error(`No select matching ${interaction.customId} was found.`);
            return;
        }


        const logInteraction = `**Select**: ${interaction.customId} | **Server**: ${interaction.guildId} | **User**: ${interaction.user.username} - ${interaction.user.id} ||`;
        interaction.logInteraction = logInteraction;

        interaction.logMessage = await logger.log(logInteraction);

        logger.editLog(interaction.logMessage, `${logInteraction} Executing Select Response`);
        await menu.execute(interaction);
    } catch (error) {
        console.error(`Error executing select menu with ID ${interaction.customId}`);
        console.error(error);
        interaction.ephemeralReply('Something went wrong! Try another Command while we work out what went Wrong :thinking:');

        logger.error(`\nSelect: ${interaction.customId}\nError: ${error.message}`);
    }
}

/**
 * Handles Button interactions.
 * @param {BotButtonInteraction} interaction
 * @returns
 */
async function handleButtonInteraction(interaction) {

    console.log('Button interaction received:', interaction.baseId, interaction.user.id);

    try {
        const button = clientProvider.getClient().buttons.get(interaction.baseId);
        console.log('Buttton:', button);


        if (!button) {
            logger.error(`No button matching ${interaction.baseId} was found.`);
            return;
        }


        const logInteraction = `**Button**: ${interaction.customId} | **Server**: ${interaction.guildId} | **User**: ${interaction.user.username} - ${interaction.user.id} ||`;
        interaction.logInteraction = logInteraction;

        interaction.logMessage = await logger.log(logInteraction);

        logger.editLog(interaction.logMessage, `${logInteraction} Executing Button Response`);
        await button.execute(interaction);
    } catch (error) {
        console.error(`Error executing button with ID ${interaction.customId}`);
        console.error(error);
        interaction.ephemeralReply('Something went wrong! Try another Command while we work out what went Wrong :thinking:');

        logger.error(`\button: ${interaction.customId}\nError: ${error.message}`);
    }
}

async function handleAutoComplete(interaction) {
    const command = getCommand(interaction.client, interaction.commandName);

    if (!command) {
        commandNotFound(interaction.commandName);
        return;
    }
    await command.autoComplete?.(interaction);
}

/**
 * Retrieves a command by its name.
 * @param {string} commandName
 * @returns {Command}
 */
function getCommand(client, commandName) {
    const command = client.commands.get(commandName);

    if (!command) {
        logger.log('Interaction', `Command ${commandName} does not exist.`);
        return;
    }

    return command;
}

/**
 * Determines if a command should be executed based on permissions and other criteria.
 * @param {Interaction} interaction
 * @param {*} command
 * @param {Server} server
 * @returns
 */
function shouldExecute(interaction, command) {

    // Check for Administrator role for commands that require it
    if (command.administrator && !interaction.member.permissions.has('Administrator')) {
        logger.editLog(interaction.logMessage, `${logInteraction} || Interaction Aborted: User was not Administrator`);
        interaction.reply('You need the Administrator role to use this command.');
        return false;
    }

    return true;
}

/**
 * Check the user Id exists in the database, if not create a new user.
 * @param {*} interaction 
 * @return {boolean} Returns true if the user was saved or already exists, false if no userId was found.
 */
async function saveUser(interaction) {
    const userId = interaction.user.id;

    if (!userId) {
        console.error('No user ID found in interaction:', interaction);
        return false;
    }

    user = await userManagerServiceInstance.getOrCreateUser(userId);

    if (!user) {
        return;
    }

    await userManagerServiceInstance.addUserToServer(userId, interaction.guildId);

    return true;

}