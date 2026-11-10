import { parseEnvironment } from './environment';

export const environment = parseEnvironment(process.env.ENVIRONMENT);

export { ENVIRONMENTS, parseEnvironment } from './environment';
export type { Environment } from './environment';
export type { AppConfig } from './AppConfig';
export { loadAppConfig } from './loadAppConfig';
export { requireEnv } from './requireEnv';
export { Urls } from './urls';
