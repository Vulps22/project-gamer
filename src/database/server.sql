--
-- Table structure for table `server`
--

DROP TABLE IF EXISTS `server`;

CREATE TABLE `server` (
  `id` varchar(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Add comments to table `server`
--

ALTER TABLE `server`
  COMMENT='Stores the unique IDs of Discord servers (guilds) where the bot is active.',
  MODIFY COLUMN `id` varchar(20) NOT NULL COMMENT 'The unique Discord server (guild) ID. This is the primary key.';