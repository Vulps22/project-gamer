const { SlashCommandBuilder } = require('discord.js');
const { gameManagerService } = require('../../services/gameManagerService');
const { userLibraryManagerService } = require('../../services/userLibraryManagerService'); 
const { BotInteraction } = require('../../structures/botInteraction');
const userManagerService = require('../../services/userManagerService');
const { logger } = require('../../lib');
const { steamManagerService } = require('../../services');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync')
        .setDescription('Sync your Steam games with the bot'),
    administrator: false,
    /**
     * * @param {BotInteraction} interaction 
     */
    async execute(interaction) {

        const discordUserId = interaction.user.id;
        // Let the user know we've started and give ourselves time to work
        await interaction.ephemeralReply("Starting sync... this may take a moment.");

        try {
            const steamId = await userManagerService.getSteamIdForUser(discordUserId);
            if (!steamId) {
                return interaction.editReply("You don't have a Steam ID linked to your account. Please use `/link steam` first.");
            }

            // --- Step 1: Get all game data from Steam API ---
            const allSteamGames = await steamManagerService.getSteamLibrary(steamId);
            if (!allSteamGames || allSteamGames.length === 0) {
                return interaction.editReply("Could not fetch your Steam library. It might be private or empty.");
            }
            const allSteamAppIds = allSteamGames.map(game => String(game.appid));
            logger.log(`[Sync] User ${discordUserId} has ${allSteamAppIds.length} games in their Steam library.`);

            // --- Step 2: Find which games the bot already knows about ---
            const knownGames = await gameManagerService.getKnownGames(1, allSteamAppIds); // 1 = Steam store ID
            
            let allGameStoreIdsForUser = knownGames.map(g => g.gameStoreId);
            const knownGameAppIds = new Set(knownGames.map(g => g.storeGameId));
            logger.log(`[Sync] Found ${knownGameAppIds.size} known games in the database for user ${discordUserId}.`);

            // --- Step 3: Identify truly new games and add them to the bot ---
            const newGameAppIds = allSteamAppIds.filter(appId => !knownGameAppIds.has(appId));
            let newGamesAddedToBot = 0;

            if (newGameAppIds.length > 0) {
                logger.log(`[Sync] Discoverd ${newGameAppIds.length} new games for the bot.`);
                const newGamesData = allSteamGames.filter(game => newGameAppIds.includes(String(game.appid)));
                
                const newlyCreatedGameStoreIds = await gameManagerService.registerNewGames(1, newGamesData); // 1 = Steam store ID
                
                newGamesAddedToBot = newlyCreatedGameStoreIds.length;
                allGameStoreIdsForUser.push(...newlyCreatedGameStoreIds);
            }

            // --- Step 4: Add all games to the USER's library in one go ---
            logger.log(`[Sync] Syncing ${allGameStoreIdsForUser.length} total games to user ${discordUserId}'s library.`);
            const addedToUserLibrary = await userLibraryManagerService.syncUserLibrary(discordUserId, allGameStoreIdsForUser);

            // --- Step 5: Report results ---
            const replyMessage = `Sync complete! ✨\n` +
                `- Found ${newGamesAddedToBot} new games for the bot.\n` +
                `- Added ${addedToUserLibrary} games to your personal library.`;

            await interaction.editReply(replyMessage);

        } catch (error) {
            logger.error(`[Sync] Error during sync for user ${discordUserId}:`, error);
            console.error(`[Sync] Full error details for user ${discordUserId}:`, error);
            await interaction.editReply("An error occurred while syncing your library. Please try again later.");
        }
    }
};
