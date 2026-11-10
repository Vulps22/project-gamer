import { ChannelType } from 'discord.js';
import { BotComponentInteraction } from '@vulps22/bot-interactions';
import { customIdsFor } from '../../discord/customIds';
import { ensureLfgRole } from '../../discord/lfgRole';
import { UserFacingError } from '../../errors';
import { Services } from '../../services';
import { lfgPostView } from '../../views/lfgViews';
import { noticeView, successView } from '../../views/MessageView';
import { guildContext } from '../context';
import { isMissingPermission, needsPermission } from '../shared/permissions';
import { requireGame } from '../shared/requireGame';

/**
 * Starts an immediate session from the poster's picker: creates the post and its VC (if the bot may), sends the
 * living LFG post, and schedules the VC's cleanup. No invitees means an open invitation.
 */
export async function startSession(interaction: BotComponentInteraction, services: Services, gameId: string, inviteeDiscordIds: string[]): Promise<void> {
    const { account, server } = await guildContext(interaction, services);
    const guild = interaction.guild;
    if (!guild) {
        throw new Error('A guild interaction arrived without its guild');
    }
    if (!server.lfg_channel_id) {
        throw new UserFacingError('This server has no LFG channel yet. Ask an admin to run `/config lfg-channel`.');
    }
    const game = await requireGame(services, gameId);

    // Take the picker away first, so it can't start a second session.
    await interaction.editReply(noticeView('Setting up your session…'));

    // Look invitees up rather than upserting them, so being invited doesn't count as using the bot.
    // They were offered because they own the game, so they have accounts.
    const found = await Promise.all(inviteeDiscordIds.filter(id => id !== interaction.user.id).map(id => services.users.findByDiscordId(id)));
    const invitees = found.filter((invitee): invitee is NonNullable<typeof invitee> => invitee !== null);
    if (invitees.length === 0) {
        await ensureLfgRole(guild, server, services.servers, services.log);
    }

    const lfgChannel = await guild.channels.fetch(server.lfg_channel_id).catch(() => null);
    if (!lfgChannel) {
        throw new UserFacingError('I can\'t find this server\'s LFG channel. Ask an admin to set it again with `/config lfg-channel`.');
    }

    // Without Manage Channels the session still goes ahead; the post says why it has no voice channel.
    const vc = await guild.channels.create({
        name: game.name.slice(0, 100),
        type: ChannelType.GuildVoice,
        parent: lfgChannel.parentId,
        reason: `LFG session started by ${interaction.user.id}`,
    }).catch((error: unknown) => {
        if (!isMissingPermission(error)) {
            throw error;
        }
        services.log.log(`No VC for ${interaction.user.username}'s (${interaction.user.id}) LFG session in server ${guild.name} (${guild.id}): I don't have Manage Channels`);
        return null;
    });

    const post = await services.lfg.createImmediate({ serverId: server.id, postedBy: account.id, gameId: game.id, invitees: invitees.map(i => i.id) });
    if (vc) {
        await services.lfg.setVc(post.id, vc.id);
        await services.jobs.scheduleVcExpire(vc.id);
        // Nobody is in the new VC yet: it closes if nobody joins, as if the last person had left.
        await services.jobs.scheduleVcEmpty(vc.id);
    } else {
        await services.jobs.scheduleLfgExpire(post.id);
    }

    const details = await services.lfg.details(post.id);
    if (!details) {
        throw new Error(`LFG post ${post.id} vanished after it was created`);
    }
    const messageId = await needsPermission('Send Messages', () => services.discord.send(server.lfg_channel_id as string, lfgPostView(details, customIdsFor(interaction), true)));
    await services.lfg.setMessage(post.id, messageId);
    services.log.log(`${interaction.user.username} (${interaction.user.id}) started an LFG session for ${game.name} in server ${guild.name} (${guild.id}): `
        + `${invitees.length ? `${invitees.length} invited` : 'open invitation'}, ${vc ? `VC ${vc.id}` : 'no VC'}, post ${post.id}`);

    // As v1, the picker becomes the confirmation. v2 adds where the post and its voice channel are.
    const postLink = `https://discord.com/channels/${guild.id}/${server.lfg_channel_id}/${messageId}`;
    await interaction.editReply(successView(`## Successfully Submitted LFG.\n${vc ? `${postLink} · Jump in: <#${vc.id}>` : postLink}`));
}
