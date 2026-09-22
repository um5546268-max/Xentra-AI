import api from "./api";

export type PracticeTest = {
  id: string;
  title: string;
  subject: string | null;
  duration_minutes: number;
  pass_threshold: number;
  question_count: number;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  passed: boolean | null;
};

export type PracticeQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

export type PracticeTestDetail = PracticeTest & {
  questions: PracticeQuestion[];
};

export type PracticeResult = {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  details: {
    question: string;
    options: string[];
    your_answer: number | null;
    correct_index: number;
    explanation: string;
  }[];
};

export const listPracticeTests = async (): Promise<PracticeTest[]> => {
  const res = await api.get("/api/practice");
  return res.data;
};

export const createPracticeTest = async (data: {
  session_id?: string | null;
  topic?: string | null;
  subject?: string | null;
  num_questions?: number;
  duration_minutes?: number;
  pass_threshold?: number;
}): Promise<PracticeTestDetail> => {
  const res = await api.post("/api/practice", data, { timeout: 180000 });
  return res.data;
};

export const getPracticeTest = async (id: string): Promise<PracticeTestDetail> => {
  const res = await api.get(`/api/practice/${id}`);
  return res.data;
};

export const submitPracticeTest = async (
  id: string,
  answers: number[],
): Promise<PracticeResult> => {
  const res = await api.post(`/api/practice/${id}/submit`, { answers });
  return res.data;
};

export const deletePracticeTest = async (id: string): Promise<void> => {
  await api.delete(`/api/practice/${id}`);
};