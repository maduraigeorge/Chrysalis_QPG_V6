
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database Pool
let pool;
try {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chrysalis_db',
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
} catch (e) {
  console.warn("MySQL not configured. API will return 503 for DB routes.");
}

const checkDb = async (req, res, next) => {
  try {
    if (!pool) throw new Error("No Pool");
    await pool.query('SELECT 1');
    next();
  } catch (err) {
    res.status(503).json({ error: 'DATABASE_OFFLINE' });
  }
};

app.get('/api/status', async (req, res) => {
  try {
    if (pool) await pool.query('SELECT 1');
    res.json({ status: 'online', database: pool ? 'connected' : 'unconfigured' });
  } catch (e) {
    res.status(200).json({ status: 'online', database: 'error' });
  }
});

app.get('/api/init-db', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'No DB' });
  try {
    const conn = await pool.getConnection();
    await conn.execute(`CREATE TABLE IF NOT EXISTS lessons (id INT AUTO_INCREMENT PRIMARY KEY, subject VARCHAR(100), grade VARCHAR(50), title VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await conn.execute(`CREATE TABLE IF NOT EXISTS learning_outcomes (id INT AUTO_INCREMENT PRIMARY KEY, lesson_id INT, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await conn.execute(`CREATE TABLE IF NOT EXISTS questions (id INT AUTO_INCREMENT PRIMARY KEY, subject VARCHAR(100), grade VARCHAR(50), lesson_id INT, learning_outcome_id INT, question_type VARCHAR(50), marks INT, question_text TEXT, answer_key TEXT, image_url TEXT, difficulty INT DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    conn.release();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// LESSONS
app.get('/api/lessons', checkDb, async (req, res) => {
  const { subject, grade } = req.query;
  const [rows] = await pool.execute('SELECT * FROM lessons WHERE subject = ? AND grade = ?', [subject || '', grade || '']);
  res.json(rows);
});

app.post('/api/lessons', checkDb, async (req, res) => {
  const { subject, grade, title } = req.body;
  const [result] = await pool.execute('INSERT INTO lessons (subject, grade, title) VALUES (?, ?, ?)', [subject, grade, title]);
  res.json({ id: result.insertId, subject, grade, title });
});

app.put('/api/lessons/:id', checkDb, async (req, res) => {
  const { title } = req.body;
  await pool.execute('UPDATE lessons SET title = ? WHERE id = ?', [title, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/lessons/:id', checkDb, async (req, res) => {
  await pool.execute('DELETE FROM lessons WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// OUTCOMES
app.get('/api/learning-outcomes', checkDb, async (req, res) => {
  const { lessonIds } = req.query;
  if (!lessonIds) return res.json([]);
  const ids = lessonIds.split(',');
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(`SELECT * FROM learning_outcomes WHERE lesson_id IN (${placeholders})`, ids);
  res.json(rows);
});

app.post('/api/learning-outcomes', checkDb, async (req, res) => {
  const { lesson_id, description } = req.body;
  const [result] = await pool.execute('INSERT INTO learning_outcomes (lesson_id, description) VALUES (?, ?)', [lesson_id, description]);
  res.json({ id: result.insertId, lesson_id, description });
});

// Added PUT for learning outcomes
app.put('/api/learning-outcomes/:id', checkDb, async (req, res) => {
  const { description } = req.body;
  await pool.execute('UPDATE learning_outcomes SET description = ? WHERE id = ?', [description, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/learning-outcomes/:id', checkDb, async (req, res) => {
  await pool.execute('DELETE FROM learning_outcomes WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// QUESTIONS
app.get('/api/questions', checkDb, async (req, res) => {
  const { subject, grade, lessonIds } = req.query;
  let sql = 'SELECT q.*, l.title as lesson_title FROM questions q LEFT JOIN lessons l ON q.lesson_id = l.id WHERE q.subject = ? AND q.grade = ?';
  const params = [subject || '', grade || ''];
  if (lessonIds) {
    const ids = lessonIds.split(',');
    sql += ` AND q.lesson_id IN (${ids.map(() => '?').join(',')})`;
    params.push(...ids);
  }
  const [rows] = await pool.execute(sql, params);
  res.json(rows);
});

app.post('/api/questions', checkDb, async (req, res) => {
  const q = req.body;
  if (q.id) {
    await pool.execute('UPDATE questions SET question_text=?, answer_key=?, marks=?, difficulty=?, image_url=? WHERE id=?', [q.question_text, q.answer_key, q.marks, q.difficulty, q.image_url, q.id]);
    res.json(q);
  } else {
    const [result] = await pool.execute('INSERT INTO questions (subject, grade, lesson_id, learning_outcome_id, question_type, marks, question_text, answer_key, image_url, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [q.subject, q.grade, q.lesson_id, q.learning_outcome_id, q.question_type, q.marks, q.question_text, q.answer_key, q.image_url, q.difficulty || 1]);
    res.json({ ...q, id: result.insertId });
  }
});

app.delete('/api/questions/:id', checkDb, async (req, res) => {
  await pool.execute('DELETE FROM questions WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Chrysalis Backend: http://localhost:${port}`);
});
