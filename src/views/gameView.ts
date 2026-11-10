import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from 'discord.js';
import { Game, StoreLink } from '../types/models';
import { coverImage } from './coverArt';
import { MessageView, view } from './MessageView';

/** Custom IDs for a game card's buttons. Each one given is shown, in v1's order: Add, Remove, Share. */
export interface GameCardButtons {
    addId?: string;
    removeId?: string;
    shareId?: string;
}

/**
 * v1's game card: title, cover art, the stores it's on, how many people own it, and buttons. Ephemeral
 * (your own library) it has Remove from Library and Share with Channel; shared in the channel it has
 * Add to Library and Remove from Library.
 */
export function gameView(game: Game, links: StoreLink[], owners: { community: number; global: number }, buttons: GameCardButtons): MessageView {
    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${game.name}`));
    if (game.cover_art) {
        container.addMediaGalleryComponents(coverImage(game.cover_art, game.name));
    }
    container
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(['### Stores', ...links.map(link => `- [${link.store_name}](${link.url})`)].join('\n')))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**${owners.community}** members of this community own this game.\n**${owners.global}** members globally own this game.`,
        ))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    const row: ButtonBuilder[] = [];
    if (buttons.addId) {
        row.push(new ButtonBuilder().setCustomId(buttons.addId).setLabel('Add to Library').setStyle(ButtonStyle.Success));
    }
    if (buttons.removeId) {
        row.push(new ButtonBuilder().setCustomId(buttons.removeId).setLabel('Remove from Library').setStyle(ButtonStyle.Danger));
    }
    if (buttons.shareId) {
        row.push(new ButtonBuilder().setCustomId(buttons.shareId).setLabel('Share with Channel').setStyle(ButtonStyle.Primary));
    }
    if (row.length > 0) {
        container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(row));
    }
    return view(container);
}

/** Text displays are capped at 4000 characters; leave room for the heading and the "and N more" line. */
const LIST_LIMIT = 3800;

export function libraryListView(ownerDiscordId: string, games: Game[], isOwn: boolean): MessageView {
    const heading = isOwn ? '## Your library' : `## <@${ownerDiscordId}>'s library`;
    if (games.length === 0) {
        const empty = isOwn ? 'Your library is empty. Add a game with `/library add`.' : 'Their library is empty.';
        return view(new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${heading}\n${empty}`)));
    }

    const lines: string[] = [];
    let length = 0;
    for (const game of games) {
        const line = `• ${game.name}`;
        if (length + line.length + 1 > LIST_LIMIT) {
            break;
        }
        lines.push(line);
        length += line.length + 1;
    }
    const hidden = games.length - lines.length;
    const footer = hidden > 0 ? `\n…and ${hidden} more. Pick one with the \`game\` option to see it.` : '';
    return view(new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${heading} (${games.length})\n${lines.join('\n')}${footer}`),
    ));
}
