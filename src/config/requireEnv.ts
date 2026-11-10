/**
 * Reads a secret from the environment. Secrets live only in env files, so a missing one
 * is a setup error: fail at startup, naming the variable but never printing a value.
 */
export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable ${name}`);
    }
    return value;
}
