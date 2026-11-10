import { BotSelectMenuInteraction } from '@vulps22/bot-interactions';
import { baseId } from '../../constants/interactions';
import { Handler } from '../../types/Handler';
import { startSession } from '../lfg/startSession';

export const lfgPlayerSelect: Handler<BotSelectMenuInteraction> = {
    name: baseId('LFG_PLAYER_SELECT'),
    async execute(interaction, services) {
        await interaction.deferUpdate();
        await startSession(interaction, services, interaction.params.get('g') ?? '', interaction.values);
    },
};
