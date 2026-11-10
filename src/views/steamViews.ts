import {
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder,
} from 'discord.js';
import { CustomIdFactory } from '../discord/customIds';
import { SyncResult } from '../services/SteamService';
import { errorView, MessageView, noticeView, successView, view } from './MessageView';

/** v1's link message: a button to Steam's login page. */
export function steamConnectView(loginUrl: string): MessageView {
    return view(new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Click the button below to link your Steam account'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setLabel('Link Steam Account').setStyle(ButtonStyle.Link).setURL(loginUrl),
        )));
}

/** v1's "already linked" message, with its Unlink button. */
export function steamAlreadyLinkedView(ids: CustomIdFactory): MessageView {
    return view(new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Steam Account Already Linked'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                'Your Steam account is already linked. If you want to change the linked account, please unlink it first.',
            ))
            .setButtonAccessory(new ButtonBuilder().setCustomId(ids('steam', 'unlink')).setLabel('Unlink Steam Account').setStyle(ButtonStyle.Danger))));
}

/** v1's unlink confirmation. */
export function steamUnlinkedView(): MessageView {
    return view(new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Steam Account Unlinked'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            'Your Steam account has been successfully unlinked.\nYou can now link a new Steam account with the command `/steam connect`.',
        )));
}

export function steamNotLinkedView(): MessageView {
    return noticeView('You don\'t have a Steam ID linked to your account. Please use `/steam connect` first.');
}

/** v1's "Starting sync" reply, shown while the sync runs (also once the login comes back). */
export function steamSyncStartedView(): MessageView {
    return noticeView('Starting sync... this may take a moment.');
}

/** v1's sync results. */
export function steamSyncResultView(result: SyncResult | { status: 'failed' }): MessageView {
    switch (result.status) {
        case 'synced':
            return successView(`Sync complete! ✨\n- Found ${result.newToCatalogue} new games for the bot.\n- Added ${result.addedToLibrary} games to your personal library.`);
        case 'private':
            return noticeView('Could not fetch your Steam library. It might be private or empty.\n'
                + 'Steam only shares your games if your profile\'s **Game details** are public (Profile → Edit Profile → Privacy Settings).');
        case 'not_linked':
            return steamNotLinkedView();
        case 'failed':
            return errorView('An error occurred while syncing your library. Please try again later.');
    }
}
