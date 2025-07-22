# Database User Setup Guide

This document explains how to set up the different database users needed for the project.

## 🔐 User Architecture

### 1. **Bot User** (Limited Permissions)
- **Username**: `gamer_bot_user` 
- **Purpose**: Used by the bot for normal operations
- **Permissions**: SELECT, INSERT, UPDATE, DELETE
- **Environment Variables**: `DB_USER`, `DB_PASS`

### 2. **Migration User** (Elevated Permissions)
- **Username**: `dev_migration`
- **Purpose**: Used for schema management and rollouts
- **Permissions**: CREATE, DROP, ALTER, INDEX, REFERENCES + all bot permissions
- **Environment Variables**: `DB_MIGRATION_USER`, `DB_MIGRATION_PASS`

## � How It Works

The database module has a toggle system:
- **Normal mode**: Uses `DB_USER`/`DB_PASS` (limited permissions)
- **Rollout mode**: Uses `DB_MIGRATION_USER`/`DB_MIGRATION_PASS` (elevated permissions)

```javascript
// Switch to rollout mode for schema operations
await db.setMigrating(true);

// Switch back to normal mode for bot operations  
await db.setMigrating(false);
```

## �📋 SQL Setup Commands

Run these commands on your MySQL server as an administrator:

```sql
-- 1. Create the migration user
CREATE USER 'dev_migration'@'%' IDENTIFIED BY 'your_secure_migration_password';

-- 2. Grant schema management permissions
GRANT CREATE, DROP, ALTER, INDEX ON project_gamer_dev.* TO 'dev_migration'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON project_gamer_dev.* TO 'dev_migration'@'%';
GRANT REFERENCES ON project_gamer_dev.* TO 'dev_migration'@'%';

-- 3. Apply changes
FLUSH PRIVILEGES;

-- 4. Verify permissions (optional)
SHOW GRANTS FOR 'dev_migration'@'%';
```

## 🔧 Environment Configuration

Add these to your `.env` file:

```env
# Existing bot database user (limited permissions)
DB_USER=gamer_bot_user
DB_PASS=your_bot_password

# New migration user (elevated permissions) 
DB_MIGRATION_USER=dev_migration
DB_MIGRATION_PASS=your_secure_migration_password

# Other existing database settings
DB_HOST=your_host
DB_PORT=3306
DB_NAME=project_gamer_dev
```

## 🧪 Testing

Once configured, you can test:

```bash
# Test schema application (uses migration user automatically)
npm run db:apply

# Test rollouts (uses migration user automatically)  
npm run db:rollout

# Test rollback system (uses migration user automatically)
npm run db:revert 26

# Test bot operations (uses regular bot user)
npm start
```

### Available NPM Scripts

- `npm run db:apply` - Apply schema files to fresh database
- `npm run db:rollout` - Run pending rollout files  
- `npm run db:revert <issue-number>` - Rollback specific rollout (requires issue number)

## 🛡️ Security Benefits

- **Principle of Least Privilege**: Bot runs with minimal permissions
- **Separation of Concerns**: Schema changes require elevated access
- **Audit Trail**: Clear separation between operational and administrative database access
- **Reduced Risk**: Compromised bot token cannot drop/alter tables

## 📊 Rollout Tracking

The system automatically creates a `migration_log` table to track:
- Which rollouts have been executed
- When they were executed and by whom
- Execution time and results (success/failure)
- Environment-specific execution history
- Rollout and rollback operations

This enables:
- **Environment-aware deployments**: Dev allows re-runs, staging/production are once-only
- **Rollback safety**: System prevents duplicate rollouts until properly rolled back
- **Audit compliance**: Complete history of all schema changes

## 🔄 Fallback Behavior

The database module will fall back to the regular bot user if migration credentials aren't provided:

```javascript
const dbUser = process.env.DB_MIGRATION_USER || process.env.DB_USER;
const dbPassword = process.env.DB_MIGRATION_PASS || process.env.DB_PASS;
```

This allows for gradual migration to the new user system.
