# Fix /sync command causing global bot lockup

## Problem

When users run the `/sync` command to synchronize their Steam library, the bot becomes **globally unresponsive** for 10-150 seconds depending on library size. During this time, ALL users across ALL servers cannot use ANY bot commands.

### Root Cause

The lockup occurs in `gameManagerService.registerNewGames()` (lines 373-441):

```javascript
for (const gameData of newGamesData) {  // SEQUENTIAL LOOP
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        // ... database queries and inserts ...
        await conn.commit();
    } finally {
        conn.release();
    }
}
```

**Why this locks up the bot:**
1. **Sequential processing**: For 100 new games, creates 100 sequential database transactions
2. **Blocking event loop**: Each transaction takes ~100-300ms, totaling 10-30+ seconds
3. **No concurrency**: The synchronous for loop prevents Node.js from handling other Discord interactions
4. **Single-threaded bottleneck**: JavaScript's event loop is blocked while waiting for each database operation

**Performance impact:**
- User with 50 new games: ~5-15 seconds of bot freeze
- User with 500 new games: ~50-150 seconds of bot freeze
- **All other users globally blocked during this time**

### Call Stack
```
/sync command (sync.js:19)
  ├─> steamManagerService.getSteamLibrary() [~1-2s]
  ├─> gameManagerService.getKnownGames() [~0.5s]
  ├─> gameManagerService.registerNewGames() [⚠️ 10-150s BLOCKING]
  └─> userLibraryManagerService.syncUserLibrary() [~1-2s]
```

---

## Proposed Solution: Child Process Architecture

### Approach
Offload the entire sync operation to a separate child process, keeping the main bot process responsive.

### Architecture
```
Discord Bot (Main Process)
├── Handles all Discord interactions (NEVER BLOCKS)
├── Receives /sync command
├── Forks Child Process
│   └── Completely isolated Node.js instance
│   └── Own database connections
│   └── Performs entire sync operation
│   └── Sends result via IPC when complete
└── Updates user with result
```

### Why Child Process (vs Worker Threads)?

**Child Process is better for this codebase because:**
1. ✅ **Singleton compatibility**: Current services use singleton pattern - child processes handle this cleanly
2. ✅ **Database isolation**: mysql2 connections are isolated per process (no thread-safety issues)
3. ✅ **Crash isolation**: Worker crash can't corrupt main bot state
4. ✅ **Minimal refactoring**: Works with existing service architecture
5. ✅ **Complete isolation**: Separate memory and V8 instance

---

## Implementation Plan

### Phase 1: Basic Child Process (2-3 hours)
- [ ] Create `src/workers/steamSyncWorker.js`
- [ ] Move sync logic from command to worker
- [ ] Implement IPC communication (send/receive messages)
- [ ] Refactor `src/commands/global/sync.js` to spawn worker
- [ ] Add error handling for worker failures

### Phase 2: Process Pool Management (1-2 hours)
- [ ] Implement max concurrent sync limit (5 processes)
- [ ] Add queue system for excess requests
- [ ] Add timeout handling (kill process if >5 minutes)
- [ ] Prevent duplicate syncs for same user

### Phase 3: Production Hardening (1-2 hours)
- [ ] Comprehensive error handling
- [ ] Enhanced logging for worker lifecycle
- [ ] Handle edge cases (user leaves server, process crashes, etc.)
- [ ] Add monitoring metrics (sync duration, queue length, etc.)

### Phase 4: Testing (1 hour)
- [ ] Test single user sync
- [ ] Test concurrent syncs (2-5 users)
- [ ] Test large library (500+ games)
- [ ] Test error scenarios (Steam API down, DB connection lost, etc.)
- [ ] Verify bot remains responsive during sync

---

## Technical Details

### File Structure
```
src/
├── commands/global/sync.js          [MODIFIED] - Spawns child process
├── workers/
│   └── steamSyncWorker.js           [NEW] - Performs sync in isolation
├── services/syncProcessPool.js      [NEW] - Manages process pool
└── services/...                     [UNCHANGED]
```

### Key Code Changes

**Worker Process (`src/workers/steamSyncWorker.js`)**:
```javascript
const { fork } = require('child_process');

process.on('message', async (data) => {
    const { discordUserId, steamId } = data;

    // Initialize services
    await db.init();
    await steamManagerService.init();

    // Perform entire sync
    const result = await performSync(discordUserId, steamId);

    // Send result back to main process
    process.send(result);
    process.exit(0);
});
```

**Command Refactor (`src/commands/global/sync.js`)**:
```javascript
async execute(interaction) {
    await interaction.ephemeralReply('Starting sync...');

    const child = fork('./workers/steamSyncWorker.js');
    child.send({ discordUserId, steamId });

    child.on('message', (result) => {
        interaction.editReply('Sync complete! ✨');
    });
}
```

---

## Success Criteria

- ✅ Bot remains responsive to all commands during sync
- ✅ Multiple users can sync simultaneously without blocking
- ✅ Large libraries (500+ games) sync without global impact
- ✅ Error handling gracefully manages worker failures
- ✅ No regression in sync functionality

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Process spawn overhead | Low | Process pool limits concurrent spawns |
| Memory usage increase | Low | Each process ~40MB, limit to 5 concurrent |
| IPC communication failure | Medium | Timeout + error handling + retry logic |
| Worker crash | Low | Isolated crashes, user gets error message |

---

## Testing Plan

1. **Unit tests**: Worker message handling, process pool queue
2. **Integration tests**: Full sync flow with child process
3. **Load tests**: 10 concurrent syncs
4. **Stress tests**: User with 1000+ game library
5. **Manual testing**: Run /sync while using other commands

---

## Estimated Time: 5-7 hours

**Breakdown:**
- Implementation: 4-6 hours
- Testing: 1 hour
- Code review adjustments: Variable

---

**Assignee**: @Vulps22
**Labels**: bug, performance, enhancement
