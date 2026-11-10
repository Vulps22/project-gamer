import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { customIdsFor } from '../../discord/customIds';
import { PgCommandInteraction } from '../../discord/interactions';
import { Services } from '../../services';
import { steamCallbackUrl } from '../../steam/SteamApi';
import { CommandHandler } from '../../types/Handler';
import { noticeView } from '../../views/MessageView';
import { steamAlreadyLinkedView, steamConnectView, steamNotLinkedView, steamSyncStartedView, steamUnlinkedView } from '../../views/steamViews';
import { guildContext } from '../context';
import { EPHEMERAL } from '../shared/ephemeral';

/** A manual sync this soon after the last one is refused, so /steam sync can't hammer Steam's API. */
const SYNC_COOLDOWN_MS = 10 * 60 * 1000;

export const steam: CommandHandler = {
    name: 'steam',
    data: new SlashCommandBuilder()
        .setName('steam')
        .setDescription('Link your Steam account to sync your games')
        .setContexts(InteractionContextType.Guild)
        .addSubcommand(sub => sub.setName('connect').setDescription('Link your Steam account. Your Steam games are added to your library and kept in sync.'))
        .addSubcommand(sub => sub.setName('sync').setDescription('Sync your Steam games now'))
        .addSubcommand(sub => sub.setName('unlink').setDescription('Unlink your Steam account. Games already in your library stay.'))
        .toJSON(),

    async execute(interaction, services) {
        await interaction.deferReply(EPHEMERAL);
        switch (interaction.options.getSubcommand()) {
            case 'connect':
                return connect(interaction, services);
            case 'sync':
                return sync(interaction, services);
            case 'unlink':
                return unlink(interaction, services);
            default:
                throw new Error(`Unknown /steam subcommand ${interaction.options.getSubcommand()}`);
        }
    },
};

async function connect(interaction: PgCommandInteraction, services: Services): Promise<void> {
    const { account } = await guildContext(interaction, services);
    if (await services.steam.getLink(account.id)) {
        await interaction.editReply(steamAlreadyLinkedView(customIdsFor(interaction)));
        return;
    }
    const state = await services.steamLogins.create({
        discordUserId: interaction.user.id,
        applicationId: interaction.applicationId,
        interactionToken: interaction.token,
    });
    const { publicUrl } = services.config;
    await interaction.editReply(steamConnectView(services.steamApi.loginUrl(steamCallbackUrl(publicUrl, state), publicUrl)));
    services.log.log(`${interaction.user.username} (${interaction.user.id}) started linking a Steam account`);
}

async function sync(interaction: PgCommandInteraction, services: Services): Promise<void> {
    const { account } = await guildContext(interaction, services);
    const link = await services.steam.getLink(account.id);
    if (!link) {
        await interaction.editReply(steamNotLinkedView());
        return;
    }
    const since = link.last_synced ? Date.now() - link.last_synced.getTime() : Infinity;
    if (since < SYNC_COOLDOWN_MS) {
        const wait = Math.ceil((SYNC_COOLDOWN_MS - since) / 60_000);
        await interaction.editReply(noticeView(`Your games were synced moments ago. You can sync again in ${wait} minute${wait === 1 ? '' : 's'}.`));
        return;
    }
    const queued = await services.jobs.enqueueSteamSync({
        userId: account.id,
        discordUserId: interaction.user.id,
        reason: 'requested',
        followUp: { applicationId: interaction.applicationId, interactionToken: interaction.token },
    });
    await interaction.editReply(queued ? steamSyncStartedView() : noticeView('Your Steam games are already being synced.'));
}

async function unlink(interaction: PgCommandInteraction, services: Services): Promise<void> {
    const { account } = await guildContext(interaction, services);
    if (!await services.steam.unlink(account.id)) {
        await interaction.editReply(steamNotLinkedView());
        return;
    }
    services.log.log(`${interaction.user.username} (${interaction.user.id}) unlinked their Steam account`);
    await interaction.editReply(steamUnlinkedView());
}
