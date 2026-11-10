import { BotInteraction } from '@vulps22/bot-interactions';
import { UserFacingError } from '../../errors';
import { Services } from '../../services';
import { Submission } from '../../types/models';

/** Submissions are reviewed only in the admin server. */
export function requireAdminServer(interaction: BotInteraction, services: Services): void {
    if (interaction.guildId !== services.config.adminServerId) {
        throw new UserFacingError('Submissions can only be reviewed in the admin server.');
    }
}

export async function requireSubmission(services: Services, id: string | undefined): Promise<Submission> {
    const submission = id ? await services.submissions.getById(id) : null;
    if (!submission) {
        throw new UserFacingError('That submission no longer exists.');
    }
    if (submission.status !== 'pending') {
        throw new UserFacingError('That submission has already been reviewed.');
    }
    return submission;
}

export function requireParam(value: string | undefined, what: string): string {
    if (!value) {
        throw new Error(`Review interaction arrived without its ${what}`);
    }
    return value;
}

/** The approval form's fields: built by submission_approve, read by submission_approveModal. */
export const ApproveModalFields = {
    TITLE: 'title',
    STORE: 'store',
    COVER: 'cover',
} as const;
