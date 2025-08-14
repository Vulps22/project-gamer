// This script reverts a specific rollout by running its rollback script.
// Usage: node scripts/run-revert.js <issue_number>
// Example: node scripts/run-revert.js 26

require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const db = require('../src/lib/database.js');

// --- Configuration ---
const PROJECT_ROOT = path.resolve(__dirname, '..');
const FUTURE_DIR = path.join(PROJECT_ROOT, 'src', 'database', 'future');
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
        const includeMatch = line.match(/^--\s*INCLUDE\s+@(.+)$/i);
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
 * Main revert function
 */
async function main() {
    // Check if issue number is provided
    const issueNumber = process.argv[2];
    if (!issueNumber) {
        console.error('❌ ERROR: Issue number is required!');
        console.error('Usage: node scripts/run-revert.js <issue_number>');
        console.error('Example: node scripts/run-revert.js 26');
        process.exit(1);
    }

    console.log(`Starting rollback for issue #${issueNumber}...`);

    try {
        // Enable migration mode to use elevated credentials
        await db.setMigrating(true);

        // Look for the rollback file
        const rollbackFile = `${issueNumber}_rollback.sql`;
        const rollbackPath = path.join(FUTURE_DIR, rollbackFile);

        // Check if rollback file exists
        try {
            await fs.access(rollbackPath);
        } catch {
            console.error(`❌ ERROR: Rollback file not found: ${rollbackFile}`);
            console.error(`Expected location: ${rollbackPath}`);
            process.exit(1);
        }

        const currentEnv = process.env.ENVIRONMENT || 'dev';
        console.log(`🔄 Running rollback for issue #${issueNumber} in ${currentEnv} environment...`);

        // Check if migration_log table exists
        let migrationLogExists = false;
        try {
            await db.query('SELECT 1 FROM migration_log LIMIT 1');
            migrationLogExists = true;
        } catch {
            console.log('📋 Migration log table not found - proceeding without logging');
        }

        // Log rollback start (only if migration_log table exists)
        let logId = null;
        const startTime = Date.now();
        
        if (migrationLogExists) {
            try {
                logId = await db.insert('migration_log', {
                    migration_name: issueNumber,
                    file_name: rollbackFile,
                    migration_type: 'rollback',
                    environment: currentEnv,
                    result: 'in_progress',
                    executed_by: process.env.USER || process.env.USERNAME || 'system',
                    executed_at: new Date()
                });
            } catch {
                // Ignore if migration_log table doesn't exist
                migrationLogExists = false;
                console.log('\t📋 Note: Migration logging unavailable (table not found)');
            }
        }

        try {
            console.log(`\t- Running rollback: ${rollbackFile}`);
            
            const sqlContent = await fs.readFile(rollbackPath, 'utf8');
            
            // Process INCLUDE directives
            const processedSQL = await processIncludes(sqlContent);
            
            await db.queryMultiple(processedSQL);

            // Update log with success (only if migration_log table exists and wasn't dropped)
            const executionTime = Date.now() - startTime;
            if (migrationLogExists && logId) {
                try {
                    await db.update('migration_log',
                        { result: 'success', execution_time_ms: executionTime },
                        'id = ?',
                        [logId]
                    );
                } catch (logError) {
                    // If migration_log table was dropped during rollback, that's expected
                    console.log(`\t📋 Note: Could not update migration log (table may have been dropped): ${logError.message}`);
                }
            }

            console.log(`\t- ✅ Success! Rollback ${rollbackFile} completed in ${executionTime}ms`);
            console.log(`🎉 Rollback for issue #${issueNumber} completed successfully.`);

        } catch (error) {
            // Update log with failure (only if migration_log table exists and wasn't dropped)
            const executionTime = Date.now() - startTime;
            if (migrationLogExists && logId) {
                try {
                    await db.update('migration_log',
                        {
                            result: 'failed',
                            execution_time_ms: executionTime,
                            error_message: error.message
                        },
                        'id = ?',
                        [logId]
                    );
                } catch (logError) {
                    // If migration_log table was dropped during rollback, that's expected
                    console.log(`\t📋 Note: Could not update migration log (table may have been dropped): ${logError.message}`);
                }
            }

            console.error(`\t- ❌ FAILED to execute rollback ${rollbackFile}.`);
            throw error;
        }

    } catch (error) {
        console.error('\nA critical error occurred during the rollback process.');
        console.error('Error Details:', error.message);
        process.exitCode = 1;
    } finally {
        // Always close the database connection
        await db.close();
        console.log('🚪 Database connection pool closed.');
    }
}

// Run the script
main();
