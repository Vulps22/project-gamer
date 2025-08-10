--
-- Table structure for table `store`
--

DROP TABLE IF EXISTS `store`;

CREATE TABLE `store` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `scraper_key` varchar(50) NOT NULL,
  `base_hostname` varchar(255) NOT NULL,
  `is_scrapable` tinyint(1) NOT NULL DEFAULT '1',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_scraper_key` (`scraper_key`),
  UNIQUE KEY `uq_base_hostname` (`base_hostname`),
  KEY `idx_is_scrapable` (`is_scrapable`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Prepopulate the `store` table with initial data
--

INSERT INTO `store` (`id`, `name`, `scraper_key`, `base_hostname`, `is_scrapable`) VALUES
(1, 'Steam', 'Steam', 'store.steampowered.com', 1),
(2, 'GOG', 'GOG', 'gog.com', 1),
(3, 'Meta', 'Meta', 'meta.com', 1);


--
-- Add comments to table `store`
--

ALTER TABLE `store`
  COMMENT='Stores information and configuration for different digital game stores.',
  MODIFY COLUMN `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Internal unique identifier for the store record.',
  MODIFY COLUMN `name` varchar(255) NOT NULL COMMENT 'User-friendly display name of the store (e.g., Steam, GOG.com).',
  MODIFY COLUMN `scraper_key` varchar(50) NOT NULL COMMENT 'A unique key used to identify the scraper module in the application''s code.',
  MODIFY COLUMN `base_hostname` varchar(255) NOT NULL COMMENT 'The base hostname used for matching store URLs (e.g., store.steampowered.com).',
  MODIFY COLUMN `is_scrapable` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Boolean flag (0=false, 1=true) indicating if this store should be actively scraped for data.',
  MODIFY COLUMN `notes` text DEFAULT NULL COMMENT 'Internal developer notes about the store or its scraper (optional).',
  MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when the store record was created.',
  MODIFY COLUMN `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp when the store record was last updated.';