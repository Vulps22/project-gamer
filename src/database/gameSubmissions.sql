--
-- Table structure for table `gameSubmissions`
--

DROP TABLE IF EXISTS `gameSubmissions`;

CREATE TABLE `gameSubmissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `url` text NOT NULL,
  `submittedBy` varchar(20) DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_gameSubmissions_user` (`submittedBy`),
  CONSTRAINT `fk_gameSubmissions_user` FOREIGN KEY (`submittedBy`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Add comments to table `gameSubmissions`
--

ALTER TABLE `gameSubmissions`
  COMMENT='Tracks game URLs submitted by users for review and addition to the database.',
  MODIFY COLUMN `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Internal unique identifier for the submission record.',
  MODIFY COLUMN `url` varchar(255) NOT NULL COMMENT 'The URL of the game store page submitted by the user.',
  MODIFY COLUMN `submittedBy` varchar(20) DEFAULT NULL COMMENT 'Foreign key linking to the `user` who made the submission. Becomes NULL if the user is deleted.',
  MODIFY COLUMN `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending' COMMENT 'The review status of the submission. ''pending'': awaiting review; ''approved'': added to system; ''rejected'': declined.',
  MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp of when the submission was made.',
  MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp of when the submission was last reviewed or updated.';