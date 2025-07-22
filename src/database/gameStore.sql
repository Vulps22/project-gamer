--
-- Table structure for table `gameStore`
--

DROP TABLE IF EXISTS `gameStore`;

CREATE TABLE `gameStore` (
  `id` int NOT NULL AUTO_INCREMENT,
  `storeId` int unsigned NOT NULL,
  `gameId` int NOT NULL,
  `storeGameId` varchar(45) NOT NULL,
  `url` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('approved','pending','rejected') DEFAULT 'pending',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_url_prefix` (`url`(255)),
  UNIQUE KEY `uniqueGameOnStore` (`storeId`,`storeGameId`),
  KEY `fk_gameStore_store_idx` (`storeId`),
  KEY `fk_gamestore_game` (`gameId`),
  CONSTRAINT `fk_gamestore_game` FOREIGN KEY (`gameId`) REFERENCES `game` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gameStore_store` FOREIGN KEY (`storeId`) REFERENCES `store` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


--
-- Add comments to table `gameStore`
--

ALTER TABLE `gameStore`
  COMMENT='This represents a game''s entry within a specific store, linking the `game` and `store` tables.',
  MODIFY COLUMN `id` int NOT NULL AUTO_INCREMENT COMMENT 'Internal unique identifier for the game-store link.',
  MODIFY COLUMN `storeId` int unsigned NOT NULL COMMENT 'Foreign key linking to the `store` table (e.g., Steam, GOG).',
  MODIFY COLUMN `gameId` int NOT NULL COMMENT 'Foreign key linking to the `game` table.',
  MODIFY COLUMN `storeGameId` varchar(45) NOT NULL COMMENT 'The unique ID or slug for the game on the external store''s platform.',
  MODIFY COLUMN `url` text NOT NULL COMMENT 'The direct URL to the game''s page on the specified store.',
  MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when the game-store link was created.',
  MODIFY COLUMN `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp when the game-store link was last updated.',
  MODIFY COLUMN `status` enum('approved','pending','rejected') DEFAULT 'pending' COMMENT 'Approval status for this specific game-store link entry.';