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

/** The submitter's Discord ID, for the admin card and the approval DM. */
export async function submitterDiscordId(services: Services, submission: Submission): Promise<string> {
    const account = await services.users.getById(submission.submitted_by);
    if (!account) {
        throw new Error(`Submission ${submission.id} has no submitter`);
    }
    return account.discord_id;
}
