import { Question, Lesson, LearningOutcome } from './types';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

export const apiService = {
  async getLessons(subject: string, grade: string): Promise<Lesson[]> {
    const res = await fetch(`${API_BASE}/lessons?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`);
    return res.json();
  },

  async getQuestions(filters: any): Promise<Question[]> {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE}/questions?${query}`);
    return res.json();
  },

  async initDatabase() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  }
  // ... other methods follow the same pattern
};