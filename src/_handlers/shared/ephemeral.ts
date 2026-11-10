import { MessageFlags } from 'discord.js';

/** deferReply options for a reply only the user sees. */
export const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;
