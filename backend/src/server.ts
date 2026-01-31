
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet() as any);
app.use(cors() as any);
app.use(morgan('combined') as any);
app.use(express.json() as any);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/lessons', async (req, res) => {
  const { subject, grade } = req.query;
  const rows = await db.query('SELECT * FROM lessons WHERE subject = ? AND grade = ?', [subject, grade]);
  res.json(rows);
});

app.get('/api/learning-outcomes', async (req, res) => {
  const { lessonIds } = req.query;
  if (!lessonIds) return res.json([]);
  const ids = (lessonIds as string).split(',');
  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.query(`SELECT * FROM learning_outcomes WHERE lesson_id IN (${placeholders})`, ids);
  res.json(rows);
});

app.get('/api/questions', async (req, res) => {
  const { subject, grade, lessonIds } = req.query;
  let sql = 'SELECT * FROM questions WHERE subject = ? AND grade = ?';
  const params: any[] = [subject, grade];
  if (lessonIds) {
    const ids = (lessonIds as string).split(',');
    sql += ` AND lesson_id IN (${ids.map(() => '?').join(',')})`;
    params.push(...ids);
  }
  const rows = await db.query(sql, params);
  res.json(rows);
});

app.post('/api/questions', async (req, res) => {
  const q = req.body;
  if (q.id) {
    // Update existing
    await db.execute(
      'UPDATE questions SET question_text = ?, answer_key = ?, marks = ?, difficulty = ?, image_url = ? WHERE id = ?',
      [q.question_text, q.answer_key, q.marks, q.difficulty, q.image_url, q.id]
    );
    res.json(q);
  } else {
    // Insert new
    const result = await db.execute(
      'INSERT INTO questions (subject, grade, lesson_id, question_type, marks, question_text, answer_key, image_url, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [q.subject, q.grade, q.lesson_id, q.question_type, q.marks, q.question_text, q.answer_key, q.image_url, q.difficulty]
    );
    res.json({ ...q, id: result.insertId });
  }
});

app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
