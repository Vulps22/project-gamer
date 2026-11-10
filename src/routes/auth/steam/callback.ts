import { ApiRoute } from '@vulps22/pathfinder';
import { Request, Response } from 'express';
import { describeError } from '../../../errors';
import { steamCallbackUrl } from '../../../steam/SteamApi';
import { steamSyncStartedView } from '../../../views/steamViews';
import { steamCallbackPage } from '../../../views/steamCallbackPage';
import { routeServices } from '../../../http/routeContext';


/**
 * GET /auth/steam/callback: Steam sends the user here after login. Uses up the state token, has Steam
 * confirm the login, links the account and queues the first sync. The user sees a page saying how it went.
 */
export const route: ApiRoute = {
    get: async (req: Request, res: Response) => {
        const services = routeServices();
        const query = flatQuery(req.query);
        const state = query.state ?? '';

        const send = (status: number, ok: boolean, message: string): void => {
            res.status(status).type('html').send(steamCallbackPage({ ok, message }));
        };

        try {
            const session = await services.steamLogins.consume(state);
            if (!session) {
                send(400, false, 'Your linking session was invalid or expired. Please initiate the linking process again from Discord.');
                return;
            }
            const steamId = await services.steamApi.verifyLogin(query, steamCallbackUrl(services.config.publicUrl, state));
            if (!steamId) {
                services.log.log(`Steam login for ${session.discordUserId} failed verification`);
                send(400, false, 'Steam couldn\'t confirm that sign-in. Please try linking your Steam account again from Discord.');
                return;
            }

            const account = await services.users.ensure(session.discordUserId);
            await services.steam.link(account.id, steamId);
            services.log.log(`${session.discordUserId} linked Steam account ${steamId}`);

            await services.discord.editInteractionReply(session.applicationId, session.interactionToken, steamSyncStartedView())
                .catch(() => undefined); // The reply may be gone; the sync's own follow-up will try again.
            await services.jobs.enqueueSteamSync({
                userId: account.id,
                discordUserId: session.discordUserId,
                reason: 'linked',
                followUp: { applicationId: session.applicationId, interactionToken: session.interactionToken },
            });
            send(200, true, 'Your Steam account has been successfully linked to your Discord profile. Your games are being synchronized now; you may return to Discord.');
        } catch (error) {
            services.log.error(`Steam login callback failed\n${describeError(error)}`);
            send(500, false, 'An internal error occurred during authentication. Please try again later.');
        }
    },
};

/** Query parameters as plain strings. A repeated parameter is ignored rather than trusted. */
function flatQuery(query: Request['query']): Record<string, string> {
    const flat: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
        if (typeof value === 'string') {
            flat[key] = value;
        }
    }
    return flat;
}
