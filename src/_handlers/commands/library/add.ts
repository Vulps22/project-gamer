import { PgCommandInteraction } from '../../../discord/interactions';
import { customIdsFor } from '../../../discord/customIds';
import { UserFacingError } from '../../../errors';
import { Services } from '../../../services';
import { noticeView, successView } from '../../../views/MessageView';
import { guildContext } from '../../context';

/**
 * Adds a game from its store URL. A known game is added at once. A new game on a store we can
 * scrape is handed to the worker, which follows up on this reply. Anything else goes to admin review.
 */
export async function libraryAdd(interaction: PgCommandInteraction, services: Services): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const { account } = await guildContext(interaction, services);
    const url = parseUrl(interaction.options.getString('url', true));

    const store = await services.games.storeForUrl(url);
    const scraper = services.scrapers.get(store?.scraper ?? null);

    if (store && scraper) {
        const storeGameId = scraper.parseId(url);
        if (!storeGameId) {
            throw new UserFacingError(`That doesn't look like a game's page on ${store.name}. Copy the link from the game's store page.`);
        }

        const known = await services.games.findByStoreEntry(store.id, storeGameId);
        if (known) {
            const added = await services.library.add(account.id, known.id, 'manual');
            await interaction.editReply(added ? successView(`Added **${known.name}** to your library.`) : noticeView(`**${known.name}** is already in your library.`));
            return;
        }

        await services.jobs.enqueueScrape({
            url: url.href,
            storeId: store.id,
            storeGameId,
            scraper: store.scraper as string,
            userId: account.id,
            discordUserId: interaction.user.id,
            applicationId: interaction.applicationId,
            interactionToken: interaction.token,
            flowId: interaction.flowId,
        });
        await interaction.editReply(noticeView('Adding your game…'));
        return;
    }

    const submission = await services.submissions.create(account.id, url.href, store?.id ?? null);
    await services.submissionNotifier.notify(submission, interaction.user.id, customIdsFor(interaction));
    await interaction.editReply(noticeView('I can\'t read that store automatically, so I\'ve sent it to our team to add. I\'ll DM you when it\'s approved.'));
}

function parseUrl(value: string): URL {
    try {
        const url = new URL(value.trim());
        if (url.protocol === 'https:' || url.protocol === 'http:') {
            return url;
        }
    } catch {
        // Falls through to the error below.
    }
    throw new UserFacingError('That isn\'t a link. Paste the game\'s store page URL, starting with https://');
}
