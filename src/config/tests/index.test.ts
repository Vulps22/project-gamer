describe('config', () => {
    it('reads the environment from ENVIRONMENT', async () => {
        const { environment } = await import('..');
        expect(environment).toBe('dev');
    });
});
