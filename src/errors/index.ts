/** An expected failure whose message is safe, and meant, to show the user. */
export class UserFacingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UserFacingError';
    }
}

/** Thrown when an interaction arrives outside a guild. */
export class DMInteractionError extends UserFacingError {
    constructor() {
        super('LFGameSync only works inside a server. Use me there!');
        this.name = 'DMInteractionError';
    }
}

/** A short, stable code for an error, for analytics. Never includes the message. */
export function errorCode(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error && (typeof error.code === 'number' || typeof error.code === 'string')) {
        return String(error.code);
    }
    return error instanceof Error ? error.name : 'unknown';
}

/** Discord's "Unknown interaction": the 3s window to respond was missed. */
export function isInteractionTimeout(error: unknown): boolean {
    return errorCode(error) === '10062';
}
