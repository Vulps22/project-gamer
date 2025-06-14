const { db } = require('./lib');

const ConfigOption = Object.freeze({
    CONFIG_ID: 'id',
    BASE_URL: 'base_url',
    DISCORD_BOT_CLIENT_ID: 'client_id',
    DISCORD_BOT_TOKEN: 'token',
    DISCORD_LOG_CHANNEL: 'discord_log_channel_id',
    DISCORD_ERROR_CHANNEL: 'discord_error_channel_id',
    DISCORD_SERVER_CHANNEL: 'discord_server_channel_id',
    DISCORD_SUPPORT_SERVER: 'discord_support_server_id',
    DISCORD_SUPPORT_SERVER_URL: 'discord_support_server_url',
    TOP_GG_TOKEN: 'top_gg_token',
    UPTIME_KUMA_URL: 'uptime_kuma_url',
    ENVIRONMENT: 'env',
});

class Config {
    constructor() {
        if (Config.instance) return Config.instance;

        this.settings = {};
        this.isInitialized = false;
        Config.instance = this;
    }

    /**
   * Loads configuration from the database based on NODE_ENV.
   * This MUST be called asynchronously at startup.
   */
    async init() {
        if (this.isInitialized) {
            console.warn('Config already initialized.');
            return;
        }

        const environment = process.env.ENVIRONMENT || 'dev';
        console.log(`Loading configuration for environment: ${environment}`);

        try {
            const sql = 'SELECT * FROM `configs` WHERE `env` = ? LIMIT 1';
            const [configRow] = await db.query(sql, [environment]);

            if (!configRow) throw new Error(`Configuration not found in database for environment: ${environment}`);

            // Store all fetched settings
            this.settings = configRow;
            this.isInitialized = true;
            console.log('Configuration loaded successfully from database.');

        } catch (error) {
            console.error('FATAL ERROR: Could not load configuration from database.', error);
            // In a real app, you MUST exit here, as the bot cannot run without config.
            process.exit(1);
        }
    }

    /**
   * Gets a configuration value by its key.
   * @param {ConfigOption} key - The configuration key (matches a column name in `configs`).
   * @param {any} [defaultValue=null] - A value to return if the key isn't found.
   * @returns {any} The configuration value.
   */
    get(key, defaultValue = null) {
        if (!this.isInitialized) {
            console.warn(`Attempted to get config key '${key}' before initialization. This might work for .env vars but not DB vars.`);
            // Optionally try process.env first for very early needs, but it's risky
            // return process.env[key.toUpperCase()] || defaultValue;
            // Better to throw or warn:
            throw new Error('Configuration accessed before initialization is complete.');
        }
        return Object.prototype.hasOwnProperty.call(this.settings, key) ? this.settings[key] : defaultValue;
    }

    /**
   * Gets all loaded settings.
   * @returns {object}
   */
    getAll() {
        if (!this.isInitialized) throw new Error('Configuration accessed before initialization is complete.');

        return { ...this.settings };
    }
}

// Export a single instance (Singleton Pattern)
const configInstance = new Config();
module.exports = { config: configInstance, ConfigOption };