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

### Rollout Commands

Use these npm scripts to manage rollouts:

```bash
# Apply all pending rollouts
npm run db:rollout

# Apply rollouts for a specific issue (optional parameter)
npm run db:rollout 26

# Rollback a specific rollout (requires issue number)
npm run db:revert 26

# Apply schema files to a fresh database
npm run db:apply
```

### Rollout Tracking

The system automatically tracks all rollout executions in the `migration_log` table:
- **Environment-aware**: Dev allows re-runs with rollback checking, staging/production are once-only
- **Rollout/Rollback Logic**: In dev, you must roll back before re-running a rollout
- **Error Logging**: Failed rollouts are logged with error details and execution time

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

2.  **Apply Released Rollouts**: 
    ```bash
    npm run db:rollout
    ```
    Runs all pending rollout scripts to bring your schema up to the latest version.

3.  **Configure Your Environment**: Update the `.env` file with your local database connection details.
4.  **Add Local Configuration**: Add your development bot's information to the `configs` table.

### Updating an Existing Database

To update your existing local database with the latest changes:

1.  **Apply Pending Rollouts**: 
    ```bash
    # Run all pending rollouts
    npm run db:rollout
    
    # Or run rollouts for a specific issue only
    npm run db:rollout 26
    ```
    The system will automatically determine which rollouts need to be run.

2.  **Rollback if Needed**: If you need to undo a rollout during development:
    ```bash
    npm run db:revert <issue-number>
    ```

### Environment-Specific Behavior

- **Development (`ENVIRONMENT=dev`)**: 
  - Allows re-running rollouts after rollback
  - Checks rollout/rollback history to prevent duplicate rollouts
  - Shows helpful warning messages for already-applied rollouts

- **Staging/Production**: 
  - Rollouts run only once per environment
  - Strict execution controls prevent accidental re-runs
  - Enhanced logging and error reporting

---

## Reverting Deployed Changes

If you need to revert a ticket that has already been deployed to production, you have two options:

### 🤖 **Automated Reversion (Recommended)**

The fastest and safest way to revert an issue is using our **one-click GitHub Actions workflow**:

1. **Go to GitHub**: Repository → Actions → "Revert Issue"
2. **Click "Run workflow"** 
3. **Enter details**:
   - Issue number (e.g., `27`)
   - Reason for reversion
   - Type `CONFIRM` to proceed
4. **Click "Run workflow"**

**What it does automatically:**
- ✅ Validates the issue was in the latest release
- ✅ Finds and reverts migration rollout commit (if exists)
- ✅ Finds and reverts PR merge commit
- ✅ Executes database rollback on production server
- ✅ Creates hotfix release with auto-versioning
- ✅ Triggers deployment of reverted state
- ✅ Provides complete audit trail

**Result:** Complete reversion in ~5 minutes with zero manual steps.

### 🔧 **Manual Reversion Process**

For complex scenarios or when automation isn't available, follow the comprehensive manual guide:

📖 **[Manual Reversion Guide](./reverting%20your%20ticket.md)**

**⚠️ Important**: The automated workflow is recommended for 99% of scenarios. Only use manual reversion for edge cases or when the automation fails.

---

## Important Notice

Use of this bot and its associated code is for **development purposes only** unless explicitly authorized by Vulps.