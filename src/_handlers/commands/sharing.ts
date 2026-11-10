import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { CommandHandler } from '../../types/Handler';
import { noticeView, successView } from '../../views/MessageView';
import { guildContext } from '../context';
import { EPHEMERAL } from '../shared/ephemeral';

export const sharing: CommandHandler = {
    name: 'sharing',
    data: new SlashCommandBuilder()
        .setName('sharing')
        .setDescription('Show or hide your library in this server')
        .setContexts(InteractionContextType.Guild)
        .addStringOption(option => option
            .setName('state')
            .setDescription('On: people here can find you by your games. Off: they can\'t.')
            .setRequired(true)
            .addChoices({ name: 'on', value: 'on' }, { name: 'off', value: 'off' }))
        .toJSON(),

    async execute(interaction, services) {
        await interaction.deferReply(EPHEMERAL);
        const { account, server } = await guildContext(interaction, services);
        const on = interaction.options.getString('state', true) === 'on';
        const changed = await services.servers.setSharing(server.id, account.id, on);
        if (changed) {
            services.log.log(`${interaction.user.username} (${interaction.user.id}) turned library sharing ${on ? 'on' : 'off'} in server ${interaction.guildId ?? '?'}`);
        }

        if (!changed) {
            await interaction.editReply(noticeView(on ? 'You\'re already sharing your library here.' : 'Your library is already hidden here.'));
        } else {
            await interaction.editReply(successView(on
                ? 'You\'re now sharing your library here. People can find you when they look for players.'
                : 'Your library is now hidden here. You won\'t show up when people look for players.'));
        }
    },
};
