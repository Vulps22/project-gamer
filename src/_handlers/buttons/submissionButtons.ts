import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { baseId } from '../../constants/interactions';
import { customIdsFor } from '../../discord/customIds';
import { Handler } from '../../types/Handler';
import { successView } from '../../views/MessageView';
import { submissionView } from '../../views/submissionViews';
import { requireAdminServer, requireSubmission, submitterDiscordId } from '../shared/review';

export const ModalFields = {
    TITLE: 'title',
    STORE: 'store',
    COVER: 'cover',
} as const;

/** Opens the approval form. A modal can't follow a defer, so this one shows the modal first. */
export const submissionApprove: Handler<BotButtonInteraction> = {
    name: baseId('SUBMISSION_APPROVE'),
    async execute(interaction, services) {
        requireAdminServer(interaction, services);
        const submission = await requireSubmission(services, interaction.params.get('s'));
        const stores = await services.games.stores();
        const store = stores.find(s => s.id === submission.store_id);

        const storeInput = new TextInputBuilder()
            .setCustomId(ModalFields.STORE)
            .setLabel('Store')
            .setPlaceholder(stores.map(s => s.slug).join(', '))
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        if (store) {
            storeInput.setValue(store.slug);
        }

        const ids = customIdsFor(interaction);
        await interaction.showModal(new ModalBuilder()
            .setCustomId(ids('SUBMISSION_APPROVE_MODAL', { s: submission.id }))
            .setTitle('Approve game')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder().setCustomId(ModalFields.TITLE).setLabel('Game title').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(200),
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(storeInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder().setCustomId(ModalFields.COVER).setLabel('Cover image URL').setStyle(TextInputStyle.Short).setRequired(false),
                ),
            ));
    },
};

export const submissionReject: Handler<BotButtonInteraction> = {
    name: baseId('SUBMISSION_REJECT'),
    async execute(interaction, services) {
        await interaction.deferUpdate();
        requireAdminServer(interaction, services);
        const pending = await requireSubmission(services, interaction.params.get('s'));
        const submission = await services.submissions.reject(pending.id);

        const storeName = await services.submissionNotifier.storeName(submission.store_id);
        const submitter = await submitterDiscordId(services, submission);
        await interaction.editReply(submissionView(submission, submitter, storeName, { status: 'rejected', reviewerDiscordId: interaction.user.id }));
        await interaction.ephemeralFollowUp(successView('Rejected.'));
    },
};
