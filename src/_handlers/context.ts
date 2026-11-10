import { BotInteraction } from '@vulps22/bot-interactions';
import { DMInteractionError } from '../errors';
import { Services } from '../services';
import { Account, Server } from '../types/models';

export interface GuildContext {
    account: Account;
    server: Server;
    guildId: string;
}

/** The user's account and the server's config, creating either on first sight, and recording the membership. */
export async function guildContext(interaction: BotInteraction, services: Services): Promise<GuildContext> {
    const guildId = interaction.guildId;
    if (!guildId) {
        throw new DMInteractionError();
    }
    const [account, server] = await Promise.all([services.users.ensure(interaction.user.id), services.servers.ensure(guildId)]);
    await services.servers.ensureMember(server.id, account.id);
    return { account, server, guildId };
}
