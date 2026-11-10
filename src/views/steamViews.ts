import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { SyncResult } from '../services/SteamService';
import { errorView, MessageView, noticeView, successView, view } from './MessageView';

const PRIVATE_HELP = 'Steam only shares your games if your profile\'s **Game details** are public. '
    + 'Set that in Steam (Profile → Edit Profile → Privacy Settings), then run `/steam sync`.';

/** The /steam connect reply: a button to Steam's login page. */
export function steamConnectView(loginUrl: string): MessageView {
    return view(new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            '## Link your Steam account\nSign in with Steam and your Steam games will be added to your library, and kept in sync. '
            + 'The link works once and expires in 15 minutes.',
        ))
        .addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setLabel('Sign in with Steam').setStyle(ButtonStyle.Link).setURL(loginUrl),
        )));
}

export function steamAlreadyLinkedView(): MessageView {
    return noticeView('Your Steam account is already linked. Use `/steam sync` to sync now, or `/steam unlink` to link a different account.');
}

/** Shown on the /steam connect reply once the login comes back, while the first sync runs. */
export function steamLinkedView(): MessageView {
    return successView('Steam account linked! Syncing your games now…');
}

export function steamSyncResultView(result: SyncResult | { status: 'failed' }): MessageView {
    switch (result.status) {
        case 'synced':
            return successView(result.addedToLibrary > 0
                ? `Steam sync done: added **${result.addedToLibrary}** game${result.addedToLibrary === 1 ? '' : 's'} to your library (you own ${result.owned} on Steam).`
                : `Steam sync done: your library already has all ${result.owned} of your Steam games.`);
        case 'private':
            return noticeView(`I couldn't see your Steam games. ${PRIVATE_HELP}`);
        case 'not_linked':
            return noticeView('Your Steam account isn\'t linked any more. Use `/steam connect` to link it.');
        case 'failed':
            return errorView('Steam didn\'t answer, so your games weren\'t synced. Please try `/steam sync` again later.');
    }
}
