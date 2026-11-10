import { loadAppConfig } from '../loadAppConfig';
import { config as dev } from '../dev/Config';

describe('loadAppConfig', () => {
    const original = { ...dev };

    afterEach(() => {
        Object.assign(dev, original);
    });

    it('returns the environment\'s config when every ID is set', () => {
        Object.assign(dev, { adminServerId: '1', newGamesChannelId: '2' });
        expect(loadAppConfig('dev')).toBe(dev);
    });

    it('names the blank IDs', () => {
        Object.assign(dev, { adminServerId: '', newGamesChannelId: '', publicUrl: '' });
        expect(() => loadAppConfig('dev')).toThrow('src/config/dev/Config.ts is missing adminServerId, newGamesChannelId, publicUrl');
    });
});
