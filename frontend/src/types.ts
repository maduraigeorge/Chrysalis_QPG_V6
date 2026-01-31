export interface Question {
  id: number;
  subject: string;
  grade: string;
  lesson_id: number;
  learning_outcome_id: number;
  question_type: string;
  marks: number;
  question_text: string;
  answer_key: string | null;
  image_url: string | null;
  difficulty: number;
  lesson_title?: string;
  lo_description?: string;
}

export interface Lesson {
  id: number;
  subject: string;
  grade: string;
  title: string;
}

export interface LearningOutcome {
  id: number;
  lesson_id: number;
  description: string;
}

export interface Section {
  id: string;
  name: string;
  questionType: string;
  marksPerQuestion: number;
  sectionMarks: number;
  selectedQuestionIds: number[];
}

export interface PaperMetadata {
  title: string;
  subject: string;
  grade: string;
  totalMarks: number;
  duration: string;
  instructions: string;
  schoolName?: string;
  schoolLogo?: string;
}

export enum AppMode {
  SELECTION = 'SELECTION',
  BANK = 'BANK',
  PAPER = 'PAPER',
  ADMIN = 'ADMIN',
  PREVIEW = 'PREVIEW'
}

export enum UserRole {
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}