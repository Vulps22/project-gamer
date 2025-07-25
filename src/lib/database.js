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

        // --- Use process.env directly ---
        // These MUST come from your .env file or system environment variables.
        const dbHost = process.env.DB_HOST;
        const dbPort = process.env.DB_PORT;
        const dbUser = process.env.DB_USER;
        const dbPassword = process.env.DB_PASS;
        const dbName = process.env.DB_NAME;

        if (!dbHost || !dbUser || !dbPassword || !dbName || !dbPort) {
            console.error('FATAL ERROR: Database environment variables (DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME) are not set.');
            process.exit(1);
        }
        // --------------------------------

        this.pool = mysql.createPool({
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPassword,
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            namedPlaceholders: true // <-- ADD THIS LINE

            // Add timezone or other settings if needed
        });

        console.log('Database pool created.');

        // --- Singleton Pattern ---
        // Store this instance for future calls.
        Database.instance = this;
        // -------------------------
    }

    /**
     * Tests the database connection pool.
     * @returns {Promise<boolean>}
     */
    async testConnection() {
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
     * @returns {Promise<mysql.PoolConnection>}
     */
    async getConnection() {
        return this.pool.getConnection();
    }

    /**
     * Runs any SQL query using prepared statements.
     * Can run on the main pool or on a specific connection for transactions.
     * @param {string} sql - The SQL query with ? or :named placeholders.
     * @param {Array<any>|object} [params] - Parameters to substitute.
     * @param {mysql.PoolConnection} [connection] - An optional connection for transactions.
     * @returns {Promise<any>}
     */
    async query(sql, params = [], connection = null) {
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
     * Selects data from a table. Basic version.
     * @param {string} table
     * @param {string} [columns]
     * @param {string} [where] - e.g., 'id = ? AND status = ?'
     * @param {Array<any>} [params]
     * @returns {Promise<Array<object>>}
     */
    async select(table, columns = '*', where = '', params = []) {
        // DANGER: Ensure 'table' and 'columns' are NOT from user input without validation.
        const sql = `SELECT ${columns} FROM \`${table}\` ${where ? 'WHERE ' + where : ''}`;
        return this.query(sql, params);
    }

    /**
     * Inserts data into a table.
     * @param {string} table
     * @param {object} data - e.g., { name: 'Test', value: 123 }
     * @param {mysql.PoolConnection} [connection] - An optional connection for transactions.
     * @returns {Promise<number>} - The insertId.
     */
    async insert(table, data, connection = null) {
        const columns = Object.keys(data).map(col => `\`${col}\``).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);
        const sql = `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`;
        const result = await this.query(sql, values, connection);
        return result.insertId;
    }

    /**
     * Updates data in a table.
     * @param {string} table
     * @param {object} data - The fields to update.
     * @param {string} where - The WHERE clause (e.g., 'id = ?').
     * @param {Array<any>} params - Parameters for the WHERE clause.
     * @param {mysql.PoolConnection} [connection] - An optional connection for transactions.
     * @returns {Promise<number>} - Number of affected rows.
     */
    async update(table, data, where, params = [], connection = null) {
        const updates = Object.keys(data).map(col => `\`${col}\` = ?`).join(', ');
        const values = [...Object.values(data), ...params];
        const sql = `UPDATE \`${table}\` SET ${updates} WHERE ${where}`;
        const result = await this.query(sql, values, connection);
        return result.affectedRows;
    }

    /**
     * Deletes data from a table.
     * @param {string} table
     * @param {string} where - The WHERE clause (e.g., 'id = ?').
     * @param {Array<any>} params - Parameters for the WHERE clause.
     * @param {mysql.PoolConnection} [connection] - An optional connection for transactions.
     * @returns {Promise<number>} - Number of affected rows.
     */
    async delete(table, where, params = [], connection = null) {
        const sql = `DELETE FROM \`${table}\` WHERE ${where}`;
        const result = await this.query(sql, params, connection);
        return result.affectedRows;
    }

    /**
     * Closes the database connection pool. Call on graceful shutdown.
     */
    async close() {
        await this.pool.end();
        console.log('Database pool closed.');
    }
}

// Export a single instance (Singleton Pattern)
const db = new Database();
module.exports = db;