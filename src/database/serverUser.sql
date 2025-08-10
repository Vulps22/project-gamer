--
-- Table structure for table `serverUser`
--

DROP TABLE IF EXISTS `serverUser`;

CREATE TABLE `serverUser` (
  `serverId` varchar(20) NOT NULL,
  `userId` varchar(20) NOT NULL,
  `sharing` tinyint NOT NULL DEFAULT '0',
  UNIQUE KEY `indx_serverUser_composite_PK` (`serverId`,`userId`),
  KEY `fk_serverUser_user` (`userId`),
  CONSTRAINT `fk_serverUser_server` FOREIGN KEY (`serverId`) REFERENCES `server` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_serverUser_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Add comments to table `serverUser`
--

ALTER TABLE `serverUser`
  COMMENT='Junction table linking users to the servers they are members of, and storing server-specific settings.',
  MODIFY COLUMN `serverId` varchar(20) NOT NULL COMMENT 'Foreign key linking to the `server` table.',
  MODIFY COLUMN `userId` varchar(20) NOT NULL COMMENT 'Foreign key linking to the `user` table.',
  MODIFY COLUMN `sharing` tinyint NOT NULL DEFAULT 0 COMMENT 'Boolean flag (0=false, 1=true) indicating if the user is sharing their game library with this specific server.';