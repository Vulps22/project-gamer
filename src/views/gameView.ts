import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { Game, StoreLink } from '../types/models';
import { addCoverArt } from './coverArt';
import { MessageView, view } from './MessageView';

/** A game card: name, cover art and store links. With a post button, so the viewer can share it in chat. */
export function gameView(game: Game, links: StoreLink[], options: { subtitle?: string; postButtonId?: string } = {}): MessageView {
    const lines = [`## ${game.name}`];
    if (options.subtitle) {
        lines.push(options.subtitle);
    }
    if (links.length > 0) {
        lines.push(links.map(link => `[${link.store_name}](${link.url})`).join(' · '));
    }

    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    addCoverArt(container, game.cover_art, game.name);
    if (options.postButtonId) {
        container.addActionRowComponents(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId(options.postButtonId).setLabel('Post to Chat').setStyle(ButtonStyle.Primary),
            ),
        );
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
