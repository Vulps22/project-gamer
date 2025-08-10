-- ----------------------------------------------------------------
-- ROLLBACK SCRIPT
--
-- INSTRUCTIONS:
-- 1. Ensure the file name is <branch_number>_rollback.sql
-- 2. Set the @migration_name to match the rollout script.
-- 3. Add the SQL to REVERSE your changes in the relevant sections.
-- 4. Delete any sections you are not using.
-- ----------------------------------------------------------------

SET @migration_name = '<branch_number>';
SELECT CONCAT('--- STARTING ROLLBACK: ', @migration_name, ' ---') AS 'Migration';

-- -----------------------------------------------
-- SECTION: REVERTING DATA MANIPULATION
-- -----------------------------------------------
-- SELECT '--- Block: REVERTING DATA MANIPULATION ---' AS 'Info';
-- (e.g., If you INSERTed data, DELETE it here.)



-- -----------------------------------------------
-- SECTION: REVERTING TABLE ALTERATIONS
-- -----------------------------------------------
-- SELECT '--- Block: REVERTING TABLE ALTERATIONS ---' AS 'Info';
-- (e.g., If you ADDED a column, DROP it here.)



-- -----------------------------------------------
-- SECTION: RE-CREATING DROPPED TABLES / COLUMNS
-- -----------------------------------------------
-- SELECT '--- Block: RE-CREATING DROPPED OBJECTS ---' AS 'Info';
-- (e.g., If you DROPPED a table, CREATE it again here.)



-- -----------------------------------------------
-- Finalization
-- -----------------------------------------------
SELECT CONCAT('--- FINISHED ROLLBACK: ', @migration_name, ' ---') AS 'Migration';