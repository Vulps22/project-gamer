const { SlashCommandBuilder } = require('discord.js');
const { execute, autoComplete } = require('../library');

// Mock dependencies
jest.mock('../../../services/gameManagerService', () => ({
    gameManagerService: {
        searchUserGamesByName: jest.fn(),
        searchGamesByName: jest.fn(),
        getStoresForGame: jest.fn(),
        getAllStoresForGame: jest.fn(),
    }
}));

jest.mock('../../../messages', () => ({
    chooseStoresMessage: jest.fn(),
    GlobalMessages: {}
}));

const { gameManagerService } = require('../../../services/gameManagerService');
const { chooseStoresMessage } = require('../../../messages');

describe('Library Command', () => {
    let mockInteraction;
    let mockAutocompleteInteraction;

    beforeEach(() => {
        jest.clearAllMocks();

        mockInteraction = {
            options: {
                getSubcommand: jest.fn(),
                getString: jest.fn(),
            },
            user: {
                id: 'user123'
            },
            ephemeralReply: jest.fn(),
        };

        mockAutocompleteInteraction = {
            options: {
                getSubcommand: jest.fn(),
                getFocused: jest.fn(),
            },
            user: {
                id: 'user123'
            },
            respond: jest.fn(),
        };
    });

    describe('autoComplete', () => {
        test('should search user games for remove subcommand', async () => {
            // Arrange
            mockAutocompleteInteraction.options.getSubcommand.mockReturnValue('remove');
            mockAutocompleteInteraction.options.getFocused.mockReturnValue('test');
            gameManagerService.searchUserGamesByName.mockResolvedValue([
                { id: 1, name: 'Test Game 1' },
                { id: 2, name: 'Test Game 2' }
            ]);

            // Act
            await autoComplete(mockAutocompleteInteraction);

            // Assert
            expect(gameManagerService.searchUserGamesByName).toHaveBeenCalledWith('test', 'user123');
            expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
                { name: 'Test Game 1', value: '1' },
                { name: 'Test Game 2', value: '2' }
            ]);
        });

        test('should search user games for view subcommand', async () => {
            // Arrange
            mockAutocompleteInteraction.options.getSubcommand.mockReturnValue('view');
            mockAutocompleteInteraction.options.getFocused.mockReturnValue('space');
            gameManagerService.searchUserGamesByName.mockResolvedValue([
                { id: 3, name: 'Space Game' }
            ]);

            // Act
            await autoComplete(mockAutocompleteInteraction);

            // Assert
            expect(gameManagerService.searchUserGamesByName).toHaveBeenCalledWith('space', 'user123');
            expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
                { name: 'Space Game', value: '3' }
            ]);
        });

        test('should search all games for add subcommand', async () => {
            // Arrange
            mockAutocompleteInteraction.options.getSubcommand.mockReturnValue('add');
            mockAutocompleteInteraction.options.getFocused.mockReturnValue('minecraft');
            gameManagerService.searchGamesByName.mockResolvedValue([
                { id: 4, name: 'Minecraft' }
            ]);

            // Act
            await autoComplete(mockAutocompleteInteraction);

            // Assert
            expect(gameManagerService.searchGamesByName).toHaveBeenCalledWith('minecraft');
            expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
                { name: 'Minecraft', value: '4' }
            ]);
        });

        test('should return no games found when no results', async () => {
            // Arrange
            mockAutocompleteInteraction.options.getSubcommand.mockReturnValue('add');
            mockAutocompleteInteraction.options.getFocused.mockReturnValue('nonexistent');
            gameManagerService.searchGamesByName.mockResolvedValue([]);

            // Act
            await autoComplete(mockAutocompleteInteraction);

            // Assert
            expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
                { name: 'No games found', value: 'none' }
            ]);
        });
    });

    describe('execute', () => {
        test('should return info message for view subcommand', async () => {
            // Arrange
            mockInteraction.options.getSubcommand.mockReturnValue('view');

            // Act
            await execute(mockInteraction);

            // Assert
            expect(mockInteraction.ephemeralReply).toHaveBeenCalledWith(
                'Hello! We plan to flesh this out in the future,' +
                ' but felt it was important to give everyone a way to see which games they have already added to their library.' +
                ' For now, you can use `/library view` to see your games in the autocomplete.'
            );
            expect(gameManagerService.getStoresForGame).not.toHaveBeenCalled();
        });

        test('should handle add subcommand', async () => {
            // Arrange
            mockInteraction.options.getSubcommand.mockReturnValue('add');
            mockInteraction.options.getString.mockReturnValue('123');
            const mockStores = [{ id: 1, name: 'Steam' }];
            const mockMessage = { content: 'Choose store message' };

            gameManagerService.getStoresForGame.mockResolvedValue(mockStores);
            chooseStoresMessage.mockReturnValue(mockMessage);

            // Act
            await execute(mockInteraction);

            // Assert
            expect(gameManagerService.getStoresForGame).toHaveBeenCalledWith('123', 'user123');
            expect(chooseStoresMessage).toHaveBeenCalledWith(mockStores, false);
            expect(mockInteraction.ephemeralReply).toHaveBeenCalledWith(null, mockMessage);
        });

        test('should handle remove subcommand', async () => {
            // Arrange
            mockInteraction.options.getSubcommand.mockReturnValue('remove');
            mockInteraction.options.getString.mockReturnValue('456');
            const mockAllStores = [{ id: 1, name: 'Steam' }, { id: 2, name: 'Epic' }];
            const mockMessage = { content: 'Choose store to remove message' };

            gameManagerService.getAllStoresForGame.mockResolvedValue(mockAllStores);
            chooseStoresMessage.mockReturnValue(mockMessage);

            // Act
            await execute(mockInteraction);

            // Assert
            expect(gameManagerService.getStoresForGame).toHaveBeenCalledWith('456', 'user123');
            expect(gameManagerService.getAllStoresForGame).toHaveBeenCalledWith('456');
            expect(chooseStoresMessage).toHaveBeenCalledWith(mockAllStores, true);
            expect(mockInteraction.ephemeralReply).toHaveBeenCalledWith(null, mockMessage);
        });
    });
});
