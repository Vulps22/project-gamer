// Mock Discord.js
jest.mock('discord.js', () => ({
    MessageFlags: {
        Ephemeral: 64,
    },
    PermissionsBitField: {
        Flags: {
            Administrator: '0x0000000000000008',
        },
    },
}));

const { BotInteraction } = require('../botInteraction');

describe('BotInteraction', () => {
    let mockInteraction;
    let botInteraction;

    beforeEach(() => {
        // Create a fresh mock interaction for each test
        mockInteraction = {
            user: { id: '123456789', username: 'TestUser' },
            member: { permissions: { has: jest.fn().mockReturnValue(false) } },
            channel: { id: 'channel123' },
            guild: { id: 'guild123' },
            client: { id: 'bot123' },
            customId: 'test_button',
            deferred: false,
            replied: false,
            options: {},
            commandName: 'testcommand',
            id: 'interaction123',
            guildId: 'guild123',
            values: [],
            reply: jest.fn(),
            editReply: jest.fn(),
            deferReply: jest.fn(),
            update: jest.fn(),
        };

        botInteraction = new BotInteraction(mockInteraction);
    });

    describe('Constructor and Properties', () => {
        it('should wrap the interaction and expose properties', () => {
            expect(botInteraction.user).toBe(mockInteraction.user);
            expect(botInteraction.id).toBe('interaction123');
            expect(botInteraction.guildId).toBe('guild123');
            expect(botInteraction.commandName).toBe('testcommand');
            expect(botInteraction.customId).toBe('test_button');
        });
    });

    describe('reply() - Error Handling', () => {
        it('should return success response on successful reply', async () => {
            const mockResponse = { id: 'message123' };
            mockInteraction.reply.mockResolvedValue(mockResponse);

            const result = await botInteraction.reply({ content: 'Test' });

            expect(result.success).toBe(true);
            expect(result.error).toBeNull();
            expect(result.response).toBe(mockResponse);
            expect(mockInteraction.reply).toHaveBeenCalledWith({ content: 'Test' });
        });

        it('should handle Unknown Interaction error (10062)', async () => {
            const error = new Error('Unknown interaction');
            error.code = 10062;
            mockInteraction.reply.mockRejectedValue(error);

            const result = await botInteraction.reply({ content: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:10062');
            expect(result.response).toBeNull();
        });

        it('should handle Interaction Already Acknowledged error (40060)', async () => {
            const error = new Error('Interaction already acknowledged');
            error.code = 40060;
            mockInteraction.reply.mockRejectedValue(error);

            const result = await botInteraction.reply({ content: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:40060');
            expect(result.response).toBeNull();
        });

        it('should handle Unknown Message error (10008)', async () => {
            const error = new Error('Unknown message');
            error.code = 10008;
            mockInteraction.reply.mockRejectedValue(error);

            const result = await botInteraction.reply({ content: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:10008');
        });

        it('should handle Missing Access error (50001)', async () => {
            const error = new Error('Missing access');
            error.code = 50001;
            mockInteraction.reply.mockRejectedValue(error);

            const result = await botInteraction.reply({ content: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:50001');
        });

        it('should handle Missing Permissions error (50013)', async () => {
            const error = new Error('Missing permissions');
            error.code = 50013;
            mockInteraction.reply.mockRejectedValue(error);

            const result = await botInteraction.reply({ content: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:50013');
        });

        it('should re-throw unexpected errors', async () => {
            const error = new Error('Database connection failed');
            error.code = 99999; // Unknown error code
            mockInteraction.reply.mockRejectedValue(error);

            await expect(botInteraction.reply({ content: 'Test' }))
                .rejects.toThrow('Database connection failed');
        });

        it('should re-throw errors without a code property', async () => {
            const error = new Error('Network timeout');
            mockInteraction.reply.mockRejectedValue(error);

            await expect(botInteraction.reply({ content: 'Test' }))
                .rejects.toThrow('Network timeout');
        });
    });

    describe('editReply() - Error Handling', () => {
        it('should return success response on successful edit', async () => {
            const mockResponse = { id: 'message123' };
            mockInteraction.editReply.mockResolvedValue(mockResponse);

            const result = await botInteraction.editReply({ content: 'Edited' });

            expect(result.success).toBe(true);
            expect(result.response).toBe(mockResponse);
        });

        it('should handle Unknown Interaction error', async () => {
            const error = new Error('Unknown interaction');
            error.code = 10062;
            mockInteraction.editReply.mockRejectedValue(error);

            const result = await botInteraction.editReply({ content: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:10062');
        });

        it('should re-throw unexpected errors', async () => {
            const error = new Error('Unexpected error');
            mockInteraction.editReply.mockRejectedValue(error);

            await expect(botInteraction.editReply({ content: 'Test' }))
                .rejects.toThrow('Unexpected error');
        });
    });

    describe('deferReply() - Error Handling', () => {
        it('should return success response on successful defer', async () => {
            mockInteraction.deferReply.mockResolvedValue(undefined);

            const result = await botInteraction.deferReply({ ephemeral: true });

            expect(result.success).toBe(true);
            expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
        });

        it('should handle Unknown Interaction error', async () => {
            const error = new Error('Unknown interaction');
            error.code = 10062;
            mockInteraction.deferReply.mockRejectedValue(error);

            const result = await botInteraction.deferReply();

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:10062');
        });
    });

    describe('update() - Error Handling', () => {
        it('should return success response on successful update', async () => {
            const mockResponse = { id: 'message123' };
            mockInteraction.update.mockResolvedValue(mockResponse);

            const result = await botInteraction.update({ content: 'Updated' });

            expect(result.success).toBe(true);
            expect(result.response).toBe(mockResponse);
        });

        it('should handle Unknown Interaction error', async () => {
            const error = new Error('Unknown interaction');
            error.code = 10062;
            mockInteraction.update.mockRejectedValue(error);

            const result = await botInteraction.update({ content: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:10062');
        });
    });

    describe('sendReply() - Cascading Error Handling', () => {
        it('should use reply when not deferred or replied', async () => {
            const mockResponse = { id: 'message123' };
            mockInteraction.reply.mockResolvedValue(mockResponse);

            const result = await botInteraction.sendReply('Test message');

            expect(result.success).toBe(true);
            expect(result.response).toBe(mockResponse);
            expect(mockInteraction.reply).toHaveBeenCalledWith({ content: 'Test message' });
            expect(mockInteraction.editReply).not.toHaveBeenCalled();
        });

        it('should use editReply when already deferred', async () => {
            mockInteraction.deferred = true;
            const mockResponse = { id: 'message123' };
            mockInteraction.editReply.mockResolvedValue(mockResponse);

            const result = await botInteraction.sendReply('Test message');

            expect(result.success).toBe(true);
            expect(result.response).toBe(mockResponse);
            expect(mockInteraction.editReply).toHaveBeenCalledWith({ content: 'Test message' });
            expect(mockInteraction.reply).not.toHaveBeenCalled();
        });

        it('should use editReply when already replied', async () => {
            mockInteraction.replied = true;
            const mockResponse = { id: 'message123' };
            mockInteraction.editReply.mockResolvedValue(mockResponse);

            const result = await botInteraction.sendReply('Test message');

            expect(result.success).toBe(true);
            expect(mockInteraction.editReply).toHaveBeenCalled();
        });

        it('should handle errors from reply method', async () => {
            const error = new Error('Unknown interaction');
            error.code = 10062;
            mockInteraction.reply.mockRejectedValue(error);

            const result = await botInteraction.sendReply('Test message');

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:10062');
        });

        it('should handle errors from editReply method', async () => {
            mockInteraction.deferred = true;
            const error = new Error('Unknown interaction');
            error.code = 10062;
            mockInteraction.editReply.mockRejectedValue(error);

            const result = await botInteraction.sendReply('Test message');

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:10062');
        });

        it('should merge content into options', async () => {
            mockInteraction.reply.mockResolvedValue({ id: 'message123' });

            await botInteraction.sendReply('Test', { embeds: [] });

            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'Test',
                embeds: [],
            });
        });

        it('should not add content if empty string', async () => {
            mockInteraction.reply.mockResolvedValue({ id: 'message123' });

            await botInteraction.sendReply('', { embeds: [] });

            expect(mockInteraction.reply).toHaveBeenCalledWith({ embeds: [] });
        });

        it('should not add content if null', async () => {
            mockInteraction.reply.mockResolvedValue({ id: 'message123' });

            await botInteraction.sendReply(null, { embeds: [] });

            expect(mockInteraction.reply).toHaveBeenCalledWith({ embeds: [] });
        });
    });

    describe('ephemeralReply() - Cascading Error Handling', () => {
        it('should add Ephemeral flag and call sendReply', async () => {
            const mockResponse = { id: 'message123' };
            mockInteraction.reply.mockResolvedValue(mockResponse);

            const result = await botInteraction.ephemeralReply('Test message');

            expect(result.success).toBe(true);
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'Test message',
                flags: 64, // MessageFlags.Ephemeral
            });
        });

        it('should preserve existing flags', async () => {
            mockInteraction.reply.mockResolvedValue({ id: 'message123' });

            await botInteraction.ephemeralReply('Test', { flags: 4096 }); // SuppressEmbeds

            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'Test',
                flags: 4160, // 64 | 4096
            });
        });

        it('should handle errors from sendReply cascade', async () => {
            const error = new Error('Unknown interaction');
            error.code = 10062;
            mockInteraction.reply.mockRejectedValue(error);

            const result = await botInteraction.ephemeralReply('Test message');

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:10062');
        });
    });

    describe('isAdministrator()', () => {
        it('should return true when user has Administrator permission', () => {
            mockInteraction.member.permissions.has.mockReturnValue(true);

            expect(botInteraction.isAdministrator()).toBe(true);
            expect(mockInteraction.member.permissions.has).toHaveBeenCalled();
        });

        it('should return false when user lacks Administrator permission', () => {
            mockInteraction.member.permissions.has.mockReturnValue(false);

            expect(botInteraction.isAdministrator()).toBe(false);
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle button click on expired message', async () => {
            const error = new Error('Unknown interaction');
            error.code = 10062;
            mockInteraction.update.mockRejectedValue(error);

            const result = await botInteraction.update({ content: 'Updated' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:10062');
        });

        it('should handle reply after interaction expires mid-execution', async () => {
            const error = new Error('Unknown interaction');
            error.code = 10062;
            mockInteraction.reply.mockRejectedValue(error);

            const result = await botInteraction.sendReply('Test');

            expect(result.success).toBe(false);
        });

        it('should handle double-reply attempts', async () => {
            mockInteraction.replied = true;
            const error = new Error('Interaction already acknowledged');
            error.code = 40060;
            mockInteraction.editReply.mockRejectedValue(error);

            const result = await botInteraction.sendReply('Second reply');

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:40060');
        });

        it('should handle permission loss during execution', async () => {
            const error = new Error('Missing permissions');
            error.code = 50013;
            mockInteraction.reply.mockRejectedValue(error);

            const result = await botInteraction.reply({ content: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('DiscordAPIError:50013');
        });

        it('should allow caller to retry with different method', async () => {
            const error = new Error('Unknown interaction');
            error.code = 10062;
            mockInteraction.reply.mockRejectedValue(error);
            mockInteraction.update.mockResolvedValue({ id: 'msg123' });

            // First attempt fails
            const result1 = await botInteraction.reply({ content: 'Test' });
            expect(result1.success).toBe(false);

            // Caller can try alternative method
            const result2 = await botInteraction.update({ content: 'Test' });
            expect(result2.success).toBe(true);
        });
    });
});
