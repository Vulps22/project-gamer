import { ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { Urls } from '../config/urls';
import { MessageView, view } from './MessageView';

export function helpView(): MessageView {
    const text = [
        '## LFGameSync',
        'Find people in this server who own the same games as you, and get a session going.',
        '',
        '**Your library**',
        '`/library add <url>`: add a game from its store page',
        '`/library remove <game>`: remove a game',
        '`/library view [user] [game]`: see a library, and share a game in chat',
        '`/sharing <on|off>`: show or hide your library in this server',
        '',
        '**Steam**',
        '`/steam connect`: link your Steam account; your Steam games are added and kept in sync',
        '`/steam sync`: sync your Steam games now',
        '`/steam unlink`: stop syncing (your games stay in your library)',
        '',
        '**Playing**',
        '`/lfg <game>`: find players who own a game and open a voice channel',
        '',
        '**Admins**',
        '`/config lfg-channel <channel>`: choose where LFG posts go',
        '',
        `Questions or feedback? Join the [Vulps Community Hub](${Urls.OFFICIAL_SERVER}).`,
    ].join('\n');
    return view(new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text)));
}
