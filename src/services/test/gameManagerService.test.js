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
});
