const { gameManagerService } = require('../gameManagerService');

// Mock the dependencies
jest.mock('../../lib', () => ({
    db: {
        query: jest.fn(),
    },
    logger: {
        log: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../../provider', () => ({
    clientProvider: {
        getClient: jest.fn(),
    },
}));

const { db } = require('../../lib');
const { clientProvider } = require('../../provider');

describe('GameManagerService', () => {
    let mockClient;

    beforeEach(() => {
        jest.clearAllMocks();

        mockClient = {
            users: {
                cache: new Map(),
                fetch: jest.fn(),
            },
        };

        clientProvider.getClient.mockReturnValue(mockClient);
        gameManagerService.init();
    });

    describe('getUsersForGame', () => {
        test('should fetch users from Discord API when not in cache', async () => {
            // Arrange
            const gameId = '123';
            const guildId = '456';
            const userIds = [
                { id: 'user1' },
                { id: 'user2' },
                { id: 'user3' }
            ];

            db.query.mockResolvedValue(userIds);

            // Mock that user1 is in cache, user2 and user3 are not
            const cachedUser = { id: 'user1', username: 'CachedUser' };
            const fetchedUser2 = { id: 'user2', username: 'FetchedUser2' };
            const fetchedUser3 = { id: 'user3', username: 'FetchedUser3' };

            mockClient.users.cache.set('user1', cachedUser);

            mockClient.users.fetch
                .mockResolvedValueOnce(fetchedUser2) // First call for user2
                .mockResolvedValueOnce(fetchedUser3); // Second call for user3

            // Act
            const result = await gameManagerService.getUsersForGame(gameId, guildId);

            // Assert
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT DISTINCT'),
                { serverId: guildId, gameId: gameId }
            );

            expect(mockClient.users.fetch).toHaveBeenCalledTimes(2);
            expect(mockClient.users.fetch).toHaveBeenCalledWith('user2');
            expect(mockClient.users.fetch).toHaveBeenCalledWith('user3');

            expect(result).toEqual([
                { id: 'user1', username: 'CachedUser' },
                { id: 'user2', username: 'FetchedUser2' },
                { id: 'user3', username: 'FetchedUser3' }
            ]);
        });

        test('should handle failed user fetch gracefully', async () => {
            // Arrange
            const gameId = '123';
            const guildId = '456';
            const userIds = [{ id: 'user1' }];

            db.query.mockResolvedValue(userIds);

            // User is not in cache and fetch fails
            mockClient.users.fetch.mockRejectedValue(new Error('User not found'));

            // Act
            const result = await gameManagerService.getUsersForGame(gameId, guildId);

            // Assert
            expect(mockClient.users.fetch).toHaveBeenCalledWith('user1');
            expect(result).toEqual([
                { id: 'user1', username: 'Unknown User' }
            ]);
        });

        test('should return empty array when client is not available', async () => {
            // Arrange
            clientProvider.getClient.mockReturnValue(null);

            // Act
            const result = await gameManagerService.getUsersForGame('123', '456');

            // Assert
            expect(result).toEqual([]);
        });

        test('should use cached users when available', async () => {
            // Arrange
            const gameId = '123';
            const guildId = '456';
            const userIds = [{ id: 'user1' }, { id: 'user2' }];

            db.query.mockResolvedValue(userIds);

            // Both users are in cache
            const cachedUser1 = { id: 'user1', username: 'CachedUser1' };
            const cachedUser2 = { id: 'user2', username: 'CachedUser2' };

            mockClient.users.cache.set('user1', cachedUser1);
            mockClient.users.cache.set('user2', cachedUser2);

            // Act
            const result = await gameManagerService.getUsersForGame(gameId, guildId);

            // Assert
            expect(mockClient.users.fetch).not.toHaveBeenCalled();
            expect(result).toEqual([
                { id: 'user1', username: 'CachedUser1' },
                { id: 'user2', username: 'CachedUser2' }
            ]);
        });
    });

    describe('searchGamesByName', () => {
        test('should return games matching search term', async () => {
            // Arrange
            const searchTerm = 'minecraft';
            const mockGames = [
                { id: 1, name: 'Minecraft', popularity: 10 },
                { id: 2, name: 'Minecraft Dungeons', popularity: 5 }
            ];
            db.query.mockResolvedValue(mockGames);

            // Act
            const result = await gameManagerService.searchGamesByName(searchTerm);

            // Assert
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE'),
                expect.objectContaining({ name: `%${searchTerm}%` })
            );
            expect(result).toEqual(mockGames);
        });

        test('should return empty array when no games found', async () => {
            // Arrange
            db.query.mockResolvedValue([]);

            // Act
            const result = await gameManagerService.searchGamesByName('nonexistent');

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('searchUserGamesByName', () => {
        test('should return user games matching search term', async () => {
            // Arrange
            const searchTerm = 'space';
            const userId = 'user123';
            const mockUserGames = [
                { id: 3, name: 'Space Engineers', popularity: 1 },
                { id: 4, name: 'Deep Space Battle Simulator', popularity: 1 }
            ];
            db.query.mockResolvedValue(mockUserGames);

            // Act
            const result = await gameManagerService.searchUserGamesByName(searchTerm, userId);

            // Assert
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('JOIN'),
                expect.objectContaining({ userId: userId, name: `%${searchTerm}%` })
            );
            expect(result).toEqual(mockUserGames);
        });

        test('should return empty array when user has no matching games', async () => {
            // Arrange
            db.query.mockResolvedValue([]);

            // Act
            const result = await gameManagerService.searchUserGamesByName('test', 'user456');

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('getStoresForGame', () => {
        test('should return stores where user owns the game', async () => {
            // Arrange
            const gameId = '123';
            const userId = 'user789';
            const mockStores = [
                { id: 1, name: 'Steam', url: 'https://store.steampowered.com/app/123' },
                { id: 2, name: 'Epic Games', url: 'https://store.epicgames.com/game/123' }
            ];
            db.query.mockResolvedValue(mockStores);

            // Act
            const result = await gameManagerService.getStoresForGame(gameId, userId);

            // Assert
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('LEFT JOIN'),
                [userId, gameId]
            );
            expect(result).toEqual(mockStores);
        });

        test('should return empty array when user does not own game on any store', async () => {
            // Arrange
            db.query.mockResolvedValue([]);

            // Act
            const result = await gameManagerService.getStoresForGame('999', 'user999');

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('getAllStoresForGame', () => {
        test('should return all stores where game is available', async () => {
            // Arrange
            const gameId = '456';
            const mockAllStores = [
                { id: 1, name: 'Steam', url: 'https://store.steampowered.com/app/456' },
                { id: 2, name: 'Epic Games', url: 'https://store.epicgames.com/game/456' },
                { id: 3, name: 'GOG', url: 'https://gog.com/game/456' }
            ];
            db.query.mockResolvedValue(mockAllStores);

            // Act
            const result = await gameManagerService.getAllStoresForGame(gameId);

            // Assert
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('FROM'),
                [gameId]
            );
            expect(result).toEqual(mockAllStores);
        });

        test('should return empty array when game is not available on any store', async () => {
            // Arrange
            db.query.mockResolvedValue([]);

            // Act
            const result = await gameManagerService.getAllStoresForGame('999');

            // Assert
            expect(result).toEqual([]);
        });
    });
});
