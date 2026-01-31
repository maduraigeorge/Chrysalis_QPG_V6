import { getPool } from './db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const pool = getPool();
    if (req.method === 'GET') {
      const { lessonIds } = req.query;
      if (!lessonIds) return res.json([]);
      const ids = (lessonIds as string).split(',').filter(id => id.trim());
      if (ids.length === 0) return res.json([]);
      const placeholders = ids.map(() => '?').join(',');
      const [rows] = await pool.execute(
        `SELECT * FROM learning_outcomes WHERE lesson_id IN (${placeholders})`,
        ids
      );
      return res.json(rows);
    }
    if (req.method === 'POST') {
      const { lesson_id, description } = req.body;
      const [result]: any = await pool.execute(
        'INSERT INTO learning_outcomes (lesson_id, description) VALUES (?, ?)',
        [lesson_id, description]
      );
      return res.status(201).json({ id: result.insertId, lesson_id, description });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}