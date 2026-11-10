import { baseId } from '../../constants/interactions';
import { PgModalInteraction } from '../../discord/interactions';
import { UserFacingError } from '../../errors';
import { Handler } from '../../types/Handler';
import { approvedDmView, submissionView } from '../../views/submissionViews';
import { successView } from '../../views/MessageView';
import { ModalFields } from '../buttons/submissionButtons';
import { requireAdminServer, requireSubmission, submitterDiscordId } from '../shared/review';

/** Approves a submission: adds the game, puts it in the submitter's library, updates the admin card and DMs them. */
export const submissionApproveModal: Handler<PgModalInteraction> = {
    name: baseId('SUBMISSION_APPROVE_MODAL'),
    async execute(interaction, services) {
        await interaction.deferReply({ ephemeral: true });
        requireAdminServer(interaction, services);
        const pending = await requireSubmission(services, interaction.params.get('s'));

        const name = interaction.fields.getTextInputValue(ModalFields.TITLE).trim();
        const slug = interaction.fields.getTextInputValue(ModalFields.STORE).trim().toLowerCase();
        const coverArt = optionalUrl(interaction.fields.getTextInputValue(ModalFields.COVER));

        const store = await services.games.storeBySlug(slug);
        if (!store) {
            const slugs = (await services.games.stores()).map(s => s.slug).join(', ');
            throw new UserFacingError(`"${slug}" isn't a store I know. Use one of: ${slugs}`);
        }
        const url = new URL(pending.url);
        const storeGameId = services.scrapers.get(store.scraper)?.parseId(url) ?? url.href;

        const { submission, game } = await services.submissions.approve(pending.id, { name, coverArt, storeId: store.id, storeGameId });
        const submitter = await submitterDiscordId(services, submission);

        if (interaction.sourceMessageId && interaction.channel) {
            await services.discord.edit(interaction.channel.id, interaction.sourceMessageId, submissionView(
                submission, submitter, store.name, { status: 'approved', reviewerDiscordId: interaction.user.id, gameName: game.name },
            ));
        }

        const delivered = await services.discord.dm(submitter, approvedDmView(game.name));
        await interaction.editReply(successView(`Approved **${game.name}**.${delivered ? '' : ' The submitter has DMs closed, so they weren\'t told.'}`));
    },
};

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
