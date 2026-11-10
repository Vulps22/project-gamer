import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { CustomIdFactory } from '../discord/customIds';
import { Submission } from '../types/models';
import { MessageView, view } from './MessageView';

export type ReviewState =
    | { status: 'pending'; ids: CustomIdFactory }
    | { status: 'approved'; reviewerDiscordId: string; gameName: string }
    | { status: 'rejected'; reviewerDiscordId: string };

/** The admin queue's card for a submission, with Approve / Reject while it is pending. */
export function submissionView(submission: Submission, submitterDiscordId: string, storeName: string | null, state: ReviewState): MessageView {
    const lines = [
        '## New game submission',
        `**Submitted by:** <@${submitterDiscordId}>`,
        `**URL:** ${submission.url}`,
        `**Store:** ${storeName ?? 'Unrecognised'}`,
    ];
    if (state.status === 'approved') {
        lines.push(`✅ Approved by <@${state.reviewerDiscordId}> as **${state.gameName}**`);
    } else if (state.status === 'rejected') {
        lines.push(`❌ Rejected by <@${state.reviewerDiscordId}>`);
    }

    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    if (state.status === 'pending') {
        container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(state.ids('submission', 'approve', { s: submission.id })).setLabel('Approve').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(state.ids('submission', 'reject', { s: submission.id })).setLabel('Reject').setStyle(ButtonStyle.Danger),
        ));
    }
    return view(container);
}

/** The DM sent to a submitter when their game is approved. */
export function approvedDmView(gameName: string): MessageView {
    return view(new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## Your game was approved! 🎉\n**${gameName}** is now in the catalogue, and in your library.`,
    )));
}
