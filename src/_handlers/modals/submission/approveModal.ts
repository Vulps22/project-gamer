import { customIdsFor } from '../../../discord/customIds';
import { PgModalInteraction } from '../../../discord/interactions';
import { describeError, UserFacingError } from '../../../errors';
import { Handler } from '../../../types/Handler';
import { approvedDmView } from '../../../views/submissionViews';
import { successView } from '../../../views/MessageView';
import { ApproveModalFields, requireAdminServer, requireParam } from '../../shared/review';
import { EPHEMERAL } from '../../shared/ephemeral';

/**
 * submission_approveModal. Approves a submission: adds the game (and its store, if new), puts it in the submitter's library and
 * updates the admin card, all in one transaction. Then DMs the submitter.
 */
const approveModal: Handler<PgModalInteraction> = {
    name: 'approveModal',
    async execute(interaction, services) {
        await interaction.deferReply(EPHEMERAL);
        requireAdminServer(interaction, services);

        const storeName = interaction.fields.getTextInputValue(ApproveModalFields.STORE).trim();
        if (!storeName) {
            throw new UserFacingError('Give the store a name.');
        }
        const { game, store, storeCreated, submitterDiscordId } = await services.reviewQueue.approve({
            submissionId: requireParam(interaction.params.get('s'), 'submission'),
            cardMessageId: requireParam(interaction.sourceMessageId ?? undefined, 'card message'),
            reviewerDiscordId: interaction.user.id,
            gameName: interaction.fields.getTextInputValue(ApproveModalFields.TITLE).trim(),
            storeName,
            coverArt: optionalUrl(interaction.fields.getTextInputValue(ApproveModalFields.COVER)),
            ids: customIdsFor(interaction),
        });

        // The approval is saved. A DM that fails doesn't undo it; the reviewer is told instead.
        const delivered = await services.discord.dm(submitterDiscordId, approvedDmView(game.name)).catch((error: unknown) => {
            services.log.error(`Couldn't DM ${submitterDiscordId} that ${game.name} was approved\n${describeError(error)}`);
            return false;
        });
        if (!delivered) {
            services.log.log(`${submitterDiscordId} wasn't told ${game.name} was approved (DMs closed or failed)`);
        }

        const newStore = storeCreated ? ` **${store.name}** is a new store, so links from ${store.base_url ?? 'its site'} will be recognised from now on.` : '';
        await interaction.editReply(successView(
            `Approved **${game.name}** on ${store.name}.${newStore}${delivered ? '' : ' The submitter couldn\'t be DMed, so they weren\'t told.'}`,
        ));
    },
};

export default approveModal;

function optionalUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    try {
        const url = new URL(trimmed);
        if (url.protocol === 'https:' || url.protocol === 'http:') {
            return url.href;
        }
    } catch {
        // Falls through to the error below.
    }
    throw new UserFacingError('The cover image must be a full URL, starting with https://');
}
