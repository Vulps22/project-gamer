import { VoiceState } from 'discord.js';
import { mockServices } from '../../tests/mocks';
import { onVoiceMove } from '../voiceEvents';

function setup(managed: string[]) {
    return mockServices({
        lfg: { findActiveByVc: jest.fn((id: string) => Promise.resolve(managed.includes(id) ? { id: 'post' } : null)) },
        jobs: { scheduleVcEmpty: jest.fn().mockResolvedValue(undefined), cancelVcEmpty: jest.fn().mockResolvedValue(undefined) },
    } as never);
}

const state = (channelId: string | null, remaining = 0): VoiceState => ({
    id: '111', guild: { id: '9001' }, member: { user: { username: 'tester' } }, channelId, channel: channelId ? { members: { size: remaining } } : null,
}) as unknown as VoiceState;

describe('onVoiceMove', () => {
    it('starts the close countdown when the last person leaves a session VC', async () => {
        const services = setup(['vc']);
        await onVoiceMove(state('vc', 0), state(null), services);
        expect(services.jobs.scheduleVcEmpty).toHaveBeenCalledWith('vc');
    });

    it('leaves the VC open while people remain', async () => {
        const services = setup(['vc']);
        await onVoiceMove(state('vc', 2), state(null), services);
        expect(services.jobs.scheduleVcEmpty).not.toHaveBeenCalled();
    });

    it('cancels the countdown when someone joins a session VC', async () => {
        const services = setup(['vc']);
        await onVoiceMove(state(null), state('vc', 1), services);
        expect(services.jobs.cancelVcEmpty).toHaveBeenCalledWith('vc');
    });

    it('ignores VCs that aren\'t sessions', async () => {
        const services = setup([]);
        await onVoiceMove(state('other', 0), state('another', 1), services);
        expect(services.jobs.scheduleVcEmpty).not.toHaveBeenCalled();
        expect(services.jobs.cancelVcEmpty).not.toHaveBeenCalled();
    });
});
