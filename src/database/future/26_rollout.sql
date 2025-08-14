-- ----------------------------------------------------------------
-- ROLLOUT SCRIPT: GitHub Issue #26 - Add Schema to Project as SQL Files
--
-- This comprehensive migration does several things:
-- 1. Fixes foreign key constraints to align with schema files
-- 2. Adds migration tracking system for deployment management
-- 3. Adjusts column sizes where needed
-- ----------------------------------------------------------------
SET @migration_name = '26';
SELECT CONCAT('--- STARTING ROLLOUT: ', @migration_name, ' ---') AS 'Migration';

-- -----------------------------------------------
-- SECTION: CREATING NEW TABLES
-- -----------------------------------------------
SELECT '--- Block: CREATING MIGRATION TRACKING TABLE ---' AS 'Info';

-- Create migration_log table using INCLUDE directive
-- INCLUDE @migrationLog.sql

-- -----------------------------------------------
-- SECTION: ALTERING EXISTING TABLES
-- -----------------------------------------------
SELECT '--- Block: FIXING FOREIGN KEY CONSTRAINTS ---' AS 'Info';

-- Fix gameStore table foreign key columns
ALTER TABLE `gameStore`
  MODIFY COLUMN `storeId` int unsigned NOT NULL,
  MODIFY COLUMN `gameId` int NOT NULL;

-- Fix userLibrary table foreign key columns  
ALTER TABLE `userLibrary`
  MODIFY COLUMN `userId` varchar(20) NOT NULL,
  MODIFY COLUMN `gameStoreId` int NOT NULL;

-- Fix store table name column size
ALTER TABLE `store`
  MODIFY COLUMN `name` varchar(255) NOT NULL;

-- -----------------------------------------------
-- Finalization
-- -----------------------------------------------
SELECT CONCAT('--- FINISHED ROLLOUT: ', @migration_name, ' ---') AS 'Migration';
