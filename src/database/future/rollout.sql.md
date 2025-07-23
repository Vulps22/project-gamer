-- ----------------------------------------------------------------
-- ROLLOUT SCRIPT
--
-- INSTRUCTIONS:
-- 1. Ensure the file name is <branch_number>_rollout.sql
-- 2. Set the @migration_name to your branch number/name.
-- 3. Add your SQL statements to the relevant sections.
-- 4. Delete any sections you are not using.
-- ----------------------------------------------------------------

SET @migration_name = '<branch_number>';
SELECT CONCAT('--- STARTING ROLLOUT: ', @migration_name, ' ---') AS 'Migration';

-- -----------------------------------------------
-- SECTION: CREATING NEW TABLES
-- -----------------------------------------------
-- SELECT '--- Block: CREATING NEW TABLES ---' AS 'Info';



-- -----------------------------------------------
-- SECTION: ALTERING EXISTING TABLES
-- -----------------------------------------------
-- SELECT '--- Block: ALTERING EXISTING TABLES ---' AS 'Info';



-- -----------------------------------------------
-- SECTION: MANIPULATING DATA (INSERT, UPDATE, DELETE)
-- -----------------------------------------------
-- SELECT '--- Block: MANIPULATING DATA ---' AS 'Info';



-- -----------------------------------------------
-- SECTION: DROPPING TABLES / COLUMNS
-- -----------------------------------------------
-- SELECT '--- Block: DROPPING OBJECTS ---' AS 'Info';



-- -----------------------------------------------
-- Finalization
-- -----------------------------------------------
SELECT CONCAT('--- FINISHED ROLLOUT: ', @migration_name, ' ---') AS 'Migration';