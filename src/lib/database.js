const mysql = require('mysql2/promise');
const config
class Database {
  constructor() {

    config = process.env

    this.pool = mysql.createPool({
      host: config.host || '127.0.0.1',
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // Add timezone or other settings if needed
    });
    console.log("Database pool created.");
  }

  // You might not even need an explicit connect/disconnect
  // as the pool handles it, but you can add tests.
  async testConnection() {
      try {
          const [rows] = await this.pool.query('SELECT 1');
          console.log("Database connection successful.");
          return true;
      } catch (error) {
          console.error("Database connection failed:", error);
          return false;
      }
  }

  /**
   * Runs any SQL query with prepared statements.
   * @param {string} sql - The SQL query with ? placeholders.
   * @param {Array} params - An array of parameters to substitute.
   * @returns {Promise<[Array, any]>} - Returns [rows, fields]
   */
  async query(sql, params = []) {
    try {
      const [rows, fields] = await this.pool.execute(sql, params);
      return rows; // Usually, you just want the rows
    } catch (error) {
      console.error("SQL Error:", error.message);
      console.error("SQL Query:", sql);
      console.error("SQL Params:", params);
      throw error; // Re-throw the error so calling code can handle it
    }
  }

  /**
   * A simple select helper.
   * NOTE: Building these helpers securely requires careful handling
   * of table/column names (they CANNOT be replaced by '?' placeholders).
   * Often, using db.query() is safer unless the wrapper is very robust.
   * This is a VERY basic example.
   */
  async select(table, columns = '*', where = '', params = []) {
      // DANGER: Building SQL like this needs validation/whitelisting
      // of 'table' and 'columns' to prevent injection if they come from user input.
      // 'where' should be like 'id = ? AND name = ?'
      const sql = `SELECT ${columns} FROM \`${table}\` ${where ? 'WHERE ' + where : ''}`;
      return this.query(sql, params);
  }

  async insert(table, data) {
      const columns = Object.keys(data).map(col => `\`${col}\``).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      const sql = `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`;
      const result = await this.query(sql, values);
      return result.insertId; // Return the ID of the new row
  }

  async update(table, data, where, params = []) {
      const updates = Object.keys(data).map(col => `\`${col}\` = ?`).join(', ');
      const values = [...Object.values(data), ...params];
      const sql = `UPDATE \`${table}\` SET ${updates} WHERE ${where}`;
      const result = await this.query(sql, values);
      return result.affectedRows; // Return number of affected rows
  }

   async delete(table, where, params = []) {
      const sql = `DELETE FROM \`${table}\` WHERE ${where}`;
      const result = await this.query(sql, params);
      return result.affectedRows; // Return number of affected rows
  }

  // Call this when your application exits gracefully
  async close() {
    await this.pool.end();
    console.log("Database pool closed.");
  }
}

// Example Usage:
// const dbConfig = { /* load from .env */ };
// const db = new Database(dbConfig);
// async function main() {
//    const users = await db.select('users', '*', 'id > ?', [5]);
//    console.log(users);
//    await db.close();
// }
// main();