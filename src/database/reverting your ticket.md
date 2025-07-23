# Reverting Your Ticket

This guide covers how to safely revert a deployed ticket/issue that has already been rolled out to production.

## Overview

When you need to revert a deployed ticket, you have two options:
1. **🤖 Automated Reversion** (Recommended) - Use GitHub Actions workflow
2. **🔧 Manual Reversion** - Follow step-by-step process below

## 🤖 Automated Reversion (Recommended)

The easiest way to revert an issue is using our automated GitHub Actions workflow:

### Steps:
1. **Go to GitHub repository → Actions tab**
2. **Click "Revert Issue" workflow** (in the left sidebar)  
3. **Click "Run workflow"** (top right)
4. **Fill in the required information**:
   - **Issue number**: The GitHub issue number to revert (e.g., `27`)
   - **Reason**: Brief explanation why you're reverting (e.g., `Breaking production login`)
   - **Confirmation**: Type `CONFIRM` to proceed
5. **Click "Run workflow"**

### What the automation does:
✅ **Finds and reverts** the migration rollout commit  
✅ **Finds and reverts** the original PR merge commit  
✅ **Creates a hotfix release** with automatic versioning (e.g., `v2025.07.R2-H1`)  
✅ **Executes database rollback** on production server  
✅ **Deploys the reverted state** to production  
✅ **Creates comprehensive documentation** of what was reverted  

**Result**: Complete reversion with zero manual steps and full audit trail.

---

## 🔧 Manual Reversion Process

If you need to perform the reversion manually, follow this process:

## Prerequisites

- Access to the production database
- Git repository write access
- GitHub repository admin access for creating releases
- Knowledge of the issue number you want to revert

## Step-by-Step Reversion Process

### Step 1: Identify the Commits to Revert

The easiest way to find commits related to your issue is to check the GitHub issue page:

1. **Go to the GitHub issue**: `https://github.com/Vulps22/project-gamer/issues/<issue_number>`
2. **Scroll down to see all commits** - GitHub automatically lists all commits that reference the issue number (This is why it is now standard practice to prefix your commits with `#<issue number>`)
3. **Look for these specific commits**:
   - **Migration rollout commit**: `"#<issue_number> - Rolled out migration for v<version>"`
   - **PR merge commit**: `"Merge pull request #<issue_number> from <branch>"`

**Alternative CLI method** (if you prefer command line):
```bash
# Find the migration rollout commit
git log --oneline --grep="#<issue_number> - Rolled out migration"

# Find the original PR merge commit
git log --oneline --grep="Merge pull request.*#<issue_number>"
```

### Step 2: Revert the Migration Rollout Commit

*You might need Vulps to do this as main is a protected branch*

This moves the migration files back from `release/` to `future/` directory:

```bash
# Revert the migration deployment commit
git revert <migration-rollout-commit-hash>

# Example:
git revert abc123f  # "#27 - Rolled out migration for v2025.07.R2"
```

**Result**: Your migration files are moved back to the `future/` directory, ready for rollback execution.

### Step 3: Execute Database Rollback

Run the database rollback script to undo the schema changes:

```bash
# Execute the rollback for your specific issue
npm run db:revert <issue_number>

# Example:
npm run db:revert 27
```

**Result**: Database schema changes are reverted using your rollback SQL files.

### Step 4: Revert the Original Code Changes

Revert the commit that merged your feature code into main:

```bash
# Revert the original PR merge
git revert <pr-merge-commit-hash>

# Example:
git revert def456a  # "Merge pull request #27 from feature/user-profiles"
```

**Result**: Your code changes are removed from the main branch.

### Step 5: Push the Revert Commits

```bash
# Push all revert commits
git push origin main
```

### Step 6: Deploy the Reverted State

Create a hotfix release to deploy the reverted state:

1. **Go to GitHub repository → Releases**
2. **Click "Create a new release"**
3. **Create a new tag** with hotfix number:
   ```
   Original version: v2025.07.R2
   Hotfix version:   v2025.07.R2-H1
   ```
4. **Title**: `Hotfix v2025.07.R2-H1 - Revert Issue #<number>`
5. **Description**:
   ```markdown
   ## Hotfix Release - Revert Issue #<number>
   
   This hotfix reverts the changes from issue #<number> due to:
   - [Reason for revert]
   
   ### Reverted Changes:
   - Database schema changes for issue #<number>
   - Feature code for [feature name]
   
   ### Database Impact:
   - Rollback executed: <issue_number>_rollback.sql
   - Tables affected: [list tables]
   ```
6. **Click "Publish release"**

**Result**: GitHub Actions will automatically deploy the reverted state to production.

## Verification Steps

After the hotfix deployment completes:

### 1. Verify Database State
```bash
# Connect to production database and verify schema
mysql -h <host> -u <user> -p <database>

# Check migration log
SELECT * FROM migration_log WHERE issue_number = <issue_number> ORDER BY executed_at DESC;
```

### 2. Verify Application Functionality
- Test the features that were reverted
- Ensure no broken functionality remains
- Monitor application logs for errors

### 3. Verify File Locations
```bash
# Confirm migration files are back in future/ directory
ls -la src/database/future/<issue_number>_*

# Confirm rollback was logged
git log --oneline -10 | grep "Rolled out migration\|revert"
```

## Important Notes

### ⚠️ Order Matters
You **must** follow the steps in this exact order:
1. Revert migration rollout commit (moves files back)
2. Execute database rollback (undoes schema changes)  
3. Revert code merge commit (removes feature code)
4. Deploy hotfix (applies all changes)

### ⚠️ Data Loss Warning
- Database rollbacks may result in **data loss**
- Always verify with stakeholders before proceeding
- Consider data export/backup if needed

### ⚠️ Coordination Required
- Notify team members before starting reversion
- Coordinate with QA for post-revert testing
- Update relevant tickets/documentation

## Hotfix Versioning Convention

```
Base Version: v2025.07.R2
Hotfix 1:     v2025.07.R2-H1
Hotfix 2:     v2025.07.R2-H2
```

## Troubleshooting

### Migration Files Not Found
If migration files are missing from `future/` after step 2:
```bash
# Check if files exist in release/
ls -la src/database/release/<issue_number>_*

# Manually move them back if needed
mv src/database/release/<issue_number>_* src/database/future/
```

### Database Rollback Fails
If `npm run db:revert` fails:
```bash
# Check rollback file exists
ls -la src/database/future/<issue_number>_rollback.sql

# Check database connection
npm run db:test-connection

# Manual rollback execution
mysql -h <host> -u <user> -p <database> < src/database/future/<issue_number>_rollback.sql
```

### GitHub Actions Deployment Fails
- Check GitHub Actions logs for errors
- Verify SSH access to production server
- Ensure Docker images are available
- Check server disk space and resources

## Recovery from Failed Reversion

If the reversion process fails partway through:

1. **Assess current state**:
   - Check which commits have been reverted
   - Verify database state
   - Check file locations

2. **Continue from appropriate step**:
   - If database rollback failed, fix and retry step 3
   - If deployment failed, retry step 6

3. **Emergency rollback**:
   - Use database backup from before original deployment
   - Restore previous Docker image version manually

## Post-Reversion Tasks

After successful reversion:

1. **Update issue status** in project management tool
2. **Document lessons learned**
3. **Review why reversion was necessary**
4. **Plan fixes for the reverted feature** (if applicable)
5. **Notify stakeholders** of completion

---

*For additional help, contact the development team or refer to the main database README.md*
