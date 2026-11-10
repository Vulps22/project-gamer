import { BotInteraction, buildCustomId, CustomIdParams } from '@vulps22/bot-interactions';
import { InteractionKey, Interactions } from '../constants/interactions';

/** Builds the custom ID for one of the Interactions, tagged with a flow. */
export type CustomIdFactory = (key: InteractionKey, params?: CustomIdParams) => string;

/** Custom IDs that continue this interaction's flow. */
export function customIdsFor(interaction: BotInteraction): CustomIdFactory {
    return (key, params) => {
        const [prefix, action] = Interactions[key];
        return interaction.createCustomId(prefix, action, params);
    };
}

/** Custom IDs that continue a flow, for code with no interaction to hand (the worker). */
export function customIdsForFlow(flowId: string | null): CustomIdFactory {
    return (key, params) => {
        const [prefix, action] = Interactions[key];
        return buildCustomId(prefix, action, params, flowId);
    };
}
