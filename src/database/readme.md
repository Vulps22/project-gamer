# Database Management

This document outlines the standard procedures for managing database schema changes and for setting up a local database for development purposes.

---

## Making Schema Changes

When you need to alter the database schema (e.g., add a table, alter a column), follow this migration process. This ensures that all changes are version-controlled, reversible, and can be deployed automatically.

1.  **Create a Rollout Script**
    -   In the `/src/database/future/` directory, create a new file named `<github-issue-number>_rollout.sql`.
    -   This script must contain the SQL commands (`ALTER TABLE`, `CREATE TABLE`, etc.) needed to **apply** your changes to the database.
    -   **Important**: Use GitHub issue numbers, not branch numbers (e.g., `26_rollout.sql` for issue #26).

2.  **Create a Rollback Script**
    -   In the same `/src/database/future/` directory, create a corresponding file named `<github-issue-number>_rollback.sql`.
    -   This script must contain the SQL commands needed to **revert** the changes made by your rollout script. This is critical for recovering from a failed deployment.

3.  **Update the Canonical Schema Files**
    -   After creating the migration scripts, update the relevant table definition files directly within the `/src/database/` directory. These files should always reflect the final, complete structure of the tables.

4.  **INCLUDE Directive System**
    -   You can reuse schema files in migration scripts using the INCLUDE directive:
    -   ```sql
        -- INCLUDE @migrationLog.sql
        ```
    -   This will include the contents of `/src/database/migrationLog.sql` at that location.
    -   Promotes DRY principles and consistency between schema files and migrations.

### Migration Commands

Use these npm scripts to manage migrations:

```bash
# Apply all pending migrations
npm run db:migrate

# Rollback a specific migration (requires issue number)
npm run db:revert 26

# Apply schema files to a fresh database
npm run db:apply
```

### Migration Tracking

The system automatically tracks all migration executions in the `migration_log` table:
- **Environment-aware**: Dev allows re-runs with rollback checking, staging/production are once-only
- **Rollout/Rollback Logic**: In dev, you must roll back before re-running a rollout
- **Error Logging**: Failed migrations are logged with error details and execution time

---

## Development Environment Setup

Follow these instructions to create or update your local database instance.

### Prerequisites

Ensure you have the proper database users configured as described in `/docs/database-users-setup.md`:
- **Bot User**: `gamer_bot_user` (limited permissions for normal operations)
- **Migration User**: `dev_migration` (elevated permissions for schema changes)

### Initial Database Setup

For a fresh installation and a new local database:

1.  **Create the Base Schema**: 
    ```bash
    npm run db:apply
    ```
    This executes all SQL scripts in `/src/database/` to build the initial database structure.

2.  **Apply Released Migrations**: 
    ```bash
    npm run db:migrate
    ```
    Runs all pending migration scripts to bring your schema up to the latest version.

3.  **Configure Your Environment**: Update the `.env` file with your local database connection details.
4.  **Add Local Configuration**: Add your development bot's information to the `configs` table.

### Updating an Existing Database

To update your existing local database with the latest changes:

1.  **Apply Pending Migrations**: 
    ```bash
    npm run db:migrate
    ```
    The system will automatically determine which migrations need to be run.

2.  **Rollback if Needed**: If you need to undo a migration during development:
    ```bash
    npm run db:revert <issue-number>
    ```

### Environment-Specific Behavior

- **Development (`ENVIRONMENT=dev`)**: 
  - Allows re-running migrations after rollback
  - Checks rollout/rollback history to prevent duplicate rollouts
  - Shows helpful warning messages for already-applied migrations

- **Staging/Production**: 
  - Migrations run only once per environment
  - Strict execution controls prevent accidental re-runs
  - Enhanced logging and error reporting

---

## Important Notice

Use of this bot and its associated code is for **development purposes only** unless explicitly authorized by Vulps.