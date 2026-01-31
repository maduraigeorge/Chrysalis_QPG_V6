
import { Question, Lesson, LearningOutcome } from './types';

const API_BASE = process.env.REACT_APP_API_URL || '';
const IS_PROD = !!process.env.REACT_APP_API_URL;

// Local Storage Keys for Fallback
const KEYS = {
  LESSONS: 'qpg_lessons',
  LOS: 'qpg_los',
  QUESTIONS: 'qpg_questions'
};

const getStore = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveStore = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const apiService = {
  async initDatabase() {
    if (IS_PROD) {
      const res = await fetch(`${API_BASE}/health`);
      return res.json();
    }
    return { status: 'mock_online' };
  },

  async getLessons(subject: string, grade: string): Promise<Lesson[]> {
    if (IS_PROD) {
      const res = await fetch(`${API_BASE}/lessons?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`);
      return res.json();
    }
    const all = getStore<Lesson>(KEYS.LESSONS);
    return all.filter(l => l.subject === subject && l.grade === grade);
  },

  async getLearningOutcomes(lessonIds: number[]): Promise<LearningOutcome[]> {
    if (IS_PROD) {
      const res = await fetch(`${API_BASE}/learning-outcomes?lessonIds=${lessonIds.join(',')}`);
      return res.json();
    }
    const all = getStore<LearningOutcome>(KEYS.LOS);
    return all.filter(lo => lessonIds.includes(lo.lesson_id));
  },

  async getQuestions(filters: { subject: string; grade: string; lessonIds: number[]; loIds: number[] }): Promise<Question[]> {
    if (IS_PROD) {
      const query = new URLSearchParams({
        subject: filters.subject,
        grade: filters.grade,
        lessonIds: filters.lessonIds.join(','),
        loIds: filters.loIds.join(',')
      }).toString();
      const res = await fetch(`${API_BASE}/questions?${query}`);
      return res.json();
    }
    const allQs = getStore<Question>(KEYS.QUESTIONS);
    return allQs.filter(q => 
      q.subject === filters.subject && 
      q.grade === filters.grade &&
      (filters.lessonIds.length === 0 || filters.lessonIds.includes(q.lesson_id))
    );
  },

  async createQuestion(data: any): Promise<Question> {
    if (IS_PROD) {
      const res = await fetch(`${API_BASE}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    }
    const all = getStore<Question>(KEYS.QUESTIONS);
    const newQ = { ...data, id: data.id || Date.now() };
    if (data.id) {
      saveStore(KEYS.QUESTIONS, all.map(q => q.id === data.id ? newQ : q));
    } else {
      saveStore(KEYS.QUESTIONS, [...all, newQ]);
    }
    return newQ;
  }
};
