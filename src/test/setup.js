/**
 * Jest setup file for test environment configuration
 */

// Set up test environment variables before any modules are loaded
process.env.NODE_ENV = 'test';

// Mock the database module entirely to prevent it from executing
jest.mock('../lib/database.js', () => {
    return {
        Database: jest.fn().mockImplementation(() => ({
            query: jest.fn().mockResolvedValue([]),
            getConnection: jest.fn().mockResolvedValue({}),
            releaseConnection: jest.fn(),
            insert: jest.fn().mockResolvedValue({ insertId: 1 }),
            update: jest.fn().mockResolvedValue({ affectedRows: 1 }),
            delete: jest.fn().mockResolvedValue({ affectedRows: 1 })
        })),
        getInstance: jest.fn().mockReturnValue({
            query: jest.fn().mockResolvedValue([]),
            getConnection: jest.fn().mockResolvedValue({}),
            releaseConnection: jest.fn(),
            insert: jest.fn().mockResolvedValue({ insertId: 1 }),
            update: jest.fn().mockResolvedValue({ affectedRows: 1 }),
            delete: jest.fn().mockResolvedValue({ affectedRows: 1 })
        })
    };
});

// Mock other environment-dependent modules
jest.mock('../provider/clientProvider.js', () => ({
    clientProvider: {
        getClient: jest.fn().mockReturnValue(null),
        setClient: jest.fn()
    }
}));

// Mock console methods to reduce noise in test output
const originalError = console.error;
const originalLog = console.log;

// Only mock console methods if not running in verbose mode
if (!process.argv.includes('--verbose')) {
    console.error = (...args) => {
        // Allow certain error messages through for debugging
        const message = args[0];
        if (typeof message === 'string' &&
            (message.includes('FATAL ERROR') ||
             message.includes('Failed to') ||
             message.includes('Error during') ||
             message.includes('Full error'))) {
            // These are expected test errors, suppress them
            return;
        }
        originalError.apply(console, args);
    };

    console.log = (...args) => {
        const message = args[0];
        if (typeof message === 'string' &&
            (message.includes('initializing') ||
             message.includes('initialized') ||
             message.includes('called with') ||
             message.includes('found users') ||
             message.includes('Fetched user'))) {
            // These are service logging messages, suppress them in tests
            return;
        }
        originalLog.apply(console, args);
    };
}
