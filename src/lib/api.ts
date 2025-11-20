import axios from 'axios';
import { Problem, Student, Assignment, Worksheet, WrongAnswer, WrongAnswerAttempt, ReviewProblem } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Problems API
export const problemsApi = {
  upload: async (
    file: File,
    difficulty: number,
    layoutType?: string,
    subject?: string,
    topic?: string,
    answer?: string,
    problemCode?: string,
    textbook?: string,
    chapter?: string,
    subchapter?: string,
    problemNumber?: number
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('difficulty', difficulty.toString());
    if (layoutType) formData.append('layout_type', layoutType);
    if (subject) formData.append('subject', subject);
    if (topic) formData.append('topic', topic);
    if (answer) formData.append('answer', answer);
    if (problemCode) formData.append('problem_code', problemCode);
    if (textbook) formData.append('textbook', textbook);
    if (chapter) formData.append('chapter', chapter);
    if (subchapter) formData.append('subchapter', subchapter);
    if (problemNumber !== undefined) formData.append('problem_number', problemNumber.toString());

    const response = await api.post<Problem>('/api/problems/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAll: async (filters?: { difficulty?: number; layout_type?: string; subject?: string }) => {
    const response = await api.get<Problem[]>('/api/problems/', { params: filters });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Problem>(`/api/problems/${id}`);
    return response.data;
  },

  update: async (id: number, data: Partial<Problem>) => {
    const response = await api.put<Problem>(`/api/problems/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/api/problems/${id}`);
  },

  getByCode: async (code: string) => {
    const response = await api.get<Problem>(`/api/problems/by-code/${code}`);
    return response.data;
  },

  getByCodes: async (codes: string[]) => {
    const response = await api.post<Problem[]>('/api/problems/by-codes', codes);
    return response.data;
  },
};

// Students API
export const studentsApi = {
  create: async (data: { name: string; grade?: string }) => {
    const response = await api.post<Student>('/api/students/', data);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get<Student[]>('/api/students/');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Student>(`/api/students/${id}`);
    return response.data;
  },

  update: async (id: number, data: { name: string; grade?: string }) => {
    const response = await api.put<Student>(`/api/students/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/api/students/${id}`);
  },
};

// Assignments API
export const assignmentsApi = {
  create: async (data: { student_id: number; scheduled_date: string; max_problems_per_day?: number }) => {
    const response = await api.post<Assignment>('/api/assignments/', data);
    return response.data;
  },

  getAll: async (studentId?: number) => {
    const response = await api.get<Assignment[]>('/api/assignments/', {
      params: studentId ? { student_id: studentId } : undefined,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Assignment>(`/api/assignments/${id}`);
    return response.data;
  },

  update: async (id: number, data: Partial<Assignment>) => {
    const response = await api.put<Assignment>(`/api/assignments/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/api/assignments/${id}`);
  },

  addProblems: async (id: number, problemIds: number[]) => {
    const response = await api.post(`/api/assignments/${id}/problems`, { problem_ids: problemIds });
    return response.data;
  },

  getProblems: async (id: number) => {
    const response = await api.get(`/api/assignments/${id}/problems`);
    return response.data;
  },
};

// Worksheets API
export const worksheetsApi = {
  generate: async (data: { title: string; problem_ids: number[] }) => {
    const response = await api.post<{ pdf_url: string; worksheet_id: number }>('/api/worksheets/generate', data);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get<Worksheet[]>('/api/worksheets/');
    return response.data;
  },

  download: async (id: number) => {
    const response = await api.get(`/api/worksheets/${id}/download`);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/api/worksheets/${id}`);
  },
};

// Wrong Answers API
export const wrongAnswersApi = {
  create: async (data: { student_id: number; problem_id: number }) => {
    const response = await api.post<WrongAnswer>('/api/wrong-answers/', data);
    return response.data;
  },

  getByStudent: async (studentId: number, mastered?: boolean) => {
    const response = await api.get<WrongAnswer[]>(`/api/wrong-answers/student/${studentId}`, {
      params: mastered !== undefined ? { mastered } : undefined,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<WrongAnswer>(`/api/wrong-answers/${id}`);
    return response.data;
  },

  getAttempts: async (wrongAnswerId: number) => {
    const response = await api.get<WrongAnswerAttempt[]>(`/api/wrong-answers/${wrongAnswerId}/attempts`);
    return response.data;
  },

  recordReview: async (wrongAnswerId: number, result: 'correct' | 'wrong') => {
    const response = await api.post(`/api/wrong-answers/${wrongAnswerId}/review?result=${result}`);
    return response.data;
  },

  toggleMastered: async (wrongAnswerId: number, mastered: boolean) => {
    const response = await api.put<WrongAnswer>(`/api/wrong-answers/${wrongAnswerId}/master`, null, {
      params: { mastered },
    });
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/api/wrong-answers/${id}`);
  },

  getTodayReview: async (studentId: number) => {
    const response = await api.get<ReviewProblem[]>(`/api/wrong-answers/student/${studentId}/review-today`);
    return response.data;
  },

  bulkCreate: async (studentId: number, problemCodes: string[]) => {
    const response = await api.post('/api/wrong-answers/bulk-create', {
      student_id: studentId,
      problem_codes: problemCodes,
    });
    return response.data;
  },

  bulkGrade: async (wrongAnswerIds: number[], result: 'correct' | 'wrong') => {
    const response = await api.post('/api/wrong-answers/bulk-grade', {
      wrong_answer_ids: wrongAnswerIds,
      result: result,
    });
    return response.data;
  },

  getUngraded: async (studentId: number) => {
    const response = await api.get<ReviewProblem[]>(`/api/wrong-answers/student/${studentId}/ungraded`);
    return response.data;
  },

  bulkReschedule: async (wrongAnswerIds: number[], newDate: string) => {
    const response = await api.post('/api/wrong-answers/bulk-reschedule', {
      wrong_answer_ids: wrongAnswerIds,
      new_date: newDate,
    });
    return response.data;
  },

  textGrade: async (studentId: number, textInput: string) => {
    const response = await api.post('/api/wrong-answers/text-grade', {
      student_id: studentId,
      text_input: textInput,
    });
    return response.data;
  },
};

export default api;
