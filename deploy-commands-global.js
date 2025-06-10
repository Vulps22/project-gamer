// deploy-commands.js

require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { config, ConfigOption } = require('./src/config.js');
const db = require('./src/lib/database.js'); // <-- Import DB wrapper directly

(async () => {
    try {
        // 1. Initialize configuration
        console.log('Initializing configuration...');
        await config.init();
        console.log('Configuration loaded successfully.');

        // 2. Get credentials
        const TOKEN = config.get(ConfigOption.DISCORD_BOT_TOKEN);
        const CLIENT_ID = config.get(ConfigOption.DISCORD_BOT_CLIENT_ID);

        // 3. Validate credentials
        if (!TOKEN || !CLIENT_ID) {
            console.error('FATAL: Missing credentials in the database configuration.');
            process.exitCode = 1; // Set exit code for error
            return; 
        }

        // 4. Load command files
        const commands = [];
        const commandsPath = path.join(__dirname, 'src', 'commands', 'global');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        console.log(`Found ${commandFiles.length} command files.`);

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
        
        // 5. Deploy commands
        const rest = new REST({ version: "10" }).setToken(TOKEN);
        
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        process.exitCode = 0; // Set exit code for success

    } catch (error) {
        console.error('Failed to deploy commands:', error);
        process.exitCode = 1; // Set exit code for error
    } finally {
        // This block will ALWAYS execute, allowing us to clean up.
        console.log('Closing database connection...');
        await db.close();
        console.log('Finished.');
    }
})();