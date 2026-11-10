import { AutocompleteInteraction, Interaction } from 'discord.js';
import { BotButtonInteraction, BotComponentInteraction, BotRepliableInteraction, BotSelectMenuInteraction } from '@vulps22/bot-interactions';
import { PgCommandInteraction, PgModalInteraction } from '../discord/interactions';
import { describeError, errorCode, isInteractionTimeout, UserFacingError } from '../errors';
import { InteractionType, Outcome } from '../services/AnalyticsService';
import { Services } from '../services';
import { Handler } from '../types/Handler';
import { errorView } from '../views/MessageView';
import { HandlerRegistry } from './HandlerRegistry';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * Routes each interaction to its handler. Every handler runs through run(), which turns errors
 * into a reply and records one analytics event when it finishes. Nothing here awaits a log write.
 */
export class InteractionDispatcher {
    constructor(private readonly services: Services, private readonly registry: HandlerRegistry) {}

    /** Fire-and-forget, so one slow interaction never holds up the next. */
    dispatch(interaction: Interaction): void {
        void this.services.users.ensure(interaction.user.id).catch((error: unknown) => this.logError('Tracking user activity', error));

        if (interaction.isAutocomplete()) {
            void this.autocomplete(interaction);
        } else if (interaction.isChatInputCommand()) {
            const wrapped = new PgCommandInteraction(interaction);
            const name = [interaction.commandName, interaction.options.getSubcommand(false)].filter(Boolean).join(' ');
            void this.run('command', name, wrapped, this.registry.commands.get(interaction.commandName), interaction);
        } else if (interaction.isButton()) {
            const wrapped = new BotButtonInteraction(interaction);
            void this.run('button', wrapped.baseId, wrapped, this.registry.buttons.get(wrapped.baseId), interaction);
        } else if (interaction.isStringSelectMenu()) {
            const wrapped = new BotSelectMenuInteraction(interaction);
            void this.run('select', wrapped.baseId, wrapped, this.registry.selects.get(wrapped.baseId), interaction);
        } else if (interaction.isModalSubmit()) {
            const wrapped = new PgModalInteraction(interaction);
            void this.run('modal', wrapped.baseId, wrapped, this.registry.modals.get(wrapped.baseId), interaction);
        }
    }

    private async run<T extends BotRepliableInteraction>(type: InteractionType, name: string, interaction: T, handler: Handler<T> | undefined, raw: Interaction): Promise<void> {
        const started = Date.now();
        this.services.log.logInteractionReceived(raw, `${type} ${name}`);
        let outcome: Outcome = 'ok';
        let code: string | null = null;

        try {
            if (!handler) {
                throw new Error(`No ${type} handler for ${name}`);
            }
            await handler.execute(interaction, this.services);
        } catch (error) {
            outcome = isInteractionTimeout(error) ? 'timeout' : 'error';
            code = errorCode(error);
            if (error instanceof UserFacingError) {
                this.services.log.log(`${type} ${name} refused for ${who(interaction)}: ${error.message}`);
            } else {
                this.logError(`${type} ${name} failed for ${who(interaction)}`, error);
            }
            await respondWithError(interaction, error instanceof UserFacingError ? error.message : GENERIC_ERROR);
        } finally {
            this.services.analytics.record({
                interactionType: type,
                interactionName: name,
                userId: interaction.user.id,
                guildId: interaction.guildId,
                executionId: interaction.executionId,
                flowId: interaction.flowId,
                durationMs: Date.now() - started,
                outcome,
                errorCode: code,
                detail: null,
            });
        }
    }

    private async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const handler = this.registry.commands.get(interaction.commandName);
        try {
            const choices = handler?.autocomplete ? await handler.autocomplete(interaction, this.services) : [];
            await interaction.respond(choices);

            const search = interaction.options.getFocused().trim();
            if (choices.length === 0 && search.length > 0) {
                this.services.analytics.record({
                    interactionType: 'search',
                    interactionName: [interaction.commandName, interaction.options.getSubcommand(false)].filter(Boolean).join(' '),
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    executionId: interaction.id,
                    flowId: interaction.id,
                    durationMs: 0,
                    outcome: 'ok',
                    errorCode: null,
                    detail: search,
                });
            }
        } catch (error) {
            if (!isInteractionTimeout(error)) {
                this.logError(`autocomplete ${interaction.commandName} failed for ${who(interaction)}`, error);
            }
        }
    }

    private logError(context: string, error: unknown): void {
        this.services.log.error(`${context}\n${describeError(error)}`);
    }
}

/** Who an interaction came from and where, for the log. IDs, never mentions: a mention in the log would ping. */
function who(interaction: { user: { username: string; id: string }; guildId: string | null }): string {
    return `${interaction.user.username} (${interaction.user.id}) in ${interaction.guildId ? `server ${interaction.guildId}` : 'DMs'}`;
}

/** Tells the user something went wrong, however far the interaction got. Can never throw. */
async function respondWithError(interaction: BotRepliableInteraction, message: string): Promise<void> {
    const view = errorView(message);
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.ephemeralReply(view);
        } else if (interaction.deferred && !interaction.replied && !(interaction instanceof BotComponentInteraction)) {
            await interaction.editReply(view);
        } else {
            await interaction.ephemeralFollowUp(view);
        }
    } catch {
        // The interaction may have expired. There is no one left to tell.
    }
}
