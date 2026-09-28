const mysql = require('mysql2/promise');
require('dotenv').config();

// Connection pool — reused across all requests.
// Using a pool (not a single connection) is what lets us safely run
// "SELECT ... FOR UPDATE" transactions for concurrency-safe slot allocation.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
