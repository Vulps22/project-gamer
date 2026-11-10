import { helpView } from '../helpView';

describe('helpView (v1\'s /help)', () => {
    it('lists every command, the supported stores and the official server button', () => {
        const body = JSON.stringify(helpView([{ name: 'lfg', description: 'Find people to play with' }]).components[0].toJSON());
        expect(body).toContain('## LFGameSync Command List');
        expect(body).toContain('### How to use LFGameSync');
        expect(body).toContain('### Supported Stores');
        expect(body).toContain('> ### /lfg\\n> *Find people to play with*');
        expect(body).toContain('Join the Official Server');
        expect(body).toContain('https://discord.vulps.co.uk');
    });
});
