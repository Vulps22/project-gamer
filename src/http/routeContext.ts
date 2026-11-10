import { Services } from '../services';

/**
 * Lives outside src/routes: pathfinder treats every file there as a route.
 * pathfinder loads route files itself, so routes can't take their services through a constructor.
 * The main process (the composition root for HTTP) hands them over here before the server starts.
 */
let current: Services | null = null;

export function provideRouteServices(services: Services): void {
    current = services;
}

export function routeServices(): Services {
    if (!current) {
        throw new Error('Route services used before provideRouteServices()');
    }
    return current;
}
