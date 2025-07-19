// src/services/test/steamManagerService.test.js

// Mock external dependencies
// =============================================
jest.mock('../../config', () => ({
    config: { get: jest.fn() },
    ConfigOption: {
        STEAM_API_TOKEN: 'STEAM_API_TOKEN',
        BASE_URL: 'BASE_URL',
        ENVIRONMENT: 'ENVIRONMENT'
    },
}));
jest.mock('../../lib', () => ({
    db: { insert: jest.fn(), query: jest.fn(), delete: jest.fn() },
    logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.mock('node:crypto', () => ({ randomBytes: jest.fn() }));
jest.mock('axios');

// Import modules AFTER mocks are set up
// ==========================================================
let { config, ConfigOption } = require('../../config.js');
let { db, logger } = require('../../lib');
let crypto = require('node:crypto');
let axios = require('axios');

// Test Suite
// ==========================================================
describe('SteamManagerService', () => {
    let steamManagerService;
    const FAKE_USER_ID = '123456789012345678';
    const FAKE_SESSION_TOKEN = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    const FAKE_STEAM_ID = '76561197960287930';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        // Re-require ALL dependencies here, after the reset
        ({ config, ConfigOption } = require('../../config')); // Use your correct path
        ({ db, logger } = require('../../lib'));
        crypto = require('node:crypto');
        axios = require('axios');
        steamManagerService = require('../steamManagerService');

        // Re-import the service to use the fresh state
        const SteamManagerServiceModule = require('../steamManagerService');
        steamManagerService = SteamManagerServiceModule;

        // <-- FIX: Provide a default mock implementation for crypto.randomBytes for EVERY test.
        // This was the cause of the error.
        crypto.randomBytes.mockReturnValue(Buffer.from(FAKE_SESSION_TOKEN, 'hex'));
    });

    describe('Initialization and Singleton', () => {
        it('should be a singleton and return the same instance', () => {
            const instance1 = require('../steamManagerService');
            const instance2 = require('../steamManagerService');
            expect(instance1).toBe(instance2);
        });
        it('should initialize correctly', async () => {
            expect(steamManagerService.isInitialized).toBe(false);
            await steamManagerService.init();
            expect(steamManagerService.isInitialized).toBe(true);
        });
    });

    describe('getToken', () => {
        it('should retrieve the Steam API token from config', () => {
            const fakeToken = 'MY_FAKE_STEAM_TOKEN';
            config.get.mockReturnValue(fakeToken);
            const token = steamManagerService.getToken();
            console.log('Retrieved token:', token); // <-- Added for debugging
            expect(token).toBe(fakeToken);
            expect(config.get).toHaveBeenCalledWith(ConfigOption.STEAM_API_TOKEN);
        });
    });

    describe('generateSession', () => {
        it('should generate and save a unique session token', async () => {
            db.insert.mockResolvedValue();
            const token = await steamManagerService.generateSession(FAKE_USER_ID);
            expect(token).toBe(FAKE_SESSION_TOKEN);
            expect(crypto.randomBytes).toHaveBeenCalledWith(32);
            expect(db.insert).toHaveBeenCalledWith('steam_link_sessions', {
                token: FAKE_SESSION_TOKEN,
                userId: FAKE_USER_ID,
                expiresAt: expect.any(String),
            });
            expect(logger.log).toHaveBeenCalled();
        });

        it('should throw an error if the database fails to save the session', async () => {
            db.insert.mockRejectedValue(new Error('DB connection failed'));
            await expect(steamManagerService.generateSession(FAKE_USER_ID))
                .rejects.toThrow('Failed to generate Steam link session. Please try again.');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('getSessionURL', () => {
    // <-- REMOVED: The beforeEach block here is no longer needed because the mock is set globally for all tests now.

        it('should create a valid Steam login URL', async () => {
            const fakeBaseUrl = 'https://my-bot.com';
            db.insert.mockResolvedValue(); // Still need to mock this for the generateSession call
            config.get.mockReturnValue(fakeBaseUrl);
            const url = await steamManagerService.getSessionURL(FAKE_USER_ID);
            expect(url).toContain('https://steamcommunity.com/openid/login');
            expect(url).toContain(`state%3D${FAKE_SESSION_TOKEN}`); // URL-encoded version of state=
            expect(url).toContain(`openid.return_to=${encodeURIComponent(`${fakeBaseUrl}/auth/steam/callback?state=${FAKE_SESSION_TOKEN}`)}`);
            expect(logger.log).toHaveBeenCalled();
        });

        it('should throw an error if BASE_URL is not configured', async () => {
            db.insert.mockResolvedValue();
            config.get.mockReturnValue(null);
            await expect(steamManagerService.getSessionURL(FAKE_USER_ID))
                .rejects
                .toThrow('Failed to create Steam login URL. Please try again.');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('validateSession', () => {
        it('should return user data for a valid, non-expired token', async () => {
            const futureDate = new Date();
            futureDate.setMinutes(futureDate.getMinutes() + 10);
            const mockSession = [{ userId: FAKE_USER_ID, expiresAt: futureDate.toISOString() }];
            db.query.mockResolvedValue(mockSession);
            const result = await steamManagerService.validateSession(FAKE_SESSION_TOKEN);
            expect(result).toEqual({ userId: FAKE_USER_ID, expiresAt: expect.any(Date) });
            expect(db.query).toHaveBeenCalledWith(expect.any(String), [FAKE_SESSION_TOKEN]);
        });

        it('should return null for an invalid or non-existent token', async () => {
            db.query.mockResolvedValue([]);
            const result = await steamManagerService.validateSession('INVALID_TOKEN');
            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid or non-existent state token'));
        });

        it('should return null and burn the session for an expired token', async () => {
            const pastDate = new Date();
            pastDate.setMinutes(pastDate.getMinutes() - 10);
            const mockSession = [{ userId: FAKE_USER_ID, expiresAt: pastDate.toISOString() }];
            db.query.mockResolvedValue(mockSession);
            db.delete.mockResolvedValue();
            const result = await steamManagerService.validateSession(FAKE_SESSION_TOKEN);
            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Expired state token found'));
            expect(db.delete).toHaveBeenCalledWith('steam_link_sessions', 'token = ?', [FAKE_SESSION_TOKEN]);
        });
    });

    describe('getSteamLibrary', () => {
        it('should fetch and return a user\'s game library successfully', async () => {
            const fakeApiKey = 'MY_FAKE_STEAM_TOKEN';
            const mockGames = [{ appid: 10, name: 'Game A' }, { appid: 20, name: 'Game B' }];
            const mockApiResponse = { data: { response: { games: mockGames } } };
            config.get.mockReturnValue(fakeApiKey);
            axios.get.mockResolvedValue(mockApiResponse);
            const games = await steamManagerService.getSteamLibrary(FAKE_STEAM_ID);
            expect(games).toEqual(mockGames);
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining(FAKE_STEAM_ID));
            expect(logger.log).toHaveBeenCalled();
        });

        it('should return null if the user is not linked (steamId is null)', async () => {
            const result = await steamManagerService.getSteamLibrary(null);
            expect(result).toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should throw an error if the Steam API key is missing', async () => {
            config.get.mockReturnValue(null);
            await expect(steamManagerService.getSteamLibrary(FAKE_STEAM_ID))
                .rejects
                .toThrow('Failed to fetch Steam library. Check logs for details.');
            expect(logger.error).toHaveBeenCalledWith('Steam API Key is not configured.');
        });

        it('should return null if the API response has an unexpected structure', async () => {
            config.get.mockReturnValue('some-key');
            const mockApiResponse = { data: { response: { no_games_here: true } } };
            axios.get.mockResolvedValue(mockApiResponse);
            const result = await steamManagerService.getSteamLibrary(FAKE_STEAM_ID);
            expect(result).toBeNull();
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('did not return expected game data'));
        });

        it('should throw an error on Steam API request failure', async () => {
            config.get.mockReturnValue('some-key');
            const apiError = new Error('Request failed with status code 500');
            apiError.response = { status: 500, data: { apimessage: 'Internal Server Error' } };
            axios.get.mockRejectedValue(apiError);
            await expect(steamManagerService.getSteamLibrary(FAKE_STEAM_ID))
                .rejects
                .toThrow('Failed to fetch Steam library. Check logs for details.');
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Steam API Error (Status: 500)'));
        });
    });
});