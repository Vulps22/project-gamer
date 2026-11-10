import { ComponentType } from 'discord.js';
import { gameView } from '../gameView';

const game = { id: 'g', name: 'ARC Raiders', cover_art: 'https://cdn.example/arc.jpg' };

describe('cover art', () => {
    it('shows full width under a separator, not as a thumbnail', () => {
        const container = gameView(game, []).components[0].toJSON();
        const types = container.components.map(component => component.type);
        expect(types).toEqual([ComponentType.TextDisplay, ComponentType.Separator, ComponentType.MediaGallery]);
        expect(JSON.stringify(container)).toContain('https://cdn.example/arc.jpg');
    });

    it('is left out when the game has none', () => {
        const container = gameView({ ...game, cover_art: null }, []).components[0].toJSON();
        expect(container.components.map(component => component.type)).toEqual([ComponentType.TextDisplay]);
    });
});
