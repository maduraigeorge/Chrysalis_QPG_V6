import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

// Using any to bypass strict module typing issues in the build pipeline
const app: any = (express as any)();
const PORT = process.env.PORT || 3000;

app.use((helmet as any)() as any);
app.use((cors as any)() as any);
app.use((morgan as any)('combined') as any);
app.use((express as any).json() as any);

app.get('/api/health', (req: any, res: any) => res.json({ status: 'ok' }));

app.get('/api/lessons', async (req: any, res: any) => {
  try {
    const { subject, grade } = req.query;
    const rows = await db.query('SELECT * FROM lessons WHERE subject = ? AND grade = ?', [subject, grade]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/learning-outcomes', async (req: any, res: any) => {
  try {
    const { lessonIds } = req.query;
    if (!lessonIds) return res.json([]);
    const ids = (lessonIds as string).split(',');
    const placeholders = ids.map(() => '?').join(',');
    const rows = await db.query(`SELECT * FROM learning_outcomes WHERE lesson_id IN (${placeholders})`, ids);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/questions', async (req: any, res: any) => {
  try {
    const { subject, grade, lessonIds } = req.query;
    let sql = 'SELECT * FROM questions WHERE subject = ? AND grade = ?';
    const params: any[] = [subject || '', grade || ''];
    if (lessonIds) {
      const ids = (lessonIds as string).split(',');
      sql += ` AND lesson_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids);
    }
    const rows = await db.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/questions', async (req: any, res: any) => {
  try {
    const q = req.body;
    if (q.id) {
      await db.execute(
        'UPDATE questions SET question_text = ?, answer_key = ?, marks = ?, difficulty = ?, image_url = ? WHERE id = ?',
        [q.question_text, q.answer_key, q.marks, q.difficulty, q.image_url, q.id]
      );
      res.json(q);
    } else {
      const result = (await db.execute(
        'INSERT INTO questions (subject, grade, lesson_id, question_type, marks, question_text, answer_key, image_url, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [q.subject, q.grade, q.lesson_id, q.question_type, q.marks, q.question_text, q.answer_key, q.image_url, q.difficulty]
      )) as any;
      res.json({ ...q, id: result.insertId });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));