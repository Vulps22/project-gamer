import path from 'path';
import { REST, Routes, ShardingManager } from 'discord.js';
import { createServer } from '@vulps22/pathfinder';
import { Logger } from '@vulps22/logger';
import { environment, loadAppConfig, requireEnv } from './config';
import { commands } from './_handlers';

/** The main process: registers slash commands, runs the HTTP server, and spawns the shards. */
async function main(): Promise<void> {
    Logger.initialize();
    const config = loadAppConfig(environment);
    const token = requireEnv('DISCORD_TOKEN');

    await new REST().setToken(token).put(Routes.applicationCommands(requireEnv('CLIENT_ID')), { body: commands.map(command => command.data) });
    Logger.log(`Registered ${commands.length} slash commands`);

    await createServer({ port: config.httpPort, routesPath: path.join(__dirname, 'routes') });

    const manager = new ShardingManager(path.join(__dirname, 'bot.js'), { token, totalShards: 'auto' });
    manager.on('shardCreate', shard => Logger.debug(`Launched shard ${shard.id}`));
    await manager.spawn();
}

main().catch((error: unknown) => {
    console.error('Failed to start:', error instanceof Error ? error.message : error);
    process.exit(1);
});
