-- ----------------------------------------------------------------
-- ROLLBACK SCRIPT: GitHub Issue #26 - Add Schema to Project as SQL Files
--
-- This rollback script undoes all changes from 26_rollout.sql:
-- 1. Drops the migration_log table
-- 2. Reverts foreign key constraint changes
-- 3. Reverts column size changes
-- ----------------------------------------------------------------
SET @migration_name = '26';
SELECT CONCAT('--- STARTING ROLLBACK: ', @migration_name, ' ---') AS 'Migration';

-- -----------------------------------------------
-- SECTION: DROPPING TABLES
-- -----------------------------------------------
SELECT '--- Block: DROPPING MIGRATION TRACKING TABLE ---' AS 'Info';

-- Drop migration_log table
DROP TABLE IF EXISTS `migration_log`;

-- -----------------------------------------------
-- SECTION: REVERTING TABLE ALTERATIONS
-- -----------------------------------------------
SELECT '--- Block: REVERTING FOREIGN KEY CONSTRAINTS ---' AS 'Info';

-- Revert gameStore table foreign key columns to allow NULL
ALTER TABLE `gameStore`
  MODIFY COLUMN `storeId` int unsigned NULL,
  MODIFY COLUMN `gameId` int NULL;

-- Revert userLibrary table foreign key columns to allow NULL
ALTER TABLE `userLibrary`
  MODIFY COLUMN `userId` varchar(20) NULL,
  MODIFY COLUMN `gameStoreId` int NULL;

-- Revert store table name column size
ALTER TABLE `store`
  MODIFY COLUMN `name` varchar(50) NOT NULL;

-- -----------------------------------------------
-- Finalization
-- -----------------------------------------------
SELECT CONCAT('--- FINISHED ROLLBACK: ', @migration_name, ' ---') AS 'Migration';
