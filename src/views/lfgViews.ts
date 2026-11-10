import {
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, SeparatorBuilder,
    StringSelectMenuBuilder, TextDisplayBuilder,
} from 'discord.js';
import { CustomIdFactory } from '../discord/customIds';
import { LfgPostDetails } from '../services/LfgService';
import { Game } from '../types/models';
import { addCoverArt } from './coverArt';
import { MessageView, view } from './MessageView';

export interface PlayerOption {
    discordId: string;
    label: string;
}

/** A select menu holds at most 25 options. */
export const MAX_PLAYER_OPTIONS = 25;

/** The poster's private picker: choose players who own the game, or post an open invitation. */
export function pickPlayersView(game: Game, players: PlayerOption[], ids: CustomIdFactory): MessageView {
    const container = new ContainerBuilder();
    const shown = players.slice(0, MAX_PLAYER_OPTIONS);

    if (shown.length === 0) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## ${game.name}\nNobody else here is sharing this game yet. Post an open invitation and anyone can jump in.`,
        ));
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## ${game.name}\n${players.length} ${players.length === 1 ? 'person here has' : 'people here have'} this game. Pick who to invite, or post an open invitation.`,
        ));
        container.addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(ids('LFG_PLAYER_SELECT', { g: game.id }))
                .setPlaceholder('Choose players')
                .setMinValues(1)
                .setMaxValues(shown.length)
                .addOptions(shown.map(player => ({ label: player.label.slice(0, 100), value: player.discordId }))),
        ));
    }

    container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(ids('LFG_OPEN_INVITE', { g: game.id })).setLabel('Open Invitation').setStyle(ButtonStyle.Success),
    ));
    return view(container);
}

/**
 * The public LFG post. It is a living record: re-rendered and edited in place as the session changes.
 * Pass `ids` to show the Interested buttons; leave it null once the session has closed.
 * Set `ping` only when the post is first sent, so edits never ping anyone again.
 */
export function lfgPostView(details: LfgPostDetails, ids: CustomIdFactory | null, ping = false): MessageView {
    const { post } = details;
    const isOpen = details.inviteeDiscordIds.length === 0;
    const isActive = post.status === 'active';

    const lines = [`## 🎮 ${details.gameName}`, `<@${details.posterDiscordId}> wants to play **now**!`];
    if (isOpen) {
        const role = details.lfgRoleId ? `<@&${details.lfgRoleId}> ` : '';
        lines.push(`${role}Open invitation: anyone with the game, jump in!`);
    } else {
        lines.push(`Playing with ${details.inviteeDiscordIds.map(id => `<@${id}>`).join(', ')}`);
    }
    lines.push(vcLine(details));

    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

    if (isOpen) {
        const interested = details.interestedDiscordIds.length > 0
            ? details.interestedDiscordIds.map(id => `<@${id}>`).join(', ')
            : 'Nobody yet';
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Interested:** ${interested}`));
        if (isActive && ids) {
            container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId(ids('LFG_INTERESTED', { p: post.id })).setLabel('Interested').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(ids('LFG_NOT_INTERESTED', { p: post.id })).setLabel('Not Interested').setStyle(ButtonStyle.Secondary),
            ));
        }
    }

    addCoverArt(container, details.coverArt, details.gameName);

    if (!ping) {
        return view(container);
    }
    return view(container, { users: details.inviteeDiscordIds, roles: isOpen && details.lfgRoleId ? [details.lfgRoleId] : [] });
}

function vcLine(details: LfgPostDetails): string {
    if (details.post.status !== 'active') {
        return '**VC:** ❌ CLOSED';
    }
    return details.post.vc_channel_id ? `**VC:** <#${details.post.vc_channel_id}>` : '**VC:** setting up…';
}
