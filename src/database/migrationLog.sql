--
-- Table structure for table `migration_log`
--

DROP TABLE IF EXISTS `migration_log`;

CREATE TABLE `migration_log` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration_name` varchar(100) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `migration_type` enum('rollout','rollback') NOT NULL DEFAULT 'rollout',
  `environment` varchar(50) NOT NULL,
  `result` enum('success','failed','in_progress') NOT NULL DEFAULT 'in_progress',
  `error_message` text DEFAULT NULL,
  `executed_by` varchar(100) DEFAULT NULL,
  `execution_time_ms` int unsigned DEFAULT NULL,
  `executed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_environment` (`environment`),
  KEY `idx_migration_name` (`migration_name`),
  KEY `idx_migration_env_result` (`migration_name`, `environment`, `result`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Add comments to table `migration_log`
--

ALTER TABLE `migration_log`
  COMMENT='Tracks the execution history of database migrations across different environments.',
  MODIFY COLUMN `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Primary key for the migration log entry.',
  MODIFY COLUMN `migration_name` varchar(100) NOT NULL COMMENT 'Branch number or migration identifier (e.g., "26").',
  MODIFY COLUMN `file_name` varchar(255) NOT NULL COMMENT 'Full filename of the migration script (e.g., "26_rollout.sql").',
  MODIFY COLUMN `migration_type` enum('rollout','rollback') NOT NULL DEFAULT 'rollout' COMMENT 'Type of migration: rollout (forward) or rollback (reverse).',
  MODIFY COLUMN `environment` varchar(50) NOT NULL COMMENT 'Environment where the migration was executed (dev, staging, production).',
  MODIFY COLUMN `result` enum('success','failed','in_progress') NOT NULL DEFAULT 'in_progress' COMMENT 'Execution result status.',
  MODIFY COLUMN `error_message` text DEFAULT NULL COMMENT 'Error details if the migration failed.',
  MODIFY COLUMN `executed_by` varchar(100) DEFAULT NULL COMMENT 'User or system that executed the migration.',
  MODIFY COLUMN `execution_time_ms` int unsigned DEFAULT NULL COMMENT 'Migration execution time in milliseconds.',
  MODIFY COLUMN `executed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when the migration was executed.';
