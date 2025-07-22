// This script finds and executes all .sql files in /src/database/future,
// moving them to /src/database/release upon successful execution.
// If any script fails, the entire process is halted.

require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const db = require('../src/lib/database.js');

// --- Configuration ---
const PROJECT_ROOT = path.resolve(__dirname, '..');
const FUTURE_DIR = path.join(PROJECT_ROOT, 'src', 'database', 'future');
const RELEASE_DIR = path.join(PROJECT_ROOT, 'src', 'database', 'release');
const DATABASE_DIR = path.join(PROJECT_ROOT, 'src', 'database');
// -------------------

/**
 * Processes INCLUDE directives in SQL content
 * Replaces --INCLUDE @filename.sql with the contents of database/filename.sql
 * @param {string} sqlContent - The SQL content to process
 * @returns {Promise<string>} - The processed SQL with includes resolved
 */
async function processIncludes(sqlContent) {
    const lines = sqlContent.split('\n');
    const processedLines = [];

    for (const line of lines) {
        // Trim whitespace including carriage returns to handle Windows line endings
        const trimmedLine = line.trim();
        const includeMatch = trimmedLine.match(/^--\s*INCLUDE\s+@(.+)$/i);
        if (includeMatch) {
            const includePath = includeMatch[1];
            const fullIncludePath = path.join(DATABASE_DIR, includePath);
            
            try {
                const includeContent = await fs.readFile(fullIncludePath, 'utf8');
                console.log(`\t\t📄 Including: ${includePath}`);
                processedLines.push(`-- INCLUDED FROM: ${includePath}`);
                processedLines.push(includeContent);
                processedLines.push(`-- END INCLUDE: ${includePath}`);
            } catch (error) {
                console.error(`\t\t❌ Failed to include ${includePath}: ${error.message}`);
                throw new Error(`INCLUDE directive failed: ${includePath} not found`);
            }
        } else {
            processedLines.push(line);
        }
    }

    return processedLines.join('\n');
}

/**
 *
 */
async function main() {
    console.log('Starting database migration script...');

    try {
    // Enable migration mode to use elevated credentials
        await db.setMigrating(true);

        // Ensure the release directory exists, create it if it doesn't.
        await fs.mkdir(RELEASE_DIR, { recursive: true });

        // 1. Get and sort all migration files.
        // Sorting ensures that files like '001_...'.sql run before '002_...'.sql
        const files = await fs.readdir(FUTURE_DIR);
        const sqlFiles = files
            .filter(file => path.extname(file).toLowerCase() === '.sql')
            .sort(); // Alphabetical sort is predictable and reliable with a good naming convention.

        if (sqlFiles.length === 0) {
            console.log('✅ No migration files found in /future. Database is up to date.');
            return; // Exit gracefully
        }

        // 2. Check migration status and filter based on environment and migration history
        const currentEnv = process.env.ENVIRONMENT || 'dev';
        const pendingMigrations = [];
        
        // Check if migration_log table exists
        let migrationLogExists = false;
        try {
            await db.query('SELECT 1 FROM migration_log LIMIT 1');
            migrationLogExists = true;
        } catch {
            console.log('📋 Migration log table not found - running all migrations (first-time setup)');
        }
        
        if (!migrationLogExists) {
            // Fallback: run all migrations if migration_log doesn't exist yet
            pendingMigrations.push(...sqlFiles);
        } else {
            // Universal logic with rollout/rollback checking for all environments
            for (const file of sqlFiles) {
                const migrationName = file.replace(/_(rollout|rollback)\.sql$/i, '');
                const migrationType = file.includes('_rollback') ? 'rollback' : 'rollout';
                
                if (migrationType === 'rollout') {
                    // Get latest rollout and rollback for this migration
                    const latestRollout = await db.query(
                        'SELECT executed_at FROM migration_log WHERE migration_name = ? AND environment = ? AND migration_type = ? AND result = ? ORDER BY executed_at DESC LIMIT 1',
                        [migrationName, currentEnv, 'rollout', 'success']
                    );
                    
                    if (latestRollout.length > 0) {
                        // Check if there's a rollback after the latest rollout
                        const rollbackAfterRollout = await db.query(
                            'SELECT executed_at FROM migration_log WHERE migration_name = ? AND environment = ? AND migration_type = ? AND result = ? AND executed_at > ? ORDER BY executed_at DESC LIMIT 1',
                            [migrationName, currentEnv, 'rollback', 'success', latestRollout[0].executed_at]
                        );
                        
                        if (rollbackAfterRollout.length === 0) {
                            const envMessage = currentEnv === 'dev' ? 'Roll it back first!' : 'Use rollback script to revert before re-running.';
                            console.log(`\t⚠️  Skipping ${file}: Migration already applied! ${envMessage}`);
                            continue;
                        }
                    }
                }
                
                // Allow both rollouts and rollbacks in all environments
                // Rollouts are allowed if: never run, or previously rolled back
                // Rollbacks are always allowed (for emergency reverts)
                pendingMigrations.push(file);
            }
        }

        if (pendingMigrations.length === 0) {
            console.log(`✅ No new migrations to run in ${currentEnv} environment. Database is up to date.`);
            return;
        }

        const rerunMessage = ' (rollouts require rollback first, rollbacks always allowed)';
        console.log(`📂 Found ${pendingMigrations.length} migration(s) to run in ${currentEnv} environment${rerunMessage}...`);

        // 4. Execute each pending migration
        for (const file of pendingMigrations) {
            const sourcePath = path.join(FUTURE_DIR, file);
            const migrationName = file.replace(/_(rollout|rollback)\.sql$/i, '');
            const migrationType = file.includes('_rollback') ? 'rollback' : 'rollout';

            console.log(`\t- Running migration: ${file}`);

            // Log migration start (only if migration_log table exists)
            let logId = null;
            const startTime = Date.now();
            
            if (migrationLogExists) {
                logId = await db.insert('migration_log', {
                    migration_name: migrationName,
                    file_name: file,
                    migration_type: migrationType,
                    environment: currentEnv,
                    result: 'in_progress',
                    executed_by: process.env.USER || process.env.USERNAME || 'system',
                    executed_at: new Date()
                });
            }

            try {
                const sqlContent = await fs.readFile(sourcePath, 'utf8');
                
                // Process INCLUDE directives
                const processedSQL = await processIncludes(sqlContent);
                
                await db.queryMultiple(processedSQL); // Use database with migration credentials

                // Update log with success (only if migration_log table exists)
                const executionTime = Date.now() - startTime;
                if (migrationLogExists && logId) {
                    await db.update('migration_log',
                        { result: 'success', execution_time_ms: executionTime },
                        'id = ?',
                        [logId]
                    );
                }

                console.log(`\t- ✅ Success! Migration ${file} completed in ${executionTime}ms`);

            } catch (error) {
                // Update log with failure (only if migration_log table exists)
                const executionTime = Date.now() - startTime;
                if (migrationLogExists && logId) {
                    await db.update('migration_log',
                        {
                            result: 'failed',
                            execution_time_ms: executionTime,
                            error_message: error.message
                        },
                        'id = ?',
                        [logId]
                    );
                }

                console.error(`\t- ❌ FAILED to execute ${file}. Halting all migrations.`);
                throw error; // Re-throw the error to stop the loop
            }
        }

        console.log('🎉 All migrations completed successfully.');

    } catch (error) {
        console.error('\nA critical error occurred during the migration process. No further scripts were executed.');
        console.error('Error Details:', error.message);
        process.exitCode = 1; // Exit with an error code
    } finally {
    // 4. Always close the database connection.
        await db.close();
        console.log('🚪 Database connection pool closed.');
    }
}

// Run the script
main();