import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { mockServices } from '../../../../tests/mocks';
import haveGame from '../../library/haveGame';
import postGame from '../../library/postGame';

const game = { id: '0b6f3c2e-1d4a-4c8e-9f0a-2b3c4d5e6f70', name: 'ARC Raiders', cover_art: null };

function button(params: Record<string, string>) {
    return {
        user: { id: '222', username: 'friend' }, guildId: '9001', channel: { id: 'chan-1' },
        params: new Map(Object.entries(params)),
        deferUpdate: jest.fn().mockResolvedValue(undefined),
        ephemeralFollowUp: jest.fn().mockResolvedValue(undefined),
        createCustomId: jest.fn((prefix: string, action: string, p: Record<string, string>) => `${prefix}_${action}_g:${p.g}`),
    } as unknown as BotButtonInteraction & { ephemeralFollowUp: jest.Mock };
}

function setup(added: boolean) {
    return mockServices({
        users: { ensure: jest.fn().mockResolvedValue({ id: 'acc-2', discord_id: '222' }) },
        servers: { ensure: jest.fn().mockResolvedValue({ id: 'srv-1' }), ensureMember: jest.fn().mockResolvedValue(undefined) },
        games: { getById: jest.fn().mockResolvedValue(game), storeLinks: jest.fn().mockResolvedValue([]) },
        library: { add: jest.fn().mockResolvedValue(added) },
        discord: { send: jest.fn().mockResolvedValue('msg-1') },
    } as never);
}

const followUp = (i: { ephemeralFollowUp: jest.Mock }): string => JSON.stringify(i.ephemeralFollowUp.mock.calls[0][0]);

describe('I have this game', () => {
    it('adds the game to the clicker\'s library', async () => {
        const services = setup(true);
        const i = button({ g: '0b6f3c2e-1d4a-4c8e-9f0a-2b3c4d5e6f70' });
        await haveGame.execute(i, services);
        expect(i.deferUpdate).toHaveBeenCalled();
        expect(services.library.add).toHaveBeenCalledWith('acc-2', '0b6f3c2e-1d4a-4c8e-9f0a-2b3c4d5e6f70', 'manual');
        expect(followUp(i)).toContain('Added **ARC Raiders**');
    });

    it('says so when they already have it', async () => {
        const services = setup(false);
        const i = button({ g: '0b6f3c2e-1d4a-4c8e-9f0a-2b3c4d5e6f70' });
        await haveGame.execute(i, services);
        expect(followUp(i)).toContain('already in your library');
    });

    it('is on the card Post to Chat sends', async () => {
        const services = setup(true);
        await postGame.execute(button({ g: '0b6f3c2e-1d4a-4c8e-9f0a-2b3c4d5e6f70' }), services);
        const card = JSON.stringify((services.discord.send as jest.Mock).mock.calls[0][1]);
        expect(card).toContain('I have this game');
        expect(card).toContain('library_haveGame_g:0b6f3c2e-1d4a-4c8e-9f0a-2b3c4d5e6f70');
    });
});
