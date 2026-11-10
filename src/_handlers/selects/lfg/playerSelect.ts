import { BotSelectMenuInteraction } from '@vulps22/bot-interactions';
import { UserFacingError } from '../../../errors';
import { Handler } from '../../../types/Handler';
import { NO_PLAYERS } from '../../../views/lfgViews';
import { startSession } from '../../lfg/startSession';

/** lfg_playerSelect: starts the session with the players picked. */
const playerSelect: Handler<BotSelectMenuInteraction> = {
    name: 'playerSelect',
    async execute(interaction, services) {
        await interaction.deferUpdate();
        if (interaction.values.includes(NO_PLAYERS)) {
            throw new UserFacingError('Nobody here has shared this game yet. Open it up to **Anyone** instead.');
        }
        await startSession(interaction, services, interaction.params.get('g') ?? '', interaction.values);
    },
};

export default playerSelect;
