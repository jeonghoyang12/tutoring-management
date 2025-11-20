export type LayoutType = 'NORMAL' | 'HORIZONTAL' | 'VERTICAL';
export type AssignmentStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE';

export interface Problem {
  id: number;
  image_url: string;
  difficulty: number; // 1-5
  layout_type: LayoutType;
  width: number;
  height: number;
  aspect_ratio: number;
  subject?: string;
  topic?: string;
  answer?: string;
  problem_code?: string;
  textbook?: string;
  chapter?: string;
  subchapter?: string;
  problem_number?: number;
  created_at: string;
}

export interface Student {
  id: number;
  name: string;
  grade?: string;
  enrollment_date: string;
}

export interface Assignment {
  id: number;
  student_id: number;
  scheduled_date: string;
  max_problems_per_day: number;
  status: AssignmentStatus;
}

export interface Worksheet {
  id: number;
  title: string;
  pdf_url: string;
  created_at: string;
}

export interface WrongAnswer {
  id: number;
  student_id: number;
  problem_id: number;
  first_attempt_date: string;
  last_attempt_date: string;
  retry_count: number;
  mastered: boolean;
  consecutive_correct: number;
}

export interface WrongAnswerAttempt {
  id: number;
  wrong_answer_id: number;
  attempt_number: number;
  attempt_date: string;
  next_review_date: string | null;
  result?: string; // 'correct' or 'wrong'
  graded_date?: string;
  created_at: string;
}

export interface ReviewProblem {
  wrong_answer: WrongAnswer;
  problem: Problem;
  latest_attempt: WrongAnswerAttempt;
}
