/** What services need from a logger. @vulps22/logger's Logger satisfies it. */
export interface Log {
    log(message: string): void;
    error(message: string): void;
    debug(message: string): void;
}
