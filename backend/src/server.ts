import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Middleware
// Fix: cast middleware to any to resolve Express type mismatch errors
app.use(helmet() as any);
// Fix: cast middleware to any to resolve Express type mismatch errors
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://test.chrysalis.world'] 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}) as any);
// Fix: cast middleware to any to resolve Express type mismatch errors
app.use(morgan('combined') as any);
// Fix: cast middleware to any to resolve Express type mismatch errors
app.use(express.json() as any);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Example Lessons Route (Ported from user logic)
app.get('/api/lessons', async (req, res) => {
  try {
    const { subject, grade } = req.query;
    const rows = await db.query(
      'SELECT * FROM lessons WHERE subject = ? AND grade = ?',
      [subject || '', grade || '']
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Example Questions Route
app.get('/api/questions', async (req, res) => {
  try {
    const { subject, grade } = req.query;
    const rows = await db.query(
      'SELECT * FROM questions WHERE subject = ? AND grade = ?',
      [subject || '', grade || '']
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Startup
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// Graceful Shutdown
// Fix: cast process to any to resolve 'Property on does not exist on type Process' error in environments with incomplete Node.js typings
(process as any).on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});