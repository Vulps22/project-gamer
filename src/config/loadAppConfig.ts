import { AppConfig } from './AppConfig';
import { Environment } from './environment';
import { config as dev } from './dev/Config';
import { config as stage } from './stage/Config';
import { config as prod } from './prod/Config';

const CONFIGS: Record<Environment, AppConfig> = { dev, stage, prod };

/** The settings for an environment. Fails at startup if any required ID was left blank. */
export function loadAppConfig(environment: Environment): AppConfig {
    const config = CONFIGS[environment];
    const missing = (['adminServerId', 'newGamesChannelId', 'publicUrl'] as const).filter(key => !config[key]);
    if (missing.length > 0) {
        throw new Error(`src/config/${environment}/Config.ts is missing ${missing.join(', ')}`);
    }
    return config;
}
