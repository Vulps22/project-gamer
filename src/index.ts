import path from 'path';
import { REST, Routes, ShardingManager } from 'discord.js';
import { createServer } from '@vulps22/pathfinder';
import { environment, loadAppConfig, requireEnv } from './config';
import { describeError } from './errors';
import { commands } from './_handlers';
import { createDiscordLog, reportProcessErrors } from './logging/discordLog';

const log = createDiscordLog();
reportProcessErrors(log, 'Main process');

/** The main process: registers slash commands, runs the HTTP server, and spawns the shards. */
async function main(): Promise<void> {
    const config = loadAppConfig(environment);
    const token = requireEnv('DISCORD_TOKEN');
    log.log(`Starting LFGameSync (${environment})`);

    await new REST().setToken(token).put(Routes.applicationCommands(requireEnv('CLIENT_ID')), { body: commands.map(command => command.data) });
    log.log(`Registered ${commands.length} slash commands: ${commands.map(command => `/${command.name}`).join(', ')}`);

    await createServer({ port: config.httpPort, routesPath: path.join(__dirname, 'routes') });
    log.log(`HTTP server listening on port ${config.httpPort}`);

    const manager = new ShardingManager(path.join(__dirname, 'bot.js'), { token, totalShards: 'auto' });
    manager.on('shardCreate', shard => {
        log.log(`Launched shard ${shard.id}`);
        shard.on('death', child => log.error(`Shard ${shard.id} died (exit code ${'exitCode' in child ? String(child.exitCode) : 'unknown'}). Respawning.`));
        shard.on('error', error => log.error(`Shard ${shard.id} error\n${describeError(error)}`));
        shard.on('disconnect', () => log.log(`Shard ${shard.id} disconnected from Discord`));
        shard.on('reconnecting', () => log.log(`Shard ${shard.id} reconnecting to Discord`));
    });
    await manager.spawn();
    log.log(`All ${manager.shards.size} shard(s) spawned`);
}

main().catch((error: unknown) => {
    log.error(`Main process failed to start\n${describeError(error)}`);
    // Give the error a moment to reach the channel.
    setTimeout(() => process.exit(1), 2000);
});
