import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { BotButtonInteraction } from '@vulps22/bot-interactions';
import { customIdsFor } from '../../../discord/customIds';
import { Handler } from '../../../types/Handler';
import { ApproveModalFields, requireAdminServer, requireSubmission } from '../../shared/review';

/** submission_approve: opens the approval form. A modal can't follow a defer, so this one shows the modal first. */
const approve: Handler<BotButtonInteraction> = {
    name: 'approve',
    async execute(interaction, services) {
        requireAdminServer(interaction, services);
        const submission = await requireSubmission(services, interaction.params.get('s'));
        const storeName = await services.reviewQueue.storeName(submission.store_id);

        const storeInput = new TextInputBuilder()
            .setCustomId(ApproveModalFields.STORE)
            .setLabel('Store')
            .setPlaceholder('Store name (new stores are added automatically)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);
        if (storeName) {
            storeInput.setValue(storeName);
        }

        await interaction.showModal(new ModalBuilder()
            .setCustomId(customIdsFor(interaction)('submission', 'approveModal', { s: submission.id }))
            .setTitle('Approve game')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder().setCustomId(ApproveModalFields.TITLE).setLabel('Game title').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(200),
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(storeInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder().setCustomId(ApproveModalFields.COVER).setLabel('Cover image URL').setStyle(TextInputStyle.Short).setRequired(false),
                ),
            ));
    },
};

export default approve;
