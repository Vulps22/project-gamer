import { customIdsForFlow } from '../discord/customIds';
import { describeError, UserFacingError } from '../errors';
import { Services } from '../services';
import { errorView, noticeView, successView } from '../views/MessageView';
import { ScrapeJob } from './types';

type ScrapeServices = Pick<Services, 'scrapers' | 'games' | 'library' | 'reviewQueue' | 'discord' | 'log'>;

/**
 * scrape.fetch: reads a new game from its store, adds it to the catalogue and the user's library,
 * and follows up on the user's "Adding your game…" reply. If the store page can't be read, the URL
 * goes to admin review instead.
 */
export class ScrapeProcessor {
    constructor(private readonly services: ScrapeServices) {}

    /** @param isLastAttempt on the final retry, a failure sends the URL to review rather than throwing. */
    async process(job: ScrapeJob, isLastAttempt: boolean): Promise<void> {
        const scraper = this.services.scrapers.get(job.scraper);
        let scraped;
        try {
            scraped = scraper ? await scraper.fetch(job.storeGameId) : null;
        } catch (error) {
            if (!isLastAttempt) {
                throw error;
            }
            this.services.log.error(`Scraping ${job.url} failed on the last attempt, so it goes to review\n${describeError(error)}`);
            scraped = null;
        }

        if (!scraped) {
            await this.sendToReview(job);
            return;
        }

        const game = await this.services.games.create({ ...scraped, storeId: job.storeId, storeGameId: job.storeGameId });
        const added = await this.services.library.add(job.userId, game.id, 'manual');
        this.services.log.log(`Scraped ${game.name} (${game.id}) from ${job.url}${added ? `, added to ${job.discordUserId}'s library` : `; ${job.discordUserId} already had it`}`);
        await this.followUp(job, added ? successView(`Added **${game.name}** to your library.`) : noticeView(`**${game.name}** is already in your library.`));
    }

    /** All or nothing, as from /library add. If it fails, the user is told to try again rather than the job retrying. */
    private async sendToReview(job: ScrapeJob): Promise<void> {
        try {
            await this.services.reviewQueue.submit({
                userId: job.userId,
                submitterDiscordId: job.discordUserId,
                url: job.url,
                storeId: job.storeId,
                ids: customIdsForFlow(job.flowId),
            });
        } catch (error) {
            if (!(error instanceof UserFacingError)) {
                throw error;
            }
            await this.followUp(job, errorView(error.message));
            return;
        }
        await this.followUp(job, noticeView('I couldn\'t read that page, so I\'ve sent it to our team to add. I\'ll DM you when it\'s approved.'));
    }

    /** The interaction token lasts 15 minutes. After that the user just won't see the update. */
    private async followUp(job: ScrapeJob, view: ReturnType<typeof successView>): Promise<void> {
        await this.services.discord.editInteractionReply(job.applicationId, job.interactionToken, view).catch((error: unknown) => {
            this.services.log.log(`Couldn't update ${job.discordUserId}'s reply about ${job.url} (the 15-minute window has probably passed): ${describeError(error).split('\n')[0]}`);
        });
    }
}
