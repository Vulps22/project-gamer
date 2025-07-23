--
-- Table structure for table `userLibrary`
--

DROP TABLE IF EXISTS `userLibrary`;

CREATE TABLE `userLibrary` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `userId` varchar(20) NOT NULL,
  `gameStoreId` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_userLibrary_user` (`userId`),
  KEY `fk_userLibrary_gameStore` (`gameStoreId`),
  CONSTRAINT `fk_userLibrary_gameStore` FOREIGN KEY (`gameStoreId`) REFERENCES `gameStore` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_userLibrary_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


--
-- Add comments to table `userLibrary`
--

ALTER TABLE `userLibrary`
  COMMENT='Junction table representing a user''s game library, linking a user to a specific game on a specific store.',
  MODIFY COLUMN `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Internal unique identifier for the library entry.',
  MODIFY COLUMN `userId` varchar(20) NOT NULL COMMENT 'Foreign key linking to the `user` who owns the game.',
  MODIFY COLUMN `gameStoreId` int NOT NULL COMMENT 'Foreign key linking to the `gameStore` entry, representing the specific game on a specific store.';