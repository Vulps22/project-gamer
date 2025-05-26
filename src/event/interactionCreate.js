// eslint-disable-next-line no-unused-vars
const { Events, Interaction } = require('discord.js');
const { logger } = require('../lib/logger.js');

module.exports = {
    name: Events.InteractionCreate,
    /**
     *
     * @param {Interaction} interaction
     * @returns
     */
    async execute(interaction) {

        if (interaction.isAutocomplete()) {
            console.log('Autocomplete interaction received:', interaction.commandName, interaction.options.data);
            await handleAutoComplete(interaction);
            return;
        }

        if (interaction.isButton()) {
            console.log('Button interaction received:', interaction.customId, interaction.user.id);
            // await handleButtonInteraction(interaction);
            return;
        }

        if (interaction.isCommand()) {
            console.log('Command interaction received:', interaction.commandName, interaction.user.id);
            await handleCommandInteraction(interaction);
            return;
        }

    },
};

/**
 * Handles command interactions.
 * @param {Interaction} interaction
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