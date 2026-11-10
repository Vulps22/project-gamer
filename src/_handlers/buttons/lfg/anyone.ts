import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { Handler } from '../../../types/Handler';
import { startSession } from '../../lfg/startSession';

/** lfg_anyone: v1's "Anyone" button on the player picker. Starts the session as an open invitation. */
const anyone: Handler<BotButtonInteraction> = {
    name: 'anyone',
    async execute(interaction, services) {
        await interaction.deferUpdate();
        await startSession(interaction, services, interaction.params.get('g') ?? '', []);
    },
};

export default anyone;
