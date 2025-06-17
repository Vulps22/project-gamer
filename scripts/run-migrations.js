// This script finds and executes all .sql files in /src/database/future,
// moving them to /src/database/release upon successful execution.
// If any script fails, the entire process is halted.

const fs = require('fs/promises');
const path = require('path');
const db = require('../src/lib/database.js');

// --- Configuration ---
const PROJECT_ROOT = path.resolve(__dirname, '..');
const FUTURE_DIR = path.join(PROJECT_ROOT, 'src', 'database', 'future');
const RELEASE_DIR = path.join(PROJECT_ROOT, 'src', 'database', 'release');
// -------------------

async function main() {
  console.log('Starting database migration script...');

  try {
    // Ensure the release directory exists, create it if it doesn't.
    await fs.mkdir(RELEASE_DIR, { recursive: true });

    // 1. Get and sort all migration files.
    // Sorting ensures that files like '001_...'.sql run before '002_...'.sql
    const files = await fs.readdir(FUTURE_DIR);
    const sqlFiles = files
      .filter(file => path.extname(file).toLowerCase() === '.sql')
      .sort(); // Alphabetical sort is predictable and reliable with a good naming convention.

    if (sqlFiles.length === 0) {
      console.log('✅ No new migration files found in /future. Database is up to date.');
      return; // Exit gracefully
    }

    console.log(`📂 Found ${sqlFiles.length} migration(s) to run...`);

    // 2. Execute each file one by one.
    for (const file of sqlFiles) {
      const sourcePath = path.join(FUTURE_DIR, file);
      const destinationPath = path.join(RELEASE_DIR, file);

      console.log(`\t- Running migration: ${file}`);

      try {
        const sqlContent = await fs.readFile(sourcePath, 'utf8');
        await db.query(sqlContent); // Assumes multipleStatements is true

        // 3. If execution succeeds, move the file.
        await fs.rename(sourcePath, destinationPath);
        console.log(`\t- ✅ Success! Moved ${file} to /release.`);

      } catch (error) {
        // If an error occurs in this block, we will re-throw it
        // to be caught by the outer catch block, which halts the script.
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