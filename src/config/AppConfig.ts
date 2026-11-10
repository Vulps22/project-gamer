/** Non-secret, per-environment settings. Secrets never go here: they live only in env files. */
export interface AppConfig {
    /** The admin/home server, where game submissions are reviewed. */
    adminServerId: string;
    /** The channel in the admin server that receives new game submissions. */
    newGamesChannelId: string;
    /** Port for the pathfinder HTTP server. */
    httpPort: number;
}
