--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
  `id` varchar(20) NOT NULL,
  `steamId` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


--
-- Add comments to table `user`
--

ALTER TABLE `user`
  COMMENT='Stores the unique Discord IDs of users who have interacted with the bot.',
  MODIFY COLUMN `id` varchar(20) NOT NULL COMMENT 'The unique Discord user ID. This is the primary key.',
  MODIFY COLUMN `steamId` varchar(64) DEFAULT NULL COMMENT 'The user\'s Steam ID for account linking and library syncing.';