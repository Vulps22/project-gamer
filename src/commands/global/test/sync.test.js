const { SlashCommandBuilder } = require('discord.js');
const { execute } = require('../sync');

// --- Explicit Mocks (Corrected Structure) ---
// The mock factories now return an object with the exact "shape" as the real modules,
// allowing destructuring to work correctly.

jest.mock('../../../services/userManagerService', () => ({
    // This service is likely not destructured, so a flat object is fine.
    getSteamIdForUser: jest.fn(),
}));

jest.mock('../../../services/steamManagerService', () => ({
    // This service is likely not destructured.
    getSteamLibrary: jest.fn(),
}));

jest.mock('../../../services/gameManagerService', () => ({
    // CORRECTED: Match the actual export structure with gameManagerService
    gameManagerService: {
        getKnownGames: jest.fn(),
        registerNewGames: jest.fn(),
    }
}));

jest.mock('../../../services/userLibraryManagerService', () => ({
    userLibraryManagerService: {
        syncUserLibrary: jest.fn(),
    }
}));

jest.mock('../../../services', () => ({
    steamManagerService: {
        getSteamLibrary: jest.fn(),
    }
}));

jest.mock('../../../lib', () => ({
    logger: {
        log: jest.fn(),
        error: jest.fn(),
    },
}));

// --- Service Imports (after mocks) ---
// These imports will now correctly receive the mocked structures.
const userManagerService = require('../../../services/userManagerService');
const { steamManagerService } = require('../../../services');
const { gameManagerService } = require('../../../services/gameManagerService');
const { userLibraryManagerService } = require('../../../services/userLibraryManagerService');
const { logger } = require('../../../lib');


// --- Test Setup ---
const mockInteraction = {
    user: {
        id: '123456789'
    },
    ephemeralReply: jest.fn(),
    editReply: jest.fn()
};

describe('Sync Command', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should notify the user to link their Steam account if no Steam ID is found', async () => {
        // Arrange
        userManagerService.getSteamIdForUser.mockResolvedValue(null);

        // Act
        await execute(mockInteraction);

        // Assert
        expect(mockInteraction.ephemeralReply).toHaveBeenCalledWith('Starting sync... this may take a moment.');
        expect(mockInteraction.editReply).toHaveBeenCalledWith('You don\'t have a Steam ID linked to your account. Please use `/link steam` first.');
    });

    test('should notify the user if their Steam library is empty or private', async () => {
        // Arrange
        userManagerService.getSteamIdForUser.mockResolvedValue('steam123');
        steamManagerService.getSteamLibrary.mockResolvedValue([]);

        // Act
        await execute(mockInteraction);

        // Assert
        expect(mockInteraction.ephemeralReply).toHaveBeenCalledWith('Starting sync... this may take a moment.');
        expect(mockInteraction.editReply).toHaveBeenCalledWith('Could not fetch your Steam library. It might be private or empty.');
    });

    test('should successfully sync a library with new and known games', async () => {
        // Arrange
        userManagerService.getSteamIdForUser.mockResolvedValue('steam123');
        steamManagerService.getSteamLibrary.mockResolvedValue([
            { appid: '1', name: 'Game One' },
            { appid: '2', name: 'Game Two' },
            { appid: '3', name: 'Game Three' }
        ]);
        gameManagerService.getKnownGames.mockResolvedValue([
            { storeGameId: '1', gameStoreId: 'gs1' }
        ]);
        gameManagerService.registerNewGames.mockResolvedValue(['gs2', 'gs3']);
        userLibraryManagerService.syncUserLibrary.mockResolvedValue(3);

        // Act
        await execute(mockInteraction);

        // Assert
        expect(mockInteraction.ephemeralReply).toHaveBeenCalledWith('Starting sync... this may take a moment.');
        expect(gameManagerService.registerNewGames).toHaveBeenCalledWith(1, [
            { appid: '2', name: 'Game Two' },
            { appid: '3', name: 'Game Three' }
        ]);
        expect(userLibraryManagerService.syncUserLibrary).toHaveBeenCalledWith('123456789', ['gs1', 'gs2', 'gs3']);
        expect(mockInteraction.editReply).toHaveBeenCalledWith(
            'Sync complete! ✨\n' +
            '- Found 2 new games for the bot.\n' +
            '- Added 3 games to your personal library.'
        );
    });

    test('should successfully sync when all games are already known', async () => {
        // Arrange
        userManagerService.getSteamIdForUser.mockResolvedValue('steam123');
        steamManagerService.getSteamLibrary.mockResolvedValue([
            { appid: '1', name: 'Game One' },
            { appid: '2', name: 'Game Two' }
        ]);
        gameManagerService.getKnownGames.mockResolvedValue([
            { storeGameId: '1', gameStoreId: 'gs1' },
            { storeGameId: '2', gameStoreId: 'gs2' }
        ]);
        userLibraryManagerService.syncUserLibrary.mockResolvedValue(2);

        // Act
        await execute(mockInteraction);

        // Assert
        expect(mockInteraction.ephemeralReply).toHaveBeenCalledWith('Starting sync... this may take a moment.');
        expect(gameManagerService.registerNewGames).not.toHaveBeenCalled();
        expect(userLibraryManagerService.syncUserLibrary).toHaveBeenCalledWith('123456789', ['gs1', 'gs2']);
        expect(mockInteraction.editReply).toHaveBeenCalledWith(
            'Sync complete! ✨\n' +
            '- Found 0 new games for the bot.\n' +
            '- Added 2 games to your personal library.'
        );
    });

    test('should handle errors gracefully', async () => {
        // Arrange
        userManagerService.getSteamIdForUser.mockRejectedValue(new Error('Test error'));

        // Act
        await execute(mockInteraction);

        // Assert
        expect(mockInteraction.ephemeralReply).toHaveBeenCalledWith('Starting sync... this may take a moment.');
        expect(mockInteraction.editReply).toHaveBeenCalledWith('An error occurred while syncing your library. Please try again later.');
        expect(logger.error).toHaveBeenCalled();
    });
});