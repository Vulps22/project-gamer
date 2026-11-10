import { ComponentType } from 'discord.js';
import { gameView } from '../gameView';

const game = { id: 'g', name: 'ARC Raiders', cover_art: 'https://cdn.example/arc.jpg' };
const links = [{ store_name: 'Steam', url: 'https://store.steampowered.com/app/1808500' }];
const owners = { community: 3, global: 41 };

describe('gameView (v1\'s game card)', () => {
    it('shows the title, the cover, the stores, the owner counts and the buttons, in v1\'s order', () => {
        const container = gameView(game, links, owners, { removeId: 'remove', shareId: 'share' }).components[0].toJSON();
        expect(container.components.map(component => component.type)).toEqual([
            ComponentType.TextDisplay, ComponentType.MediaGallery, ComponentType.Separator,
            ComponentType.TextDisplay, ComponentType.TextDisplay, ComponentType.Separator, ComponentType.ActionRow,
        ]);
        const body = JSON.stringify(container);
        expect(body).toContain('### Stores\\n- [Steam](https://store.steampowered.com/app/1808500)');
        expect(body).toContain('**3** members of this community own this game.');
        expect(body).toContain('**41** members globally own this game.');
        expect(body).toContain('Remove from Library');
        expect(body).toContain('Share with Channel');
    });

    it('has Add to Library and Remove from Library when shared in the channel', () => {
        const body = JSON.stringify(gameView(game, links, owners, { addId: 'add', removeId: 'remove' }).components[0].toJSON());
        expect(body).toContain('Add to Library');
        expect(body).toContain('Remove from Library');
        expect(body).not.toContain('Share with Channel');
    });

    it('leaves the cover out when the game has none', () => {
        const container = gameView({ ...game, cover_art: null }, links, owners, {}).components[0].toJSON();
        expect(container.components.map(component => component.type)).not.toContain(ComponentType.MediaGallery);
    });
});
