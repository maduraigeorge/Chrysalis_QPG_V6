import { getPool } from './db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const pool = getPool();
    if (req.method === 'GET') {
      const { subject, grade, lessonIds, loIds } = req.query;
      let query = `
        SELECT q.*, l.title as lesson_title, lo.description as lo_description 
        FROM questions q 
        LEFT JOIN lessons l ON q.lesson_id = l.id 
        LEFT JOIN learning_outcomes lo ON q.learning_outcome_id = lo.id 
        WHERE q.subject = ? AND q.grade = ?
      `;
      const params: any[] = [subject || '', grade || ''];

      if (lessonIds) {
        const ids = (lessonIds as string).split(',').filter(id => id.trim());
        if (ids.length) {
          query += ` AND q.lesson_id IN (${ids.map(() => '?').join(',')})`;
          params.push(...ids);
        }
      }

      if (loIds) {
        const ids = (loIds as string).split(',').filter(id => id.trim());
        if (ids.length) {
          query += ` AND q.learning_outcome_id IN (${ids.map(() => '?').join(',')})`;
          params.push(...ids);
        }
      }

      const [rows] = await pool.execute(query, params);
      return res.json(rows);
    }
    if (req.method === 'POST') {
      const { 
        subject, grade, lesson_id, learning_outcome_id, 
        question_type, marks, question_text, answer_key, image_url, difficulty 
      } = req.body;
      const [result]: any = await pool.execute(
        `INSERT INTO questions 
        (subject, grade, lesson_id, learning_outcome_id, question_type, marks, question_text, answer_key, image_url, difficulty) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [subject, grade, lesson_id, learning_outcome_id, question_type, marks, question_text, answer_key, image_url, difficulty || 1]
      );
      return res.status(201).json({ id: result.insertId, ...req.body });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}