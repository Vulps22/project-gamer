import { errorView, successView, toRestBody } from '../MessageView';

describe('MessageView', () => {
    it('adapts bot-interactions views so they never ping', () => {
        expect(successView('Done').allowedMentions).toEqual({ parse: [] });
    });

    it('serialises to a REST body with no content', () => {
        const body = toRestBody(errorView('Nope'));
        expect(body).not.toHaveProperty('content');
        expect(JSON.stringify(body.components)).toContain('Nope');
        expect(body.allowed_mentions).toEqual({ parse: [] });
    });
});
