--
-- Table structure for table `configs`
--

DROP TABLE IF EXISTS `configs`;

CREATE TABLE `configs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `base_url` varchar(255) NOT NULL,
  `client_id` varchar(50) NOT NULL,
  `token` varchar(255) NOT NULL,
  `discord_log_channel_id` varchar(50) NOT NULL,
  `discord_error_channel_id` varchar(50) NOT NULL,
  `discord_server_channel_id` varchar(50) NOT NULL,
  `discord_support_server_id` varchar(50) NOT NULL,
  `discord_support_server_url` varchar(255) NOT NULL DEFAULT 'https://discord.gg/PxjD25Cc85',
  `top_gg_token` varchar(255) DEFAULT NULL,
  `uptime_kuma_url` varchar(255) DEFAULT NULL,
  `steam_api_token` varchar(255) DEFAULT NULL,
  `env` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `configs_env_unique` (`env`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Comments for the `configs` table and its columns

ALTER TABLE `configs`
  ALTER COLUMN `id` SET COMMENT 'Primary key for the configs table, auto-incremented',
  ALTER COLUMN `base_url` SET COMMENT 'Base URL for the LFG game sync service',
  ALTER COLUMN `client_id` SET COMMENT 'Client ID for the LFGameSync Bot',
  ALTER COLUMN `token` SET COMMENT 'Token for the LFGameSync Bot',
  ALTER COLUMN `discord_log_channel_id` SET COMMENT 'Discord channel ID for logging messages',
  ALTER COLUMN `discord_error_channel_id` SET COMMENT 'Discord channel ID for error messages',
  ALTER COLUMN `discord_server_channel_id` SET COMMENT 'Discord channel ID for server messages',
  ALTER COLUMN `discord_support_server_id` SET COMMENT 'Discord server ID for support server',
  ALTER COLUMN `discord_support_server_url` SET COMMENT 'Invite URL for the Discord support server',
  ALTER COLUMN `top_gg_token` SET COMMENT 'Token for Top.gg integration',
  ALTER COLUMN `uptime_kuma_url` SET COMMENT 'URL for Uptime Kuma monitoring',
  ALTER COLUMN `steam_api_token` SET COMMENT 'Steam Web API token for accessing Steam user data and libraries',
  ALTER COLUMN `env` SET COMMENT 'Environment for the configuration (e.g., production, development)',
  ALTER COLUMN `created_at` SET COMMENT 'Timestamp when the configuration was created',
  ALTER COLUMN `updated_at` SET COMMENT 'Timestamp when the configuration was last updated';