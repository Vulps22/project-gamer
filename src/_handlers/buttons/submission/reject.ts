import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { customIdsFor } from '../../../discord/customIds';
import { Handler } from '../../../types/Handler';
import { successView } from '../../../views/MessageView';
import { requireAdminServer, requireParam } from '../../shared/review';

/** submission_reject: rejects a submission. Saved only once the card shows the rejection. */
const reject: Handler<BotButtonInteraction> = {
    name: 'reject',
    async execute(interaction, services) {
        await interaction.deferUpdate();
        requireAdminServer(interaction, services);
        await services.reviewQueue.reject({
            submissionId: requireParam(interaction.params.get('s'), 'submission'),
            cardMessageId: interaction.messageId,
            reviewerDiscordId: interaction.user.id,
            ids: customIdsFor(interaction),
        });
        await interaction.ephemeralFollowUp(successView('Rejected.'));
    },
};

export default reject;
