// This script applies all .sql files from the /database directory.
// It uses the project's existing database module to ensure consistency.

// Note: Your project has "type": "module" in package.json, but most files use
// CommonJS (require). This script uses CommonJS to match your existing style.
const fs = require('fs/promises');
const path = require('path');
const db = require('../src/lib/database.js');

// --- Configuration ---
// The directory where your .sql schema files are located.
// It's relative to the project root.
const SCHEMA_DIR = 'database';
// -------------------

async function main() {
    console.log('Starting database schema application script...');

    try {
        // The `db` module singleton already handles the connection.

        // 1. Disable Foreign Key Checks
        console.log('🔑 Disabling foreign key checks...');
        await db.query('SET FOREIGN_KEY_CHECKS = 0;');

        // 2. Find and Execute all .sql files
        const projectRoot = path.resolve(__dirname, '..');
        const schemaPath = path.join(projectRoot, SCHEMA_DIR);

        const files = await fs.readdir(schemaPath);
        const sqlFiles = files.filter(file => path.extname(file).toLowerCase() === '.sql');

        if (sqlFiles.length === 0) {
            console.warn(`⚠️ No .sql files found in /${SCHEMA_DIR}/ directory. Nothing to apply.`);
        } else {
            console.log(`📂 Found ${sqlFiles.length} SQL files to execute...`);

            for (const file of sqlFiles) {
                const filePath = path.join(schemaPath, file);
                console.log(`\t- Applying: ${file}`);
                const sqlContent = await fs.readFile(filePath, 'utf8');

                // db.query can handle multiple statements because we enabled it in database.js
                await db.query(sqlContent);
            }
            console.log('✅ All schema files applied successfully.');
        }

    } catch (error) {
        console.error('❌ An error occurred during schema application:');
        console.error(error);
        process.exitCode = 1; // Exit with an error code
    } finally {
        // 3. Re-enable Foreign Key Checks and close the connection pool
        try {
            console.log('🔑 Re-enabling foreign key checks...');
            await db.query('SET FOREIGN_KEY_CHECKS = 1;');
        } catch (err) {
            console.error('❌ Failed to re-enable foreign key checks:', err);
        }

        // Use the close method from your database module
        await db.close();
        console.log('🚪 Database connection pool closed.');
    }
}

// Run the script
main();