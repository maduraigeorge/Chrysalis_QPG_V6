import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Production CORS Configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Database Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

// Middleware to verify DB connection
app.use(async (req, res, next) => {
  if (req.path === '/health' || req.path === '/api/status') return next();
  try {
    await pool.query('SELECT 1');
    next();
  } catch (err) {
    res.status(503).json({ error: 'DATABASE_OFFLINE', message: 'Unable to connect to database.' });
  }
});

// --- API ENDPOINTS ---

// 1. Lessons
app.get('/api/lessons', async (req, res) => {
  const { subject, grade } = req.query;
  try {
    const [rows] = await pool.execute(
      'SELECT id, subject, grade, title FROM lessons WHERE subject = ? AND grade = ?',
      [subject || '', grade || '']
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lessons', async (req, res) => {
  const { subject, grade, title } = req.body;
  if (!subject || !grade || !title) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const [result] = await pool.execute(
      'INSERT INTO lessons (subject, grade, title) VALUES (?, ?, ?)',
      [subject, grade, title]
    );
    res.status(201).json({ id: result.insertId, subject, grade, title });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Learning Outcomes
app.get('/api/learning-outcomes', async (req, res) => {
  const { lessonIds } = req.query;
  if (!lessonIds) return res.json([]);
  const ids = lessonIds.split(',').filter(id => id.trim());
  if (ids.length === 0) return res.json([]);
  try {
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT * FROM learning_outcomes WHERE lesson_id IN (${placeholders})`,
      ids
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/learning-outcomes', async (req, res) => {
  const { lesson_id, description } = req.body;
  if (!lesson_id || !description) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const [result] = await pool.execute(
      'INSERT INTO learning_outcomes (lesson_id, description) VALUES (?, ?)',
      [lesson_id, description]
    );
    res.status(201).json({ id: result.insertId, lesson_id, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Questions
app.get('/api/questions', async (req, res) => {
  const { subject, grade, lessonIds, loIds } = req.query;
  try {
    let query = `
      SELECT q.*, l.title as lesson_title, lo.description as lo_description 
      FROM questions q 
      LEFT JOIN lessons l ON q.lesson_id = l.id 
      LEFT JOIN learning_outcomes lo ON q.learning_outcome_id = lo.id 
      WHERE q.subject = ? AND q.grade = ?
    `;
    const params = [subject || '', grade || ''];

    if (lessonIds) {
      const ids = lessonIds.split(',').filter(id => id.trim());
      if (ids.length) {
        query += ` AND q.lesson_id IN (${ids.map(() => '?').join(',')})`;
        params.push(...ids);
      }
    }

    if (loIds) {
      const ids = loIds.split(',').filter(id => id.trim());
      if (ids.length) {
        query += ` AND q.learning_outcome_id IN (${ids.map(() => '?').join(',')})`;
        params.push(...ids);
      }
    }

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/questions', async (req, res) => {
  const { subject, grade, lesson_id, learning_outcome_id, question_type, marks, question_text, answer_key, image_url, difficulty } = req.body;
  if (!subject || !grade || !lesson_id || !question_text) return res.status(400).json({ error: 'Missing core question data' });
  try {
    const [result] = await pool.execute(
      `INSERT INTO questions 
      (subject, grade, lesson_id, learning_outcome_id, question_type, marks, question_text, answer_key, image_url, difficulty) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [subject, grade, lesson_id, learning_outcome_id, question_type, marks, question_text, answer_key, image_url, difficulty || 1]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. System Status & Init
app.get('/api/status', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({ 
      status: 'online', 
      database: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/init-db', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.execute(`CREATE TABLE IF NOT EXISTS lessons (id INT AUTO_INCREMENT PRIMARY KEY, subject VARCHAR(100), grade VARCHAR(50), title VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await connection.execute(`CREATE TABLE IF NOT EXISTS learning_outcomes (id INT AUTO_INCREMENT PRIMARY KEY, lesson_id INT, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await connection.execute(`CREATE TABLE IF NOT EXISTS questions (id INT AUTO_INCREMENT PRIMARY KEY, subject VARCHAR(100), grade VARCHAR(50), lesson_id INT, learning_outcome_id INT, question_type VARCHAR(50), marks INT, question_text TEXT, answer_key TEXT, image_url TEXT, difficulty INT DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    connection.release();
    res.json({ success: true, message: 'Schema verified' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[Production API] Running on http://0.0.0.0:${port}`);
});