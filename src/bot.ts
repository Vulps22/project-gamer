import { Client, Events, GatewayIntentBits } from 'discord.js';
import { requireEnv } from './config';
import { createHandlerRegistry } from './_handlers';
import { registerGuildEvents } from './events/guildEvents';
import { InteractionDispatcher } from './events/InteractionDispatcher';
import { registerVoiceEvents } from './events/voiceEvents';
import { createRuntime } from './runtime';

/** One shard. Spawned by the ShardingManager in index.ts. */
const { services } = createRuntime();
const dispatcher = new InteractionDispatcher(services, createHandlerRegistry());

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    allowedMentions: { parse: [] },
});

client.once(Events.ClientReady, ready => {
    services.log.log(`Shard ${ready.shard?.ids.join(', ') ?? '0'} ready as ${ready.user.tag}`);
});
client.on(Events.InteractionCreate, interaction => dispatcher.dispatch(interaction));
registerGuildEvents(client, services);
registerVoiceEvents(client, services);

void client.login(requireEnv('DISCORD_TOKEN'));
