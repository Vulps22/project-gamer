import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { Handler } from '../../../types/Handler';
import { startSession } from '../../lfg/startSession';

/** lfg_openInvite: starts the session as an open invitation, from the player picker. */
const openInvite: Handler<BotButtonInteraction> = {
    name: 'openInvite',
    async execute(interaction, services) {
        await interaction.deferUpdate();
        await startSession(interaction, services, interaction.params.get('g') ?? '', []);
    },
};

export default openInvite;
