--
-- Table structure for table `game`
--

DROP TABLE IF EXISTS `game`;

CREATE TABLE `game` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `imageURL` text,
  `status` enum('approved','pending','rejected') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_game_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Add comments to table `game`
--

ALTER TABLE `game`
  COMMENT='Represents a single, unique game title, independent of any digital storefronts.',
  MODIFY COLUMN `id` int NOT NULL AUTO_INCREMENT COMMENT 'Internal unique identifier for the game record.',
  MODIFY COLUMN `name` varchar(255) NOT NULL COMMENT 'The official display name of the game.',
  MODIFY COLUMN `imageURL` text DEFAULT NULL COMMENT 'A URL pointing to the cover art or promotional image for the game.',
  MODIFY COLUMN `status` enum('approved','pending','rejected') NOT NULL DEFAULT 'pending' COMMENT 'The approval status of the game submission. ''pending'': awaiting review; ''approved'': visible to users; ''rejected'': declined.',
  MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp of when the game record was first created.',
  MODIFY COLUMN `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp of the last update to the game record.';