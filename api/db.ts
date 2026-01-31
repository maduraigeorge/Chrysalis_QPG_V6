import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool() {
  if (pool) return pool;

  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_SSL } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error('Database environment variables are missing. Please add DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME to your Vercel Project Settings.');
  }

  const useSSL = DB_SSL === 'true';

  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: parseInt(DB_PORT || '3306'),
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 10000,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  });

  return pool;
}