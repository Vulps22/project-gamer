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
  MODIFY COLUMN `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Primary key for the configs table, auto-incremented',
  MODIFY COLUMN `base_url` varchar(255) NOT NULL COMMENT 'Base URL for the LFG game sync service',
  MODIFY COLUMN `client_id` varchar(50) NOT NULL COMMENT 'Client ID for the LFGameSync Bot',
  MODIFY COLUMN `token` varchar(255) NOT NULL COMMENT 'Token for the LFGameSync Bot',
  MODIFY COLUMN `discord_log_channel_id` varchar(50) NOT NULL COMMENT 'Discord channel ID for logging messages',
  MODIFY COLUMN `discord_error_channel_id` varchar(50) NOT NULL COMMENT 'Discord channel ID for error messages',
  MODIFY COLUMN `discord_server_channel_id` varchar(50) NOT NULL COMMENT 'Discord channel ID for server messages',
  MODIFY COLUMN `discord_support_server_id` varchar(50) NOT NULL COMMENT 'Discord server ID for support server',
  MODIFY COLUMN `discord_support_server_url` varchar(255) NOT NULL DEFAULT 'https://discord.gg/PxjD25Cc85' COMMENT 'Invite URL for the Discord support server',
  MODIFY COLUMN `top_gg_token` varchar(255) DEFAULT NULL COMMENT 'Token for Top.gg integration',
  MODIFY COLUMN `uptime_kuma_url` varchar(255) DEFAULT NULL COMMENT 'URL for Uptime Kuma monitoring',
  MODIFY COLUMN `steam_api_token` varchar(255) DEFAULT NULL COMMENT 'Steam Web API token for accessing Steam user data and libraries',
  MODIFY COLUMN `env` varchar(50) NOT NULL COMMENT 'Environment for the configuration (e.g., production, development)',
  MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when the configuration was created',
  MODIFY COLUMN `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp when the configuration was last updated';