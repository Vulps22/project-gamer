import { DiscordApi } from '../../discord/DiscordApi';
import { LfgService } from '../LfgService';
import { LfgSessionService } from '../LfgSessionService';

const post = { id: 'post-1', server_id: 's', posted_by: 'u', game_id: 'g', type: 'immediate', vc_channel_id: 'vc-1', message_id: 'm-1', status: 'active' } as const;

function setup(active: typeof post | null, expired = true) {
    const lfg = {
        findActiveByVc: jest.fn().mockResolvedValue(active),
        getById: jest.fn().mockResolvedValue(active),
        expire: jest.fn().mockResolvedValue(expired),
        details: jest.fn().mockResolvedValue({
            post: { ...post, status: 'expired' }, gameName: 'Portal 2', coverArt: null, storeLinks: [], posterDiscordId: '1',
            inviteeDiscordIds: [], interestedDiscordIds: [], lfgChannelId: 'lfg', lfgRoleId: null,
        }),
    };
    const discord = { deleteChannel: jest.fn().mockResolvedValue(true), edit: jest.fn().mockResolvedValue(undefined) };
    const log = { log: jest.fn(), error: jest.fn(), debug: jest.fn(), logInteractionReceived: jest.fn() };
    const sessions = new LfgSessionService(lfg as unknown as LfgService, discord as unknown as DiscordApi, log);
    return { lfg, discord, log, sessions };
}

describe('LfgSessionService.closeByVc', () => {
    it('does nothing for a VC with no active session', async () => {
        const { discord, sessions } = setup(null);
        await sessions.closeByVc('vc-1', 'empty');
        expect(discord.deleteChannel).not.toHaveBeenCalled();
    });

    it('deletes the VC, expires the post, and marks the post closed', async () => {
        const { lfg, discord, sessions } = setup(post);
        await sessions.closeByVc('vc-1', 'empty');
        expect(discord.deleteChannel).toHaveBeenCalledWith('vc-1');
        expect(lfg.expire).toHaveBeenCalledWith('post-1');
        expect(discord.edit).toHaveBeenCalledWith('lfg', 'm-1', expect.anything());
        expect(JSON.stringify(discord.edit.mock.calls[0][2])).toContain('CLOSED');
    });

    it('leaves the post alone if another job closed it first', async () => {
        const { discord, sessions } = setup(post, false);
        await sessions.closeByVc('vc-1', 'empty');
        expect(discord.edit).not.toHaveBeenCalled();
    });

    it('logs, rather than fails, when the post can\'t be edited', async () => {
        const { discord, log, sessions } = setup(post);
        discord.edit.mockRejectedValue(new Error('Unknown Message'));
        await sessions.closeByVc('vc-1', 'empty');
        expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Unknown Message'));
    });
});

describe('LfgSessionService.closeWithoutVc', () => {
    it('closes an active session that never got a VC', async () => {
        const { lfg, discord, sessions } = setup({ ...post, vc_channel_id: null } as unknown as typeof post);
        await sessions.closeWithoutVc('post-1');
        expect(lfg.expire).toHaveBeenCalledWith('post-1');
        expect(discord.deleteChannel).not.toHaveBeenCalled();
        expect(JSON.stringify(discord.edit.mock.calls[0][2])).toContain('CLOSED');
    });

    it('leaves a session with a VC to the VC jobs', async () => {
        const { lfg, sessions } = setup(post);
        await sessions.closeWithoutVc('post-1');
        expect(lfg.expire).not.toHaveBeenCalled();
    });
});
