import { ApiRoute } from '@vulps22/pathfinder';

/** GET /api/v1/ping: health check. */
export const route: ApiRoute = {
    get: (_req, res) => {
        res.json({ ok: true });
        return Promise.resolve();
    },
};
