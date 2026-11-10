import { AppConfig } from '../AppConfig';

export const config: AppConfig = {
    adminServerId: '1092491402111357051',
    newGamesChannelId: '1569671245752967168',
    httpPort: 3000,
    // Three, not two: it's the smallest count that puts the two dev servers on different shards
    // (Official Server on 0, Development Server Manager on 2), so cross-shard behaviour gets exercised.
    totalShards: 3,
};
