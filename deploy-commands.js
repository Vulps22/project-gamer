// deploy-commands.js

require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { config, ConfigOption } = require("./src/config.js");
const { db } = require("./src/lib/index.js"); // <-- Import DB wrapper directly

/**
 * Deploys Discord application commands for a given type (global or mod).
 * This function assumes that `config.init()` has already been called.
 * @param {string} commandType - The type of commands to deploy ('global' or 'mod').
 * @returns {Promise<void>}
 */
async function deployCommands(commandType) {
    // 2. Get credentials (Config should already be initialized)
    const TOKEN = config.get(ConfigOption.DISCORD_BOT_TOKEN);
    const CLIENT_ID = config.get(ConfigOption.DISCORD_BOT_CLIENT_ID);
    const GUILD_ID = config.get(ConfigOption.DISCORD_SUPPORT_SERVER); // Assuming you'll need a Guild ID for mod commands

    // 3. Validate credentials
    if (!TOKEN || !CLIENT_ID) {
        console.error("FATAL: Missing Discord bot credentials in the database configuration.");
        process.exitCode = 1; // Set exit code for error
        return;
    }

    if (commandType === 'mod' && !GUILD_ID) {
        console.error("FATAL: Missing Discord Guild ID for 'mod' command deployment. Skipping mod commands.");
        // We'll return here, but don't set process.exitCode = 1 yet, as global might still succeed.
        // The overall error handling at the top level will catch if either fails.
        return;
    }

    try {
        // 4. Load command files
        const commands = [];
        const commandsPath = path.join(__dirname, "src", "commands", commandType);

        // Check if the command directory exists
        if (!fs.existsSync(commandsPath)) {
            console.log(`No ${commandType} command directory found at: ${commandsPath}. Skipping deployment for this type.`);
            return;
        }

        const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

        console.log(`Found ${commandFiles.length} ${commandType} command files.`);

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if ("data" in command && "execute" in command) {
                commands.push(command.data.toJSON());
            } else {
                console.log(
                    `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
                );
            }
        }

        // 5. Deploy commands
        const rest = new REST({ version: "10" }).setToken(TOKEN);

        console.log(`Started refreshing ${commands.length} application (/) ${commandType} commands.`);

        let data;
        if (commandType === "global") {
            data = await rest.put(Routes.applicationCommands(CLIENT_ID), {
                body: commands,
            });
        } else if (commandType === "mod") {
            data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
                body: commands,
            });
        } else {
            console.error(`ERROR: Unknown command type: ${commandType}`);
            // This error is critical for deployCommands, so we'll re-throw to be caught by the main handler.
            throw new Error(`Unknown command type: ${commandType}`);
        }

        console.log(
            `Successfully reloaded ${data.length} application (/) ${commandType} commands.`
        );
        return true; // Indicate success for this specific deployment type
    } catch (error) {
        console.error(`Failed to deploy ${commandType} commands:`, error);
        // Re-throw to be caught by the main error handler, allowing it to set the exit code.
        throw error;
    }
}

/**
 * Deploys global Discord application commands.
 * @returns {Promise<void>}
 */
async function deployGlobal() {
    console.log('--- Deploying Global Commands ---');
    return deployCommands("global"); // Return the promise from deployCommands
}

/**
 * Deploys moderator Discord application commands to a specific guild.
 * @returns {Promise<void>}
 */
async function deployMod() {
    console.log('--- Deploying Moderator Commands ---');
    return deployCommands("mod"); // Return the promise from deployCommands
}

// Immediately-invoked async function to run the deployment
(async () => {
    let overallSuccess = true;
    try {
        // 1. Initialize configuration ONCE
        console.log('Initializing configuration...');
        await config.init();
        console.log('Configuration loaded successfully.');

        // Deploy global commands
        try {
            await deployGlobal();
        } catch (error) {
            console.error('Global command deployment failed. Continuing to moderator commands if applicable.');
            overallSuccess = false; // Mark overall process as failed if global fails
        }

        // Deploy moderator commands
        try {
            await deployMod();
        } catch (error) {
            console.error('Moderator command deployment failed.');
            overallSuccess = false; // Mark overall process as failed if mod fails
        }

    } catch (error) {
        console.error('FATAL: An error occurred during initialization or command deployment:', error);
        overallSuccess = false;
    } finally {
        console.log('Closing database connection...');
        await db.close();
        console.log('Finished deployment process.');
        process.exitCode = overallSuccess ? 0 : 1; // Set final exit code based on overall success
    }
})();