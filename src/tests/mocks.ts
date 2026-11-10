import { Services } from '../services';

type MockedMethods<T> = { [K in keyof T]?: T[K] extends (...args: infer A) => infer R ? jest.Mock<R, A> : T[K] };
export type ServiceMocks = { [K in keyof Services]?: MockedMethods<Services[K]> };

/** Services for a test: only what the test sets up. Anything else is undefined, so stray calls fail loudly. */
export function mockServices(mocks: ServiceMocks): Services {
    return {
        log: { log: jest.fn(), error: jest.fn(), debug: jest.fn() },
        config: { adminServerId: 'admin-guild', newGamesChannelId: 'new-games', httpPort: 0 },
        ...mocks,
    } as unknown as Services;
}

/** Lets fire-and-forget work settle. */
export async function flushPromises(): Promise<void> {
    await new Promise(resolve => setImmediate(resolve));
}
