import { LfgPostDetails } from '../../services/LfgService';
import { lfgPostView, pickPlayersView } from '../lfgViews';
import { toRestBody } from '../MessageView';

const ids = (key: string, params?: Record<string, string | number>): string => `${key}:${JSON.stringify(params)}`;

function details(overrides: Partial<LfgPostDetails> = {}, status: 'active' | 'expired' = 'active'): LfgPostDetails {
    return {
        post: { id: 'post-1', server_id: 's', posted_by: 'u', game_id: 'g', type: 'immediate', vc_channel_id: 'vc-1', message_id: 'm', status },
        gameName: 'Portal 2',
        coverArt: null,
        posterDiscordId: '111',
        inviteeDiscordIds: [],
        interestedDiscordIds: [],
        lfgChannelId: 'lfg',
        lfgRoleId: 'role-1',
        ...overrides,
    };
}

const text = (body: Record<string, unknown>): string => JSON.stringify(body.components);

describe('lfgPostView', () => {
    it('pings the @lfg role for an open invitation on first send only', () => {
        expect(lfgPostView(details(), ids, true).allowedMentions).toEqual({ users: [], roles: ['role-1'], parse: [] });
        expect(lfgPostView(details(), ids).allowedMentions).toEqual({ parse: [] });
    });

    it('pings the invitees of a direct invitation on first send, never the role', () => {
        expect(lfgPostView(details({ inviteeDiscordIds: ['222'] }), ids, true).allowedMentions).toEqual({ users: ['222'], roles: [], parse: [] });
    });

    it('shows the VC and the Interested buttons while active', () => {
        const body = text(toRestBody(lfgPostView(details({ interestedDiscordIds: ['333'] }), ids)));
        expect(body).toContain('<#vc-1>');
        expect(body).toContain('<@333>');
        expect(body).toContain('LFG_INTERESTED');
    });

    it('shows the VC closed, without buttons, once the session ends', () => {
        const body = text(toRestBody(lfgPostView(details({}, 'expired'), ids)));
        expect(body).toContain('❌ CLOSED');
        expect(body).not.toContain('LFG_INTERESTED');
    });

    it('has no Interested buttons on a direct invitation', () => {
        expect(text(toRestBody(lfgPostView(details({ inviteeDiscordIds: ['222'] }), ids)))).not.toContain('LFG_INTERESTED');
    });
});

describe('pickPlayersView', () => {
    const game = { id: 'g-1', name: 'Portal 2', cover_art: null };

    it('offers only an open invitation when nobody else has the game', () => {
        const body = text(toRestBody(pickPlayersView(game, [], ids)));
        expect(body).toContain('LFG_OPEN_INVITE');
        expect(body).not.toContain('LFG_PLAYER_SELECT');
    });

    it('caps the player select at 25 options', () => {
        const players = Array.from({ length: 30 }, (_, i) => ({ discordId: String(i), label: `Player ${i}` }));
        const select = toRestBody(pickPlayersView(game, players, ids)).components as { components: { components?: { options?: unknown[]; max_values?: number }[] }[] }[];
        const menu = select[0].components.flatMap(c => c.components ?? []).find(c => c.options);
        expect(menu?.options).toHaveLength(25);
        expect(menu?.max_values).toBe(25);
    });
});
