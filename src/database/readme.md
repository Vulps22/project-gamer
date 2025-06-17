# Database Management

This document outlines the standard procedures for managing database schema changes and for setting up a local database for development purposes.

---

## Making Schema Changes

When you need to alter the database schema (e.g., add a table, alter a column), follow this migration process. This ensures that all changes are version-controlled, reversible, and can be deployed automatically.

1.  **Create a Rollout Script**
    -   In the `/src/database/future/` directory, create a new file named `<branch-number>_rollout.sql`.
    -   This script must contain the SQL commands (`ALTER TABLE`, `CREATE TABLE`, etc.) needed to **apply** your changes to the database.

2.  **Create a Rollback Script**
    -   In the same `/src/database/future/` directory, create a corresponding file named `<branch-number>_rollback.sql`.
    -   This script must contain the SQL commands needed to **revert** the changes made by your rollout script. This is critical for recovering from a failed deployment.

3.  **Update the Canonical Schema Files**
    -   After creating the migration scripts, update the relevant table definition files directly within the `/src/database/` directory. These files should always reflect the final, complete structure of the tables.

### CI/CD Automation

During the release cycle, a GitHub Actions workflow will automatically execute all rollout scripts from `/src/database/future/` on the `main` branch. Upon successful execution, it will move the migration scripts to `/src/database/release/` to log the completed changes.

---

## Development Environment Setup

Follow these instructions to create or update your local database instance.

### Initial Database Setup

For a fresh installation and a new local database:

1.  **Create the Base Schema**: Execute all SQL scripts in the root `/src/database/` directory to build the initial database structure.
    -   `TODO: Create a master rollout script to automate this step.`
2.  **Apply Released Migrations**: Run all scripts in the `/src/database/release/` folder sequentially to bring your schema up to the latest version.
3.  **Configure Your Environment**: Update the `.env` file with your local database connection details.
4.  **Add Local Configuration**: Add your development bot's information to the `configs` table.

### Updating an Existing Database

To update your existing local database with the latest changes:

1.  **Apply Released Migrations**: Run any scripts from the `/src/database/release/` folder that you have not yet executed.
2.  **Apply Your Feature Changes**: If you are actively developing a schema change, execute your branch's specific `_rollout.sql` script located in your local `/src/database/future/` folder.

---

## Important Notice

Use of this bot and its associated code is for **development purposes only** unless explicitly authorized by Vulps.