import { parseEnvironment } from './environment';

export const environment = parseEnvironment(process.env.ENVIRONMENT);

export { ENVIRONMENTS, parseEnvironment } from './environment';
export type { Environment } from './environment';
export { requireEnv } from './requireEnv';
export { Urls } from './urls';
