import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.DB_HOST && process.env.DB_HOST.length > 0;

export interface DBInterface {
  query(sql: string, params?: any[]): Promise<any>;
  execute(sql: string, params?: any[]): Promise<any>;
}

// MySQL Implementation
class MySQLDB implements DBInterface {
  private pool: mysql.Pool;

  constructor() {
    console.log('🚀 Connecting to MySQL/RDS...');
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
  }

  async query(sql: string, params?: any[]) {
    const [rows] = await this.pool.query(sql, params);
    return rows;
  }

  async execute(sql: string, params?: any[]) {
    const [result] = await this.pool.execute(sql, params);
    return result;
  }
}

// In-Memory Mock Implementation for AI Studio Preview
class MockDB implements DBInterface {
  private storage: Record<string, any[]> = {
    lessons: [],
    learning_outcomes: [],
    questions: []
  };

  constructor() {
    console.log('⚠️ No DB_HOST found. Using Mock In-Memory Database.');
  }

  async query(sql: string, params: any[] = []) {
    // Basic mock routers for preview functionality
    if (sql.includes('SELECT * FROM lessons')) return this.storage.lessons;
    if (sql.includes('SELECT * FROM questions')) return this.storage.questions;
    return [];
  }

  async execute(sql: string, params: any[] = []) {
    // Minimal mock for INSERTs
    return { insertId: Date.now() };
  }
}

export const db: DBInterface = isProduction ? new MySQLDB() : new MockDB();