import { Question, Lesson, LearningOutcome } from './types';
import { SUBJECTS, GRADES, QUESTION_TYPES } from './constants';

const KEYS = {
  LESSONS: 'qpg_lessons',
  LOS: 'qpg_los',
  QUESTIONS: 'qpg_questions'
};

const getStore = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return [];
  }
};

const saveStore = <T>(key: string, data: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
};

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

const CONTENT_MAP: Record<string, any> = {
  'Mathematics': {
    low: { lesson: 'Counting and Numbers', lo: 'Identify and write numbers 1-20', q: 'How many fingers do you have on one hand?', a: '5' },
    mid: { lesson: 'Geometry Fundamentals', lo: 'Properties of polygons', q: 'What is the sum of interior angles of a pentagon?', a: '540 degrees' },
    high: { lesson: 'Advanced Calculus', lo: 'Derivatives and Integrals', q: 'Find the derivative of f(x) = 3x^2 + sin(x).', a: 'f\'(x) = 6x + cos(x)' }
  },
  'Science': {
    low: { lesson: 'Our Environment', lo: 'Identify natural resources', q: 'Name three sources of water in nature.', a: 'Rivers, Lakes, Oceans' },
    mid: { lesson: 'Energy & Motion', lo: 'Understand Kinetic Energy', q: 'Calculate the KE of a 2kg mass moving at 5m/s.', a: '25 Joules (KE = 0.5 * m * v^2)' },
    high: { lesson: 'Molecular Biology', lo: 'DNA Replication Mechanism', q: 'Describe the role of DNA Helicase in replication.', a: 'Unwinds the DNA double helix at the replication fork.' }
  },
  'English': {
    low: { lesson: 'Vocabulary Building', lo: 'Synonyms and Antonyms', q: 'What is a synonym for the word "happy"?', a: 'Joyful' },
    mid: { lesson: 'Grammar Mastery', lo: 'Active vs Passive Voice', q: 'Change this to passive: "The chef prepared a delicious meal."', a: 'A delicious meal was prepared by the chef.' },
    high: { lesson: 'Literature Criticism', lo: 'Post-Colonial Perspectives', q: 'Analyze the impact of colonial narratives in Heart of Darkness.', a: 'Dehumanization of the "other" to justify exploitation.' }
  },
  'History': {
    low: { lesson: 'Local Community', lo: 'Role of local leaders', q: 'Who is the current mayor of your city?', a: 'Varies by location' },
    mid: { lesson: 'The Silk Road', lo: 'Trade routes and cultural exchange', q: 'How did the Silk Road impact Chinese art in the Tang Dynasty?', a: 'Introduced Central Asian patterns and Hellenistic influences.' },
    high: { lesson: 'Modern Political Thought', lo: 'Evolution of Democracy', q: 'Critically examine the French Revolution\'s impact on modern republics.', a: 'Established popular sovereignty and universal rights.' }
  }
};

const MATH_G1_SPECIFIC = [
  { 
    title: 'Lesson 1: Counting to 20', 
    los: ['Identify numbers 1-10', 'Count objects in a group', 'Sequence numbers', 'Compare sets of objects', 'Write numerals'],
    questions: [
      { text: '[item1] Count the stars in the image below. How many can you find?', image: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?q=80&w=800&auto=format&fit=crop', answer: '10' },
      { text: '[item2] Which number comes after 7?', image: null, answer: '8' },
      { text: '[item3] Look at the fruits below. Circle the group that has MORE apples.', image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=800&auto=format&fit=crop', answer: 'The left group' },
      { text: '[item4] Draw 5 circles in the box.', image: null, answer: 'Student draws 5 circles' },
      { text: '[item5] Fill in the missing number: 1, 2, _, 4, 5.', image: null, answer: '3' }
    ]
  },
  { 
    title: 'Lesson 2: Simple Addition', 
    los: ['Adding with pictures', 'Simple number bonds', 'Summing single digits', 'Addition word problems', 'Using the plus sign'],
    questions: [
      { text: '[item6] 2 apples + 3 apples = ____ apples. Use the image to help you count.', image: 'https://images.unsplash.com/photo-1610397648930-477b8c7f0943?q=80&w=800&auto=format&fit=crop', answer: '5' },
      { text: '[item7] What is 1 plus 4?', image: null, answer: '5' },
      { text: '[item8] There are several birds on a tree. If 2 more fly in, how many birds are there in total?', image: 'https://images.unsplash.com/photo-1444464666168-49d633b867ad?q=80&w=800&auto=format&fit=crop', answer: 'Dependent on initial count' },
      { text: '[item9] 5 + 0 = ?', image: null, answer: '5' },
      { text: '[item10] Match the sum to the result: 2+2 is...', image: null, answer: '4' }
    ]
  }
];

const MARKS_DISTRIBUTION = [1, 2, 3, 5, 10];

export const apiService = {
  async getStatus() {
    return { 
      status: 'online', 
      mode: 'Local Storage', 
      storageUsed: JSON.stringify(localStorage).length,
      lessonCount: getStore(KEYS.LESSONS).length,
      loCount: getStore(KEYS.LOS).length,
      questionCount: getStore(KEYS.QUESTIONS).length
    };
  },

  async initDatabase() {
    const existingLessons = getStore(KEYS.LESSONS);
    if (existingLessons.length === 0) {
      await this.seedData();
    }
    return { success: true, message: 'Local storage initialized.' };
  },

  async clearAllData() {
    localStorage.removeItem(KEYS.LESSONS);
    localStorage.removeItem(KEYS.LOS);
    localStorage.removeItem(KEYS.QUESTIONS);
    return { success: true };
  },

  async seedData() {
    const lessons: Lesson[] = [];
    const los: LearningOutcome[] = [];
    const questions: any[] = [];

    let lessonIdCounter = 1;
    let loIdCounter = 1;
    let qIdCounter = 1;

    SUBJECTS.forEach((subject) => {
      GRADES.forEach((grade) => {
        const gradeNum = parseInt(grade.replace('Grade ', '')) || 1;
        const level = gradeNum <= 4 ? 'low' : gradeNum <= 8 ? 'mid' : 'high';
        const isMathG1 = subject === 'Mathematics' && grade === 'Grade 1';
        
        const context = CONTENT_MAP[subject] || { 
          low: { lesson: `Foundations of ${subject}`, lo: `Essential ${subject} skills`, q: `Introductory ${subject} task`, a: 'Standard Answer' },
          mid: { lesson: `Applied ${subject}`, lo: `Methodological ${subject} study`, q: `Analytical ${subject} problem`, a: 'Scientific Explanation' },
          high: { lesson: `Advanced ${subject}`, lo: `Theoretical ${subject} synthesis`, q: `Complex ${subject} evaluation`, a: 'Comprehensive Analysis' }
        };

        const currentContext = context[level];

        for (let l = 1; l <= 5; l++) {
          const currentLessonId = lessonIdCounter++;
          const lessonData = (isMathG1 && l <= 2) ? MATH_G1_SPECIFIC[l-1] : null;
          
          lessons.push({
            id: currentLessonId,
            subject,
            grade,
            title: lessonData ? lessonData.title : `${currentContext.lesson} - Unit ${l}`
          });

          for (let i = 1; i <= 5; i++) {
            const currentLoId = loIdCounter++;
            los.push({
              id: currentLoId,
              lesson_id: currentLessonId,
              description: lessonData ? lessonData.los[i-1] : `Outcome ${i}: Mastery of ${currentContext.lo.toLowerCase()}`
            });

            const questionsPerLO = (isMathG1 && l <= 2) ? 8 : 5;

            for (let j = 1; j <= questionsPerLO; j++) {
              const typeIndex = (currentLoId * questionsPerLO + j) % QUESTION_TYPES.length;
              const markIndex = (currentLoId * questionsPerLO + j) % MARKS_DISTRIBUTION.length;
              const type = QUESTION_TYPES[typeIndex];
              const marks = MARKS_DISTRIBUTION[markIndex];
              
              let qText = "";
              let imgUrl = null;
              let answerKey = "";

              if (lessonData) {
                const qObj = lessonData.questions[(j-1) % lessonData.questions.length];
                qText = qObj.text;
                imgUrl = qObj.image;
                answerKey = qObj.answer;
              } else {
                qText = `[item${qIdCounter}] ${currentContext.q}. Elaborate for ${grade} ${subject}.`;
                answerKey = currentContext.a;
              }

              questions.push({
                id: qIdCounter++,
                subject,
                grade,
                lesson_id: currentLessonId,
                learning_outcome_id: currentLoId,
                question_type: type,
                marks: marks,
                question_text: qText,
                answer_key: answerKey,
                image_url: imgUrl,
                difficulty: level === 'low' ? 1 : level === 'mid' ? 2 : 3,
                created_at: new Date().toISOString()
              });
            }
          }
        }
      });
    });

    saveStore(KEYS.LESSONS, lessons);
    saveStore(KEYS.LOS, los);
    saveStore(KEYS.QUESTIONS, questions);
    return { success: true };
  },

  async getLessons(subject: string, grade: string): Promise<Lesson[]> {
    await delay(100);
    const all = getStore<Lesson>(KEYS.LESSONS);
    return all.filter(l => l.subject === subject && l.grade === grade);
  },

  async getLearningOutcomes(lessonIds: number[]): Promise<LearningOutcome[]> {
    await delay(100);
    const all = getStore<LearningOutcome>(KEYS.LOS);
    return all.filter(lo => lessonIds.includes(lo.lesson_id));
  },

  async getQuestions(filters: { subject: string; grade: string; lessonIds: number[]; loIds: number[] }): Promise<Question[]> {
    await delay(200);
    const allQs = getStore<Question>(KEYS.QUESTIONS);
    const allLessons = getStore<Lesson>(KEYS.LESSONS);
    const allLos = getStore<LearningOutcome>(KEYS.LOS);

    return allQs
      .filter(q => q.subject === filters.subject && q.grade === filters.grade)
      .filter(q => filters.lessonIds.length === 0 || filters.lessonIds.includes(q.lesson_id))
      .filter(q => filters.loIds.length === 0 || (q.learning_outcome_id && filters.loIds.includes(q.learning_outcome_id)))
      .map(q => ({
        ...q,
        lesson_title: allLessons.find(l => l.id === q.lesson_id)?.title,
        lo_description: allLos.find(lo => lo.id === q.learning_outcome_id)?.description
      }));
  },

  async createLesson(data: { subject: string, grade: string, title: string }): Promise<Lesson> {
    const all = getStore<Lesson>(KEYS.LESSONS);
    const newLesson = { ...data, id: Date.now() };
    saveStore(KEYS.LESSONS, [...all, newLesson]);
    return newLesson;
  },

  async updateLesson(id: number, updates: Partial<Lesson>): Promise<void> {
    const all = getStore<Lesson>(KEYS.LESSONS);
    saveStore(KEYS.LESSONS, all.map(l => l.id === id ? { ...l, ...updates } : l));
  },

  async deleteLesson(id: number): Promise<void> {
    const all = getStore<Lesson>(KEYS.LESSONS);
    saveStore(KEYS.LESSONS, all.filter(l => l.id !== id));
    const allLos = getStore<LearningOutcome>(KEYS.LOS);
    saveStore(KEYS.LOS, allLos.filter(lo => lo.lesson_id !== id));
    const allQs = getStore<Question>(KEYS.QUESTIONS);
    saveStore(KEYS.QUESTIONS, allQs.filter(q => q.lesson_id !== id));
  },

  async createLearningOutcome(data: { lesson_id: number, description: string }): Promise<LearningOutcome> {
    const all = getStore<LearningOutcome>(KEYS.LOS);
    const newLo = { ...data, id: Date.now() };
    saveStore(KEYS.LOS, [...all, newLo]);
    return newLo;
  },

  async updateLearningOutcome(id: number, updates: Partial<LearningOutcome>): Promise<void> {
    const all = getStore<LearningOutcome>(KEYS.LOS);
    saveStore(KEYS.LOS, all.map(lo => lo.id === id ? { ...lo, ...updates } : lo));
  },

  async deleteLearningOutcome(id: number): Promise<void> {
    const all = getStore<LearningOutcome>(KEYS.LOS);
    saveStore(KEYS.LOS, all.filter(lo => lo.id !== id));
    const allQs = getStore<Question>(KEYS.QUESTIONS);
    saveStore(KEYS.QUESTIONS, allQs.filter(q => q.learning_outcome_id !== id));
  },

  async createQuestion(data: any): Promise<Question> {
    const all = getStore<Question>(KEYS.QUESTIONS);
    const newQ = { ...data, id: data.id || Date.now(), created_at: new Date().toISOString() };
    if (data.id) {
      saveStore(KEYS.QUESTIONS, all.map(q => q.id === data.id ? newQ : q));
    } else {
      saveStore(KEYS.QUESTIONS, [...all, newQ]);
    }
    return newQ;
  },

  async updateQuestion(id: number, updates: Partial<Question>): Promise<void> {
    const all = getStore<Question>(KEYS.QUESTIONS);
    saveStore(KEYS.QUESTIONS, all.map(q => q.id === id ? { ...q, ...updates } : q));
  },

  async deleteQuestion(id: number): Promise<void> {
    const all = getStore<Question>(KEYS.QUESTIONS);
    saveStore(KEYS.QUESTIONS, all.filter(q => q.id !== id));
  }
};