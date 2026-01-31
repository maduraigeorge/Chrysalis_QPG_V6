
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

let pool: mysql.Pool | null = null;

export const db = {
  async query(sql: string, params?: any[]) {
    if (!pool) pool = mysql.createPool(config);
    const [rows] = await pool.query(sql, params);
    return rows;
  },
  async execute(sql: string, params?: any[]) {
    if (!pool) pool = mysql.createPool(config);
    const [result] = await pool.execute(sql, params);
    return result;
  }
};
