/**
 * Every component custom ID, as [prefix, action] pairs. Build IDs with
 * interaction.createCustomId(...Interactions.X, params); never by hand.
 * Handlers are registered by baseId: `${prefix}_${action}`.
 */
export const Interactions = {
    LFG_PLAYER_SELECT: ['lfg', 'playerSelect'],
    LFG_OPEN_INVITE: ['lfg', 'openInvite'],
    LFG_INTERESTED: ['lfg', 'interested'],
    LFG_NOT_INTERESTED: ['lfg', 'notInterested'],
    LIBRARY_POST_GAME: ['library', 'postGame'],
    LIBRARY_HAVE_GAME: ['library', 'haveGame'],
    SUBMISSION_APPROVE: ['submission', 'approve'],
    SUBMISSION_REJECT: ['submission', 'reject'],
    SUBMISSION_APPROVE_MODAL: ['submission', 'approveModal'],
} as const satisfies Record<string, readonly [string, string]>;

export type InteractionKey = keyof typeof Interactions;

/** The baseId a handler is registered under. */
export function baseId(key: InteractionKey): string {
    const [prefix, action] = Interactions[key];
    return `${prefix}_${action}`;
}
