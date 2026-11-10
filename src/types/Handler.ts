import { ApplicationCommandOptionChoiceData, AutocompleteInteraction, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { PgCommandInteraction } from '../discord/interactions';
import { Services } from '../services';

/** Handles one command or component. Services are passed in, never imported. */
export interface Handler<T> {
    /** The command name, or the component's baseId. */
    name: string;
    execute(interaction: T, services: Services): Promise<void>;
}

export interface CommandHandler extends Handler<PgCommandInteraction> {
    data: RESTPostAPIChatInputApplicationCommandsJSONBody;
    /** Choices for the focused option. Zero choices is recorded as a search for something we don't have. */
    autocomplete?(interaction: AutocompleteInteraction, services: Services): Promise<ApplicationCommandOptionChoiceData<string>[]>;
}
