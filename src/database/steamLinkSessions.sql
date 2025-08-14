--
-- Table structure for table `steam_link_sessions`
--

DROP TABLE IF EXISTS `steam_link_sessions`;

CREATE TABLE `steam_link_sessions` (
  `token` varchar(255) NOT NULL,
  `userId` varchar(20) NOT NULL,
  `expiresAt` datetime NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`),
  KEY `fk_steam_sessions_user` (`userId`),
  CONSTRAINT `fk_steam_sessions_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Add comments to table `steam_link_sessions`
--

ALTER TABLE `steam_link_sessions`
  COMMENT='Temporary sessions for Steam account linking authentication.',
  MODIFY COLUMN `token` varchar(255) NOT NULL COMMENT 'Unique session token for Steam OAuth flow.',
  MODIFY COLUMN `userId` varchar(20) NOT NULL COMMENT 'Foreign key linking to the Discord user initiating the Steam link.',
  MODIFY COLUMN `expiresAt` datetime NOT NULL COMMENT 'Session expiration timestamp (15 minutes from creation).',
  MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when the session was created.';
