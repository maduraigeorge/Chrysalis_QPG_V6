
console.log("💾 [Module] apiService.ts: Loading API logic");
import { Question, Lesson, LearningOutcome } from './types.ts';

// Relative path for Nginx/Proxy compatibility
const API_BASE = '/api';

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

let useRealApi = false;

async function fetchWithTimeout(resource: string, options: any = { timeout: 2000 }) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), options.timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export const apiService = {
  async initDatabase() {
    console.log("📡 [Network] apiService: Probing backend status...");
    try {
      const response = await fetchWithTimeout(`${API_BASE}/status`);
      if (response && response.ok) {
        useRealApi = true;
        console.log("✅ [Network] apiService: Live MySQL Backend Active");
        return { status: 'online', mode: 'Live MySQL' };
      }
    } catch (e) {
      console.log("📴 [Network] apiService: Backend unreachable. Defaulting to Mock Mode (Browser Storage).");
    }
    
    useRealApi = false;
    if (getStore(KEYS.LESSONS).length === 0) {
      await this.seedData();
    }
    return { status: 'online', mode: 'Mock Mode' };
  },

  async getLessons(subject: string, grade: string): Promise<Lesson[]> {
    if (useRealApi) {
      try {
        const res = await fetch(`${API_BASE}/lessons?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`);
        return await res.json();
      } catch (e) { console.warn("API Error, using fallback"); }
    }
    return getStore<Lesson>(KEYS.LESSONS).filter(l => l.subject === subject && l.grade === grade);
  },

  async createLesson(data: any): Promise<Lesson> {
    if (useRealApi) {
      const res = await fetch(`${API_BASE}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    }
    const all = getStore<Lesson>(KEYS.LESSONS);
    const newL = { ...data, id: Date.now() };
    saveStore(KEYS.LESSONS, [...all, newL]);
    return newL;
  },

  async updateLesson(id: number, data: any): Promise<void> {
    if (useRealApi) {
      await fetch(`${API_BASE}/lessons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return;
    }
    const all = getStore<Lesson>(KEYS.LESSONS);
    saveStore(KEYS.LESSONS, all.map(l => l.id === id ? { ...l, ...data } : l));
  },

  async deleteLesson(id: number): Promise<void> {
    if (useRealApi) {
      await fetch(`${API_BASE}/lessons/${id}`, { method: 'DELETE' });
      return;
    }
    const all = getStore<Lesson>(KEYS.LESSONS);
    saveStore(KEYS.LESSONS, all.filter(l => l.id !== id));
  },

  async getLearningOutcomes(lessonIds: number[]): Promise<LearningOutcome[]> {
    if (useRealApi) {
      try {
        const res = await fetch(`${API_BASE}/learning-outcomes?lessonIds=${lessonIds.join(',')}`);
        return await res.json();
      } catch (e) { console.warn("API Error, using fallback"); }
    }
    return getStore<LearningOutcome>(KEYS.LOS).filter(lo => lessonIds.includes(lo.lesson_id));
  },

  async createLearningOutcome(data: any): Promise<LearningOutcome> {
    if (useRealApi) {
      const res = await fetch(`${API_BASE}/learning-outcomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    }
    const all = getStore<LearningOutcome>(KEYS.LOS);
    const newLO = { ...data, id: Date.now() };
    saveStore(KEYS.LOS, [...all, newLO]);
    return newLO;
  },

  async updateLearningOutcome(id: number, data: any): Promise<void> {
    if (useRealApi) {
      await fetch(`${API_BASE}/learning-outcomes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return;
    }
    const all = getStore<LearningOutcome>(KEYS.LOS);
    saveStore(KEYS.LOS, all.map(lo => lo.id === id ? { ...lo, ...data } : lo));
  },

  async deleteLearningOutcome(id: number): Promise<void> {
    if (useRealApi) {
      await fetch(`${API_BASE}/learning-outcomes/${id}`, { method: 'DELETE' });
      return;
    }
    const all = getStore<LearningOutcome>(KEYS.LOS);
    saveStore(KEYS.LOS, all.filter(lo => lo.id !== id));
  },

  async getQuestions(filters: { subject: string; grade: string; lessonIds: number[]; loIds: number[] }): Promise<Question[]> {
    if (useRealApi) {
      try {
        const query = new URLSearchParams({
          subject: filters.subject,
          grade: filters.grade,
          lessonIds: filters.lessonIds.join(','),
          loIds: filters.loIds.join(',')
        }).toString();
        const res = await fetch(`${API_BASE}/questions?${query}`);
        return await res.json();
      } catch (e) { console.warn("API Error, using fallback"); }
    }
    const allQs = getStore<Question>(KEYS.QUESTIONS);
    return allQs.filter(q => 
      q.subject === filters.subject && 
      q.grade === filters.grade &&
      (filters.lessonIds.length === 0 || filters.lessonIds.includes(q.lesson_id)) &&
      (filters.loIds.length === 0 || filters.loIds.includes(q.learning_outcome_id))
    );
  },

  async createQuestion(data: any): Promise<Question> {
    if (useRealApi) {
      const res = await fetch(`${API_BASE}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    }
    const all = getStore<Question>(KEYS.QUESTIONS);
    const newQ = { ...data, id: Date.now() };
    saveStore(KEYS.QUESTIONS, [...all, newQ]);
    return newQ;
  },

  async updateQuestion(id: number, data: any): Promise<Question> {
    if (useRealApi) {
      const res = await fetch(`${API_BASE}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id })
      });
      return await res.json();
    }
    const all = getStore<Question>(KEYS.QUESTIONS);
    const updated = { ...data, id };
    saveStore(KEYS.QUESTIONS, all.map(q => q.id === id ? updated : q));
    return updated;
  },

  async deleteQuestion(id: number): Promise<void> {
    if (useRealApi) {
      await fetch(`${API_BASE}/questions/${id}`, { method: 'DELETE' });
      return;
    }
    const all = getStore<Question>(KEYS.QUESTIONS);
    saveStore(KEYS.QUESTIONS, all.filter(q => q.id !== id));
  },

  async seedData() {
    console.log("🌱 [System] apiService: Seeding Comprehensive Math Grade 1 Data");
    
    const lessons: Lesson[] = [
      { id: 10, subject: 'Mathematics', grade: 'Grade 1', title: 'Numbers & Counting' },
      { id: 11, subject: 'Mathematics', grade: 'Grade 1', title: 'Basic Addition' },
      { id: 12, subject: 'Mathematics', grade: 'Grade 1', title: 'Basic Subtraction' },
      { id: 13, subject: 'Mathematics', grade: 'Grade 1', title: 'Shapes & Space' },
      { id: 14, subject: 'Mathematics', grade: 'Grade 1', title: 'Time & Measurement' }
    ];

    const los: LearningOutcome[] = [];
    const questions: Question[] = [];
    const questionTypes = ['MCQ', 'True/False', 'Short Answer', 'Long Answer', 'Fill in the Blanks', 'Match the Following'];
    let loIdCounter = 100;
    let qIdCounter = 1000;

    lessons.forEach(lesson => {
      // 5 LOs per Lesson
      for (let i = 1; i <= 5; i++) {
        const loId = loIdCounter++;
        los.push({
          id: loId,
          lesson_id: lesson.id,
          description: `Skill ${i}: ${lesson.title} - Mastery Level ${i}`
        });

        // 5 Questions per Type per LO
        questionTypes.forEach(type => {
          for (let q = 1; q <= 5; q++) {
            questions.push({
              id: qIdCounter++,
              subject: 'Mathematics',
              grade: 'Grade 1',
              lesson_id: lesson.id,
              learning_outcome_id: loId,
              question_type: type,
              marks: type === 'Long Answer' ? 5 : type === 'Short Answer' ? 2 : 1,
              question_text: `Test Question ${q}: ${type} for ${lesson.title} - Skill ${i}. Can you solve this level ${q} problem?`,
              answer_key: `Sample Answer ${q}`,
              difficulty: (q % 3) + 1,
              image_url: null
            });
          }
        });
      }
    });

    // Keep the existing Grade 10 Math/Science data for compatibility
    const oldLessons: Lesson[] = [
      { id: 1, subject: 'Mathematics', grade: 'Grade 10', title: 'Algebra Foundations' },
      { id: 3, subject: 'Science', grade: 'Grade 10', title: 'Chemical Reactions' }
    ];
    const oldLOs: LearningOutcome[] = [
      { id: 1, lesson_id: 1, description: 'Solve quadratic equations' },
      { id: 3, lesson_id: 3, description: 'Balance chemical equations' }
    ];

    saveStore(KEYS.LESSONS, [...lessons, ...oldLessons]);
    saveStore(KEYS.LOS, [...los, ...oldLOs]);
    saveStore(KEYS.QUESTIONS, questions);
  }
};
