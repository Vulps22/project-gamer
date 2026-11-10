import { BotInteraction, buildCustomId, CustomIdParams } from '@vulps22/bot-interactions';

/**
 * Builds a component's custom ID: `prefix_action` plus params, tagged with a flow. `prefix` and `action` are
 * the handler's folder and name, as in PE: _handlers/buttons/lfg/interested.ts answers ids('lfg', 'interested').
 */
export type CustomIdFactory = (prefix: string, action: string, params?: CustomIdParams) => string;

/** Custom IDs that continue this interaction's flow. */
export function customIdsFor(interaction: BotInteraction): CustomIdFactory {
    return (prefix, action, params) => interaction.createCustomId(prefix, action, params);
}

/** Custom IDs that continue a flow, for code with no interaction to hand (the worker). */
export function customIdsForFlow(flowId: string | null): CustomIdFactory {
    return (prefix, action, params) => buildCustomId(prefix, action, params, flowId);
}
