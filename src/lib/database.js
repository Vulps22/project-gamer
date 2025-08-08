const mysql = require('mysql2/promise');
// Make sure dotenv is loaded to access process.env
// It's often best to load this ONCE at the very top of your app.js,
// but including it here provides a fallback.
require('dotenv').config();

class Database {
    constructor() {
        // --- Singleton Pattern ---
        // If an instance already exists, return it instead of creating a new one.
        if (Database.instance) {return Database.instance;}
        // -------------------------

        // --- Instance Variables ---
        this.isMigrating = false; // Toggle for migration mode
        this.pool = null; // Will be initialized when needed
        // -------------------------

        // --- Singleton Pattern ---
        // Store this instance for future calls.
        Database.instance = this;
        // -------------------------
    }

    /**
     * Sets the migration mode and reinitializes the connection pool with appropriate credentials.
     * @param {boolean} migrating - True to use migration credentials, false for regular bot credentials
     */
    async setMigrating(migrating) {
        // Close existing pool if it exists
        if (this.pool) {
            await this.pool.end();
            console.log('Closed existing database pool.');
        }

        this.isMigrating = migrating;
        this.pool = this._createPool();

        const modeText = migrating ? 'migration' : 'bot';
        console.log(`Database pool created in ${modeText} mode.`);
    }

    /**
     * Gets the appropriate database credentials based on current mode.
     * @returns {object} Database connection credentials
     */
    getCredentials() {
        const dbHost = process.env.DB_HOST;
        const dbPort = process.env.DB_PORT;
        const dbName = process.env.DB_NAME;

        let dbUser, dbPassword;

        if (this.isMigrating) {
            // Use migration credentials (with fallback to regular credentials)
            dbUser = process.env.DB_MIGRATION_USER || process.env.DB_USER;
            dbPassword = process.env.DB_MIGRATION_PASS || process.env.DB_PASS;
        } else {
            // Use regular bot credentials
            dbUser = process.env.DB_USER;
            dbPassword = process.env.DB_PASS;
        }

        if (!dbHost || !dbUser || !dbPassword || !dbName || !dbPort) {
            const mode = this.isMigrating ? 'migration' : 'bot';
            console.error(`FATAL ERROR: Database environment variables for ${mode} mode are not set.`);
            console.error('Required:', this.isMigrating ?
                'DB_HOST, DB_PORT, DB_MIGRATION_USER, DB_MIGRATION_PASS, DB_NAME' :
                'DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME');
            process.exit(1);
        }

        return { dbHost, dbPort, dbUser, dbPassword, dbName };
    }

    /**
     * Creates a new connection pool with current credentials.
     * @returns {mysql.Pool} MySQL connection pool
     * @private
     */
    _createPool() {
        const { dbHost, dbPort, dbUser, dbPassword, dbName } = this.getCredentials();

        return mysql.createPool({
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPassword,
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            namedPlaceholders: true,
            multipleStatements: true // Required for schema files with multiple statements
        });
    }

    /**
     * Ensures the database pool is initialized. Creates it if it doesn't exist.
     * @private
     */
    _ensurePool() {
        if (!this.pool) {
            this.pool = this._createPool();
            const modeText = this.isMigrating ? 'migration' : 'bot';
            console.log(`Database pool created in ${modeText} mode.`);
        }
    }

    /**
     * Tests the database connection pool.
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
        this._ensurePool();
        try {
            // Get a connection and immediately release it.
            const connection = await this.pool.getConnection();
            await connection.query('SELECT 1');
            connection.release();
            console.log('Database connection successful.');
            return true;
        } catch (error) {
            console.error('Database connection failed:', error);
            return false;
        }
    }


    /**
     * Gets a single connection from the pool. This is the first step for any transaction.
     * The connection MUST be released manually using connection.release().
     * @returns {Promise<object>} Database connection
     */
    async getConnection() {
        this._ensurePool();
        return this.pool.getConnection();
    }

    /**
     * Runs any SQL query using prepared statements.
     * Can run on the main pool or on a specific connection for transactions.
     * @param {string} sql - The SQL query with ? or :named placeholders.
     * @param {Array<any>|object} [params] - Parameters to substitute.
     * @param {object} [connection] - An optional connection for transactions.
     * @returns {Promise<any>} Query results
     */
    async query(sql, params = [], connection = null) {
        this._ensurePool();
        const executor = connection || this.pool;
        try {
            const [rows] = await executor.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('SQL Error:', error.message);
            console.error('SQL Query:', sql);
            console.error('SQL Params:', params);
            throw error;
        }
    }

    /**
     * Executes multiple SQL statements (for schema files).
     * Uses .query() instead of .execute() to support multiple statements.
     * @param {string} sql - The SQL containing multiple statements.
     * @returns {Promise<any>} Query results
     */
    async queryMultiple(sql) {
        this._ensurePool();
        try {
            const [rows] = await this.pool.query(sql);
            return rows;
        } catch (error) {
            console.error('SQL Error:', error.message);
            console.error('SQL Query:', sql);
            throw error;
        }
    }

    /**
     * Selects data from a table. Basic version.
     * @param {string} table - Table name
     * @param {string} [columns] - Columns to select
     * @param {string} [where] - e.g., 'id = ? AND status = ?'
     * @param {Array<any>} [params] - Parameters for WHERE clause
     * @returns {Promise<Array<object>>} Query results
     */
    async select(table, columns = '*', where = '', params = []) {
        this._ensurePool();
        // DANGER: Ensure 'table' and 'columns' are NOT from user input without validation.
        const sql = `SELECT ${columns} FROM \`${table}\` ${where ? 'WHERE ' + where : ''}`;
        return this.query(sql, params);
    }

    /**
     * Inserts data into a table.
     * @param {string} table - Table name
     * @param {object} data - e.g., { name: 'Test', value: 123 }
     * @param {object} [connection] - An optional connection for transactions.
     * @returns {Promise<number>} - The insertId.
     */
    async insert(table, data, connection = null) {
        this._ensurePool();
        const columns = Object.keys(data).map(col => `\`${col}\``).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);
        const sql = `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`;
        const result = await this.query(sql, values, connection);
        return result.insertId;
    }

    /**
     * Updates data in a table.
     * @param {string} table - Table name
     * @param {object} data - The fields to update.
     * @param {string} where - The WHERE clause (e.g., 'id = ?').
     * @param {Array<any>} params - Parameters for the WHERE clause.
     * @param {object} [connection] - An optional connection for transactions.
     * @returns {Promise<number>} - Number of affected rows.
     */
    async update(table, data, where, params = [], connection = null) {
        this._ensurePool();
        const updates = Object.keys(data).map(col => `\`${col}\` = ?`).join(', ');
        const values = [...Object.values(data), ...params];
        const sql = `UPDATE \`${table}\` SET ${updates} WHERE ${where}`;
        const result = await this.query(sql, values, connection);
        return result.affectedRows;
    }

    /**
     * Deletes data from a table.
     * @param {string} table - Table name
     * @param {string} where - The WHERE clause (e.g., 'id = ?').
     * @param {Array<any>} params - Parameters for the WHERE clause.
     * @param {object} [connection] - An optional connection for transactions.
     * @returns {Promise<number>} - Number of affected rows.
     */
    async delete(table, where, params = [], connection = null) {
        this._ensurePool();
        const sql = `DELETE FROM \`${table}\` WHERE ${where}`;
        const result = await this.query(sql, params, connection);
        return result.affectedRows;
    }

    /**
     * Closes the database connection pool. Call on graceful shutdown.
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            console.log('Database pool closed.');
        }
    }
}

// Export a single instance (Singleton Pattern)
const db = new Database();
module.exports = db;