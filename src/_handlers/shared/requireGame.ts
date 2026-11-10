import { UserFacingError } from '../../errors';
import { Services } from '../../services';
import { Game } from '../../types/models';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The game an autocomplete option picked. Typing a name without picking from the list is a user error. */
export async function requireGame(services: Services, value: string): Promise<Game> {
    const game = UUID.test(value) ? await services.games.getById(value) : null;
    if (!game) {
        throw new UserFacingError('Pick a game from the list as you type.');
    }
    return game;
}
