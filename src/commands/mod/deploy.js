// src/commands/mod/deploy.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { BotInteraction } = require('../../structures');
const { exec } = require('child_process');
const { promisify } = require('util');
const { logger } = require('../../lib');
const { config, ConfigOption } = require('../../config');

const execAsync = promisify(exec);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deploy')
        .setDescription('Deploys Discord slash commands to the official server.'),
    administrator: true, // Only administrators can run this command

    /**
     * @param {BotInteraction} interaction
     */
    async execute(interaction) {

        // Ensure this command is only run in the official support server
        const officialServerId = config.get(ConfigOption.DISCORD_SUPPORT_SERVER);
        if (interaction.guildId !== officialServerId) {
            return interaction.ephemeralReply('This command can only be used in the official support server.');
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            console.log('Starting deployment of commands...');
            // Execute the deployment script using 'node'
            try {
                const { stdout, stderr } = await execAsync('node deploy-commands.js');
                if (stderr) {
                    logger.error(`Deployment script stderr: ${stderr}`);
                    await interaction.editReply(`Deployment script reported warnings/errors:\n\`\`\`${stderr}\`\`\``);
                    return;
                }
                logger.log(`Mod commands deployed successfully:\n${stdout}`);
                await interaction.editReply('Mod commands deployed successfully to this server!');
            } catch (error) {
                logger.error(`Deployment script failed: ${error.message}`);
                await interaction.editReply(`Failed to deploy mod commands: \`\`\`${error.message}\`\`\``);
            }
            console.log('Deployment command initiated successfully.');
        } catch (error) {
            logger.error(`Error initiating mod command deployment: ${error.message}`);
            await interaction.editReply('An error occurred while trying to initiate the deployment. Please check logs.');
        }
    },
};