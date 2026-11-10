import { requireEnv } from '../requireEnv';

describe('requireEnv', () => {
    afterEach(() => {
        delete process.env.PG_TEST_SECRET;
    });

    it('returns the value when it is set', () => {
        process.env.PG_TEST_SECRET = 'value';
        expect(requireEnv('PG_TEST_SECRET')).toBe('value');
    });

    it('names the variable but not the value when it is missing', () => {
        expect(() => requireEnv('PG_TEST_SECRET')).toThrow('Missing required environment variable PG_TEST_SECRET');
    });

    it('treats an empty value as missing', () => {
        process.env.PG_TEST_SECRET = '';
        expect(() => requireEnv('PG_TEST_SECRET')).toThrow('PG_TEST_SECRET');
    });
});
