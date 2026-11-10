import { Client, Events, VoiceState } from 'discord.js';
import { describeError } from '../errors';
import { Services } from '../services';

/**
 * Event-driven VC lifecycle: when the last person leaves a session's VC, the worker is told to
 * close it in 10 minutes. Anyone joining before then cancels that.
 */
export function registerVoiceEvents(client: Client, services: Services): void {
    client.on(Events.VoiceStateUpdate, (before, after) => {
        if (before.channelId === after.channelId) {
            return;
        }
        void onVoiceMove(before, after, services).catch((error: unknown) => {
            services.log.error(`Voice state update for ${after.member?.user.username ?? 'unknown'} (${after.id}) in server ${after.guild.id}\n${describeError(error)}`);
        });
    });
}

export async function onVoiceMove(before: VoiceState, after: VoiceState, services: Services): Promise<void> {
    if (after.channelId && await services.lfg.findActiveByVc(after.channelId)) {
        await services.jobs.cancelVcEmpty(after.channelId);
        services.log.log(`${after.member?.user.username ?? after.id} joined LFG VC ${after.channelId} in server ${after.guild.id}`);
    }
    if (before.channelId && before.channel?.members.size === 0 && await services.lfg.findActiveByVc(before.channelId)) {
        await services.jobs.scheduleVcEmpty(before.channelId);
        services.log.log(`LFG VC ${before.channelId} in server ${before.guild.id} is empty; it closes in 10 minutes unless someone joins`);
    }
}
