import { getPool } from './db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const pool = getPool();
    if (req.method === 'GET') {
      const { subject, grade } = req.query;
      const [rows] = await pool.execute(
        'SELECT * FROM lessons WHERE subject = ? AND grade = ?',
        [subject || '', grade || '']
      );
      return res.json(rows);
    }
    if (req.method === 'POST') {
      const { subject, grade, title } = req.body;
      const [result]: any = await pool.execute(
        'INSERT INTO lessons (subject, grade, title) VALUES (?, ?, ?)',
        [subject, grade, title]
      );
      return res.status(201).json({ id: result.insertId, subject, grade, title });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}