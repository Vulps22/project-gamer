import { Client, Events, GatewayIntentBits } from 'discord.js';
import { requireEnv } from './config';
import { describeError } from './errors';
import { createHandlerRegistry } from './_handlers';
import { registerGuildEvents } from './events/guildEvents';
import { InteractionDispatcher } from './events/InteractionDispatcher';
import { registerVoiceEvents } from './events/voiceEvents';
import { reportProcessErrors } from './logging/discordLog';
import { createRuntime } from './runtime';

/** One shard. Spawned by the ShardingManager in index.ts. */
const { services } = createRuntime();
reportProcessErrors(services.log, 'Shard');
const dispatcher = new InteractionDispatcher(services, createHandlerRegistry());

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    allowedMentions: { parse: [] },
});

client.once(Events.ClientReady, ready => {
    services.log.log(`Shard ${ready.shard?.ids.join(', ') ?? '0'} ready as ${ready.user.tag}, in ${ready.guilds.cache.size} server(s)`);
});
client.on(Events.Error, error => services.log.error(`Discord client error\n${describeError(error)}`));
client.on(Events.Warn, message => services.log.log(`Discord client warning: ${message}`));
client.on(Events.ShardDisconnect, (event, shardId) => services.log.log(`Shard ${shardId} lost its connection (code ${event.code})`));
client.on(Events.ShardResume, (shardId, replayed) => services.log.log(`Shard ${shardId} resumed (${replayed} events replayed)`));
client.on(Events.InteractionCreate, interaction => dispatcher.dispatch(interaction));
registerGuildEvents(client, services);
registerVoiceEvents(client, services);

client.login(requireEnv('DISCORD_TOKEN')).catch((error: unknown) => {
    services.log.error(`Shard failed to log in\n${describeError(error)}`);
    setTimeout(() => process.exit(1), 2000);
});
