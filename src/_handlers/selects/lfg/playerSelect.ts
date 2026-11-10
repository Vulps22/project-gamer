import { BotSelectMenuInteraction } from '@vulps22/bot-interactions';
import { Handler } from '../../../types/Handler';
import { startSession } from '../../lfg/startSession';

/** lfg_playerSelect: starts the session with the players picked. */
const playerSelect: Handler<BotSelectMenuInteraction> = {
    name: 'playerSelect',
    async execute(interaction, services) {
        await interaction.deferUpdate();
        await startSession(interaction, services, interaction.params.get('g') ?? '', interaction.values);
    },
};

export default playerSelect;
