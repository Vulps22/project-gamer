import {
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize,
    StringSelectMenuBuilder, TextDisplayBuilder,
} from 'discord.js';
import { CustomIdFactory } from '../discord/customIds';
import { LfgPostDetails } from '../services/LfgService';
import { Game } from '../types/models';
import { coverImage } from './coverArt';
import { MessageView, view } from './MessageView';

export interface PlayerOption {
    discordId: string;
    label: string;
}

/** A select menu holds at most 25 options. */
export const MAX_PLAYER_OPTIONS = 25;
/** As v1: at most 10 players picked for one session. */
const MAX_PLAYERS_PICKED = 10;
/** The picker's only option when nobody else has the game, as in v1. Picking it is refused. */
export const NO_PLAYERS = 'none';

/** v1's player picker: choose players who own the game, or open it up to anyone. */
export function pickPlayersView(game: Game, players: PlayerOption[], ids: CustomIdFactory): MessageView {
    const shown = players.slice(0, MAX_PLAYER_OPTIONS);
    const options = shown.length > 0
        ? shown.map(player => ({ label: player.label.slice(0, 100), value: player.discordId }))
        : [{ label: 'No players found', value: NO_PLAYERS }];

    return view(new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Who would you like to play **${game.name}** with?`))
        .addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(ids('lfg', 'playerSelect', { g: game.id }))
                .setPlaceholder('Select players')
                .addOptions(options)
                .setMinValues(1)
                .setMaxValues(Math.min(MAX_PLAYERS_PICKED, options.length)),
        ))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Or open it up to'))
            .setButtonAccessory(new ButtonBuilder().setCustomId(ids('lfg', 'anyone', { g: game.id })).setLabel('Anyone').setStyle(ButtonStyle.Success))));
}

/**
 * v1's LFG post, plus v2's voice channel and Interested list. It is a living record: re-rendered and edited
 * in place as the session changes. The Interested buttons show only while the session runs.
 * Set `ping` only when the post is first sent, so edits never ping anyone again.
 */
export function lfgPostView(details: LfgPostDetails, ids: CustomIdFactory, ping = false): MessageView {
    const { post } = details;
    const isOpen = details.inviteeDiscordIds.length === 0;
    const isActive = post.status === 'active';
    const separator = (): SeparatorBuilder => new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

    const status = [`**Voice Channel:**\n${voiceChannel(details)}`];
    if (isOpen && details.lfgRoleId) {
        status.unshift(`<@&${details.lfgRoleId}> open invitation: anyone with the game, jump in!`);
    }

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## <@${details.posterDiscordId}> is looking for players to play **${details.gameName}**`),
            new TextDisplayBuilder().setContent(status.join('\n')),
        )
        .addSeparatorComponents(separator());

    if (!isOpen) {
        container
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(details.inviteeDiscordIds.map(id => `- <@${id}>`).join('\n')))
            .addSeparatorComponents(separator());
    }

    const links = details.storeLinks.map(link => `- [${link.store_name}](<${link.url}>)`).join('\n');
    container
        .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Available on:**\n${links}`))
            .setButtonAccessory(new ButtonBuilder().setCustomId(ids('lfg', 'addGame', { g: post.game_id })).setLabel('I have this game').setStyle(ButtonStyle.Success)))
        .addSeparatorComponents(separator());

    if (isOpen) {
        const interested = details.interestedDiscordIds.length > 0 ? details.interestedDiscordIds.map(id => `<@${id}>`).join(', ') : 'Nobody yet';
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Interested:** ${interested}`));
        if (isActive) {
            container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId(ids('lfg', 'interested', { p: post.id })).setLabel('Interested').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(ids('lfg', 'notInterested', { p: post.id })).setLabel('Not Interested').setStyle(ButtonStyle.Secondary),
            ));
        }
        container.addSeparatorComponents(separator());
    }

    if (details.coverArt) {
        container.addMediaGalleryComponents(coverImage(details.coverArt, details.gameName));
    }

    if (!ping) {
        return view(container);
    }
    return view(container, { users: details.inviteeDiscordIds, roles: isOpen && details.lfgRoleId ? [details.lfgRoleId] : [] });
}

/** The post is only sent once its VC exists, so an active post without one is a VC the bot couldn't create. */
function voiceChannel(details: LfgPostDetails): string {
    if (details.post.status !== 'active') {
        return '❌ CLOSED';
    }
    return details.post.vc_channel_id
        ? `<#${details.post.vc_channel_id}>`
        : 'I couldn\'t create a voice channel for this post because I don\'t have the `Manage Channels` permission.';
}
