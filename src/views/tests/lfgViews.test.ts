import { LfgPostDetails } from '../../services/LfgService';
import { lfgPostView, pickPlayersView } from '../lfgViews';
import { toRestBody } from '../MessageView';

const ids = (prefix: string, action: string, params?: Record<string, string | number>): string => `${prefix}_${action}:${JSON.stringify(params)}`;

function details(overrides: Partial<LfgPostDetails> = {}, status: 'active' | 'expired' = 'active'): LfgPostDetails {
    return {
        post: { id: 'post-1', server_id: 's', posted_by: 'u', game_id: 'g', type: 'immediate', vc_channel_id: 'vc-1', message_id: 'm', status },
        gameName: 'Portal 2',
        coverArt: 'https://cdn.example/portal2.jpg',
        storeLinks: [{ store_name: 'Steam', url: 'https://store.steampowered.com/app/620' }],
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
        expect(body).toContain('lfg_interested');
    });

    it('shows the VC under a Voice Channel heading', () => {
        expect(text(toRestBody(lfgPostView(details(), ids)))).toContain('**Voice Channel:**\\n<#vc-1>');
    });

    it('says why there is no voice channel when the bot couldn\'t create one', () => {
        const noVc = details();
        noVc.post = { ...noVc.post, vc_channel_id: null };
        expect(text(toRestBody(lfgPostView(noVc, ids)))).toContain(
            '**Voice Channel:**\\nI couldn\'t create a voice channel for this post because I don\'t have the `Manage Channels` permission.',
        );
    });

    it('shows the VC closed, without buttons, once the session ends', () => {
        const body = text(toRestBody(lfgPostView(details({}, 'expired'), ids)));
        expect(body).toContain('❌ CLOSED');
        expect(body).not.toContain('lfg_interested');
    });

    it('is laid out as v1: title, Available on with I have this game, then the cover', () => {
        const container = toRestBody(lfgPostView(details(), ids)).components as { components: { type: number }[] }[];
        const body = text(toRestBody(lfgPostView(details(), ids)));
        expect(body).toContain('## <@111> is looking for players to play **Portal 2**');
        expect(body).toContain('**Available on:**\\n- [Steam](<https://store.steampowered.com/app/620>)');
        expect(body).toContain('I have this game');
        expect(body).toContain('lfg_addGame');
        expect(container[0].components.at(-1)?.type).toBe(12); // the media gallery comes last
    });

    it('lists the invited players, and keeps I have this game after the session ends', () => {
        const body = text(toRestBody(lfgPostView(details({ inviteeDiscordIds: ['222'] }, 'expired'), ids)));
        expect(body).toContain('- <@222>');
        expect(body).toContain('lfg_addGame');
    });

    it('has no Interested buttons on a direct invitation', () => {
        expect(text(toRestBody(lfgPostView(details({ inviteeDiscordIds: ['222'] }), ids)))).not.toContain('lfg_interested');
    });
});

describe('pickPlayersView', () => {
    const game = { id: 'g-1', name: 'Portal 2', cover_art: null };

    it('is v1\'s picker: a player select and the Anyone button', () => {
        const body = text(toRestBody(pickPlayersView(game, [{ discordId: '222', label: 'Friend' }], ids)));
        expect(body).toContain('## Who would you like to play **Portal 2** with?');
        expect(body).toContain('Select players');
        expect(body).toContain('## Or open it up to');
        expect(body).toContain('"label":"Anyone"');
        expect(body).toContain('lfg_anyone');
    });

    it('shows No players found when nobody else has the game, as v1', () => {
        const body = text(toRestBody(pickPlayersView(game, [], ids)));
        expect(body).toContain('No players found');
    });

    it('offers up to 25 players, of which up to 10 can be picked', () => {
        const players = Array.from({ length: 30 }, (_, i) => ({ discordId: String(i), label: `Player ${i}` }));
        const select = toRestBody(pickPlayersView(game, players, ids)).components as { components: { components?: { options?: unknown[]; max_values?: number }[] }[] }[];
        const menu = select[0].components.flatMap(c => c.components ?? []).find(c => c.options);
        expect(menu?.options).toHaveLength(25);
        expect(menu?.max_values).toBe(10);
    });
});
