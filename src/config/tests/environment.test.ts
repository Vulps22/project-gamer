import { parseEnvironment } from '../environment';

describe('parseEnvironment', () => {
    it.each(['dev', 'stage', 'prod'])('accepts %s', value => {
        expect(parseEnvironment(value)).toBe(value);
    });

    it('rejects production, which is not one of the environments', () => {
        expect(() => parseEnvironment('production')).toThrow('got production');
    });

    it('rejects a missing value', () => {
        expect(() => parseEnvironment(undefined)).toThrow('got nothing');
    });
});
