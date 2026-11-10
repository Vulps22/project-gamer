import { ButtonBuilder, ButtonStyle, ContainerBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from 'discord.js';
import { Urls } from '../config/urls';
import { MessageView, view } from './MessageView';

/** v1's /help: how to use the bot, the stores it reads, every command, and the official server. */
export function helpView(commands: { name: string; description: string }[]): MessageView {
    const howTo = '### How to use LFGameSync\n'
        + '1. **Add Games to your Library**: Use the `/library add` command with a game\'s store page link, or `/steam connect` to sync your Steam games.\n'
        + '2. **Share Your Library**: Use the `/sharing` command to allow others to see which games you own.\n'
        + '3. **Find Gamers**: Use the `/lfg` command to discover other players who share your interests.';

    const stores = '### Supported Stores\n'
        + 'LFGameSync can automatically identify and register games from the following store page URLs:\n'
        + '- **Steam**\n\n'
        + '_If you add a game using a URL from an unsupported store, it will be sent to our team for manual review._';

    const commandList = commands.map(command => `> ### /${command.name}\n> *${command.description}*`).join('\n\n');

    return view(new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## LFGameSync Command List'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(howTo))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(stores))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(commandList))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('For help or to find even more Gamers, join our official server!'))
            .setButtonAccessory(new ButtonBuilder().setLabel('Join the Official Server').setStyle(ButtonStyle.Link).setURL(Urls.OFFICIAL_SERVER))));
}
