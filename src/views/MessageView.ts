import { ContainerBuilder, MessageFlags } from 'discord.js';
import * as BotViews from '@vulps22/bot-interactions';

/**
 * A Components V2 message. It never carries `content`. Mentions only ping when
 * listed in `allowedMentions`, so nothing pings by accident.
 */
export interface MessageView {
    flags: MessageFlags.IsComponentsV2;
    components: ContainerBuilder[];
    allowedMentions: { users?: string[]; roles?: string[]; parse: [] };
}

export function view(container: ContainerBuilder, ping: { users?: string[]; roles?: string[] } = {}): MessageView {
    return { flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { ...ping, parse: [] } };
}

/** The same view, as a raw REST body. */
export function toRestBody(message: MessageView): Record<string, unknown> {
    return {
        flags: message.flags,
        components: message.components.map(component => component.toJSON()),
        allowed_mentions: message.allowedMentions,
    };
}

/**
 * bot-interactions' notice / success / error views, typed as MessageView so they work over REST too.
 * They build exactly one container with the IsComponentsV2 flag; only the allowed mentions are added here.
 */
function adapt(build: (message: string) => unknown): (message: string) => MessageView {
    return message => ({ ...(build(message) as Omit<MessageView, 'allowedMentions'>), allowedMentions: { parse: [] } });
}

export const noticeView = adapt(BotViews.noticeView);
export const successView = adapt(BotViews.successView);
export const errorView = adapt(BotViews.errorView);
